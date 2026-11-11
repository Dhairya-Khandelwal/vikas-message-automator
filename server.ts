import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from './server/db';
import { baileysAdapter, whatsappAdapter } from './server/baileysAdapter';
import { pacingEngine } from './server/pacingEngine';
import { messageDispatcher } from './server/messageDispatcher';
import { calculateAccountHealth } from './server/health';
import { VerificationStatus } from './src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists early
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * One-time first-run setup token.
 * Printed to the server console on startup when no usable ADMIN exists.
 * Required by POST /api/setup/complete. Invalidates after successful setup.
 */
let SETUP_TOKEN: string | null = null;

function ensureSetupToken(): string | null {
  const members = db.getData().teamMembers || [];
  const hasUsableAdmin = members.some(
    (m: any) => m.role === 'ADMIN' && m.active !== false && m.passwordHash && String(m.passwordHash).length > 20
  );
  if (hasUsableAdmin) {
    SETUP_TOKEN = null;
    return null;
  }
  if (!SETUP_TOKEN) {
    SETUP_TOKEN = crypto.randomBytes(24).toString('hex');
  }
  return SETUP_TOKEN;
}

function consumeSetupToken(token: string | undefined): boolean {
  if (!SETUP_TOKEN || !token) return false;
  // constant-time-ish compare
  const a = Buffer.from(String(token));
  const b = Buffer.from(SETUP_TOKEN);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}


/**
 * Secure session secret management.
 * Generates a cryptographically strong secret on first run and persists it to
 * data/session.secret so restarts keep the same secret (sessions remain valid).
 * Never hard-code a production secret in source.
 */
function getOrCreateSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  const secretFile = path.join(DATA_DIR, 'session.secret');
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
  } catch {
    // fall through to generate
  }
  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    console.log('[Security] Generated and saved new SESSION_SECRET to data/session.secret');
  } catch (err) {
    console.warn('[Security] Could not persist session secret to disk; using in-memory secret for this run only.', err);
  }
  return generated;
}

/**
 * Simple file-based session store for persistence across restarts.
 * Zero external dependencies. Suitable for single-instance local deployment.
 */
class FileSessionStore extends session.Store {
  private dir: string;
  constructor(options: { dir?: string } = {}) {
    super();
    this.dir = options.dir || path.join(DATA_DIR, 'sessions');
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }
  private filePath(sid: string) {
    // Sanitize sid to prevent path traversal
    const safe = sid.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.dir, `${safe}.json`);
  }
  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void) {
    try {
      const fp = this.filePath(sid);
      if (!fs.existsSync(fp)) return callback(null, null);
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      // Expire check
      if (data.cookie?.expires && new Date(data.cookie.expires) < new Date()) {
        fs.unlinkSync(fp);
        return callback(null, null);
      }
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  }
  set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    try {
      const fp = this.filePath(sid);
      fs.writeFileSync(fp, JSON.stringify(sessionData), { mode: 0o600 });
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }
  destroy(sid: string, callback?: (err?: any) => void) {
    try {
      const fp = this.filePath(sid);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }
  // Optional: touch / length / clear can be added if needed
}

// TypeScript declaration for session data
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    csrfToken?: string;
  }
}

// Zod schemas for input validation
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

const contactInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(8, 'Valid phone number is required').max(25),
  businessName: z.string().optional().default(''),
  city: z.string().optional().default('Satna'),
  category: z.string().optional().default('Other'),
  productInterest: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  consentStatus: z.enum(['OPTED_IN', 'OPTED_OUT', 'NOT_GIVEN', 'PENDING', 'EXPIRED', 'BLOCKED']).optional().default('NOT_GIVEN'),
  consentEvidence: z.string().optional().default(''),
  consentSource: z.string().optional().default('Manual Entry'),
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  // Security: default to localhost only. Never bind to 0.0.0.0 unless explicitly requested.
  const BIND_HOST = process.env.BIND_HOST || process.env.HOST || '127.0.0.1';

  // Only trust proxy headers when explicitly configured (e.g. behind a reverse proxy).
  // Unconditional trust enables IP spoofing attacks.
  if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', false);
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const sessionSecret = getOrCreateSessionSecret();
  const sessionStore = new FileSessionStore();

  // Session configuration with secure HTTP-only cookies, persistent store, and expiration
  app.use(
    session({
      name: 'vikas.sid',
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.FORCE_SECURE_COOKIE === '1',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8-hour session expiration
      },
    })
  );

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please slow down.' },
  });
  app.use('/api/', apiLimiter);

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  });

  const publicConsentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many consent form submissions. Please wait before trying again.' },
  });

  // CSRF Protection Middleware
  function verifyCsrf(req: Request, res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    // Exempt public or initial auth endpoints
    const fullPath = (req.originalUrl || req.path).split('?')[0];
    if (
      fullPath === '/api/auth/login' ||
      fullPath === '/api/consent/register' ||
      fullPath === '/api/consent/opt-out' ||
      req.path === '/auth/login' ||
      req.path === '/consent/register' ||
      req.path === '/consent/opt-out'
    ) {
      return next();
    }
    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromBody = req.body?._csrf;
    const clientToken = tokenFromHeader || tokenFromBody;

    if (!req.session?.csrfToken || !clientToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing CSRF token',
      });
    }
    {
      const a = Buffer.from(String(clientToken));
      const b = Buffer.from(String(req.session.csrfToken));
      let csrfOk = a.length === b.length;
      if (csrfOk) {
        try {
          csrfOk = crypto.timingSafeEqual(a, b);
        } catch {
          csrfOk = false;
        }
      }
      if (!csrfOk) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or missing CSRF token',
        });
      }
    }
    next();
  }

  // Authentication Middleware
  // Acceptance test: Opening an administrative API without logging in must return HTTP 401.
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    next();
  }

  // Server-side RBAC Middleware
  function requireRole(allowedRoles: ('ADMIN' | 'MANAGER' | 'EMPLOYEE')[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.session?.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${userRole || 'NONE'}`,
        });
      }
      next();
    };
  }

  // Apply CSRF verification on mutating API calls
  app.use('/api/', verifyCsrf);

  // Helper to get active session actor
  function getActor(req: Request) {
    return {
      userId: req.session?.userId || 'anonymous',
      userName: req.session?.userName || 'Anonymous User',
      role: (req.session?.role || 'EMPLOYEE') as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
    };
  }

  // ==========================================
  // AUTHENTICATION & SESSION ENDPOINTS
  // ==========================================

  // CSRF token retrieval endpoint
  app.get('/api/auth/csrf', (req: Request, res: Response) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }
    res.json({ success: true, csrfToken: req.session.csrfToken });
  });

  // Current session info
  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (!req.session?.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }

    if (req.session?.userId) {
      const user = db.findUserById(req.session.userId);
      res.json({
        success: true,
        authenticated: true,
        data: {
          userId: req.session.userId,
          userName: req.session.userName,
          role: req.session.role,
          email: user?.email,
          phone: user?.phone,
          avatarColor: user?.avatarColor || 'bg-blue-600',
          csrfToken: req.session.csrfToken,
        },
      });
    } else {
      res.json({
        success: true,
        authenticated: false,
        csrfToken: req.session.csrfToken,
      });
    }
  });

  // Login endpoint with rate limiter and Zod validation
  app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues?.[0]?.message || 'Invalid input credentials',
      });
    }

    const { username, password } = parseResult.data;
    const user = db.findUserByUsername(username);

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // Session fixation protection: regenerate session ID after successful authentication
    const oldSession = req.session;
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regenerate failed:', regenErr);
        return res.status(500).json({ success: false, error: 'Could not establish secure session' });
      }

      req.session.userId = user.id;
      req.session.userName = user.name;
      req.session.role = user.role;
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');

      db.addAuditLog(user.name, user.role, 'USER_LOGIN', `User ${user.name} logged in successfully.`);

      res.json({
        success: true,
        data: {
          userId: user.id,
          userName: user.name,
          role: user.role,
          email: user.email,
          phone: user.phone,
          avatarColor: user.avatarColor,
          csrfToken: req.session.csrfToken,
        },
      });
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
    const actor = getActor(req);
    db.addAuditLog(actor.userName, actor.role, 'USER_LOGOUT', `User ${actor.userName} logged out.`);

    req.session.destroy((err) => {
      res.clearCookie('vikas.sid');
      if (err) {
        return res.status(500).json({ success: false, error: 'Could not log out' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // ==========================================
  // FIRST-RUN SETUP (no default passwords)
  // ==========================================
  app.get('/api/setup/status', (req: Request, res: Response) => {
    const members = db.getTeamMembers ? db.getTeamMembers() : (db.getData().teamMembers || []);
    const hasUsableAdmin = members.some(
      (m: any) => m.role === 'ADMIN' && m.active !== false && m.passwordHash && m.passwordHash.length > 20
    );
    res.json({
      success: true,
      data: {
        setupRequired: !hasUsableAdmin,
        message: hasUsableAdmin
          ? 'Administrator account is configured.'
          : 'First-run setup required. Create the Owner account before using the application.',
      },
    });
  });

  app.post('/api/setup/complete', (req: Request, res: Response) => {
    const members = db.getTeamMembers ? db.getTeamMembers() : (db.getData().teamMembers || []);
    const hasUsableAdmin = members.some(
      (m: any) => m.role === 'ADMIN' && m.active !== false && m.passwordHash && m.passwordHash.length > 20
    );
    if (hasUsableAdmin) {
      SETUP_TOKEN = null;
      return res.status(403).json({
        success: false,
        error: 'Setup has already been completed. Use the normal login.',
      });
    }

    const { name, email, phone, password, setupToken } = req.body || {};
    if (!consumeSetupToken(setupToken)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing setup token. Check the server console for the one-time SETUP TOKEN printed at startup.',
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required to create the Owner account.',
      });
    }
    if (typeof password !== 'string' || password.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 10 characters long.',
      });
    }
    // Email must look like an email
    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const owner = {
      id: 'u-owner',
      name: String(name).trim(),
      email: emailNorm,
      role: 'ADMIN' as const,
      phone: phone ? String(phone).trim() : '',
      avatarColor: 'bg-blue-600',
      active: true,
      passwordHash,
    };

    // Replace seed placeholder with the real owner
    const data = db.getData();
    data.teamMembers = [owner as any];
    db.saveDatabase(data);

    // Invalidate setup token after successful use
    SETUP_TOKEN = null;

    db.addAuditLog(owner.name, 'ADMIN', 'FIRST_RUN_SETUP', `Owner account created for ${owner.email}. Setup token consumed.`);

    res.json({
      success: true,
      message: 'Owner account created successfully. You can now log in with your email.',
      data: { email: owner.email, name: owner.name },
    });
  });

  // ==========================================
  // PROTECTED ADMINISTRATIVE ENDPOINTS
  // ==========================================

  // 1. SYSTEM STATUS
  app.get('/api/status', requireAuth, (req: Request, res: Response) => {
    const queue = db.getQueue();
    const pendingQueueCount = queue.filter((q) => q.status === 'PENDING' || q.status === 'SCHEDULED').length;
    const conn = db.getConnectionInfo();
    const pacing = db.getPacingConfig();

    res.json({
      success: true,
      data: {
        business: db.getData().settings,
        connection: conn,
        pacing: pacing,
        pendingQueueCount,
        totalContacts: db.getContacts().length,
        currentUser: getActor(req),
      },
    });
  });

  // 2. WHATSAPP CONNECTION (Baileys WebSocket Adapter)
  app.get('/api/whatsapp/status', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: baileysAdapter.getStatus() });
  });

  app.post('/api/whatsapp/connect', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
    try {
      const state = await baileysAdapter.initSocket();
      res.json({ success: true, data: state });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to initialize WhatsApp socket' });
    }
  });

  app.post('/api/whatsapp/disconnect', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
    try {
      const state = await baileysAdapter.disconnect();
      res.json({ success: true, data: state });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to disconnect WhatsApp' });
    }
  });

  // Environment management (DEMO vs LIVE)
  app.get('/api/environment', requireAuth, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        environment: db.getEnvironment(),
        isDemoMode: db.getEnvironment() === 'DEMO',
      },
    });
  });

  app.post('/api/environment', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { environment, confirmLive } = req.body || {};
    if (environment !== 'DEMO' && environment !== 'LIVE') {
      return res.status(400).json({ success: false, error: 'Environment must be either "DEMO" or "LIVE"' });
    }
    const actor = getActor(req);

    if (environment === 'LIVE') {
      // LIVE requires explicit confirmation and a connected WhatsApp session
      if (confirmLive !== true) {
        return res.status(400).json({
          success: false,
          error: 'LIVE activation requires confirmLive: true. DEMO remains the safe default.',
        });
      }
      const conn = baileysAdapter.getStatus ? baileysAdapter.getStatus() : db.getConnectionInfo();
      const connected = Boolean(conn && (conn.connected || conn.status === 'CONNECTED' || conn.isConnected));
      if (!connected) {
        return res.status(400).json({
          success: false,
          error: 'Cannot activate LIVE: WhatsApp is not connected. Pair a device via QR first.',
        });
      }
    }

    db.setEnvironment(environment);
    db.addAuditLog(
      actor.userName,
      actor.role,
      'ENVIRONMENT_SWITCHED',
      `Switched environment to ${environment}. ${
        environment === 'LIVE'
          ? 'LIVE mode: real WhatsApp transport enabled. Promotional sends still require verified consent.'
          : 'DEMO mode active: all sends are simulated; real Baileys transport is not used.'
      }`
    );
    res.json({
      success: true,
      data: {
        environment: db.getEnvironment(),
        isDemoMode: db.getEnvironment() === 'DEMO',
      },
    });
  });

  // Simulate incoming WhatsApp message from a customer
  app.post('/api/whatsapp/test-incoming', requireAuth, (req: Request, res: Response) => {
    if (db.getEnvironment() === 'LIVE') {
      return res.status(403).json({
        success: false,
        error: 'Simulated incoming messages are strictly prohibited in LIVE mode. Only actual WhatsApp events are processed.',
      });
    }
    const { phone, text, name } = req.body;
    if (!phone || !text) {
      return res.status(400).json({ success: false, error: 'Phone and text are required' });
    }
    const result = pacingEngine.handleIncomingMessage(phone, text, name);
    res.json({ success: true, data: result });
  });

  // 3. CONTACTS CRUD
  app.get('/api/contacts', requireAuth, (req: Request, res: Response) => {
    const { search, category, consentStatus, city } = req.query;
    let contacts = db.getContacts();

    if (search) {
      const q = String(search).toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.businessName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.productInterest.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'All') {
      contacts = contacts.filter((c) => c.category === category);
    }

    if (consentStatus && consentStatus !== 'All') {
      contacts = contacts.filter((c) => c.consentStatus === consentStatus);
    }

    if (city && city !== 'All') {
      contacts = contacts.filter((c) => c.city.toLowerCase() === String(city).toLowerCase());
    }

    res.json({ success: true, data: contacts });
  });

  app.post('/api/contacts', requireAuth, (req: Request, res: Response) => {
    const parseResult = contactInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues?.[0]?.message || 'Invalid contact fields',
      });
    }

    const {
      name,
      phone,
      businessName,
      city,
      category,
      productInterest,
      notes,
      tags,
      consentStatus,
      consentEvidence,
      consentSource,
    } = parseResult.data;

    // Duplicate check on phone
    const existing = db.getContactByPhone(phone);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A contact with this phone number already exists', existingContact: existing });
    }

    const actor = getActor(req);

    // VMA-02: Mass-assignment protection. Client cannot set OPTED_IN or VERIFIED on create.
    // Employees cannot create contacts as OPTED_IN. Only ADMIN/MANAGER can set verified consent
    // and only when all mandatory evidence fields are supplied.
    const actorRole = actor.role;
    let finalConsent: 'NOT_GIVEN' | 'PENDING' | 'OPTED_IN' | 'OPTED_OUT' = 'NOT_GIVEN';
    let finalVerification: 'UNVERIFIED' | 'VERIFIED' = 'UNVERIFIED';
    let finalEvidence = consentEvidence || '';
    let finalSource = consentSource || 'Manual Entry';
    let finalConsentDate: string | undefined;

    if (consentStatus === 'OPTED_IN') {
      if (actorRole === 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          error: 'Employees cannot set promotional consent to OPTED_IN. Administrator or Manager verification required.',
        });
      }
      // ADMIN/MANAGER must supply evidence
      if (!consentEvidence || String(consentEvidence).trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Verified consent requires consentEvidence (min 5 characters). Contact left as NOT_GIVEN.',
        });
      }
      finalConsent = 'OPTED_IN';
      finalVerification = 'VERIFIED';
      finalEvidence = String(consentEvidence).trim();
      finalSource = consentSource || `Verified by ${actor.userName}`;
      finalConsentDate = new Date().toISOString();
    } else if (consentStatus === 'PENDING') {
      finalConsent = 'PENDING';
    }

    const created = db.createContact({
      name,
      phone,
      businessName: businessName || '',
      city: city || 'Satna',
      category: (category || 'Other') as any,
      productInterest: productInterest || '',
      notes: notes || '',
      tags: tags || [],
      consentStatus: finalConsent,
      consentEvidence: finalEvidence,
      consentSource: finalSource,
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      consentDate: finalConsentDate,
      verificationStatus: finalVerification,
      verifiedBy: finalVerification === 'VERIFIED' ? actor.userName : undefined,
      verifiedAt: finalConsentDate,
      evidenceReference: finalVerification === 'VERIFIED' ? finalEvidence : undefined,
      permissionCategories: finalVerification === 'VERIFIED' ? ['Promotional Offers'] : [],
    } as any);

    db.addAuditLog(actor.userName, actor.role, 'CREATE_CONTACT', `Added contact ${name} (${phone}) with consent: ${created.consentStatus}`);
    res.json({ success: true, data: created });
  });

  app.put('/api/contacts/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const raw = req.body || {};
    const actor = getActor(req);

    // VMA-02: Protect consent fields against mass assignment
    const safeUpdates: any = { ...raw };
    // Always strip privileged fields from client payload; re-apply only after RBAC checks
    delete safeUpdates.verificationStatus;
    delete safeUpdates.verifiedBy;
    delete safeUpdates.verifiedAt;
    delete safeUpdates.passwordHash;
    delete safeUpdates.id;

    if (safeUpdates.consentStatus === 'OPTED_IN') {
      if (actor.role === 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          error: 'Employees cannot verify promotional consent. Administrator or Manager approval required.',
        });
      }
      const evidence = String(safeUpdates.consentEvidence || '').trim();
      if (evidence.length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Consent verification requires consentEvidence (min 5 characters) recording how consent was obtained.',
        });
      }
      safeUpdates.verificationStatus = 'VERIFIED';
      safeUpdates.verifiedBy = actor.userName;
      safeUpdates.verifiedAt = new Date().toISOString();
      safeUpdates.consentDate = safeUpdates.consentDate || new Date().toISOString();
      safeUpdates.consentSource = safeUpdates.consentSource || `Verified by ${actor.userName}`;
      safeUpdates.consentEvidence = evidence;
      if (!safeUpdates.consentWordingVersion) {
        safeUpdates.consentWordingVersion = 'v1.2 - 2026 Statutory Compliance';
      }
      if (!Array.isArray(safeUpdates.permissionCategories) || safeUpdates.permissionCategories.length === 0) {
        safeUpdates.permissionCategories = ['Promotional Offers'];
      }
      safeUpdates.evidenceReference = safeUpdates.evidenceReference || evidence;
    }

    // If phone is being changed, only ADMIN/MANAGER may do so
    if (safeUpdates.phone !== undefined && actor.role === 'EMPLOYEE') {
      return res.status(403).json({
        success: false,
        error: 'Employees cannot change contact phone numbers (consent integrity).',
      });
    }

    const existing = db.getContactById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const updated = db.updateContact(id, safeUpdates);
    if (!updated) {
      // updateContact returns null on not-found OR phone duplicate after change
      return res.status(409).json({
        success: false,
        error: 'Update failed. Contact not found or phone number already belongs to another contact. Phone changes also reset promotional consent.',
      });
    }

    const phoneChanged =
      safeUpdates.phone &&
      String(safeUpdates.phone).replace(/\D/g, '').slice(-10) !==
        String(existing.phone).replace(/\D/g, '').slice(-10);

    db.addAuditLog(
      actor.userName,
      actor.role,
      phoneChanged
        ? 'CONTACT_PHONE_CHANGED'
        : safeUpdates.consentStatus === 'OPTED_IN'
          ? 'CONSENT_VERIFIED'
          : 'UPDATE_CONTACT',
      phoneChanged
        ? `Phone changed for ${updated.name} (${id}); promotional consent reset to NOT_GIVEN.`
        : `Updated contact ${updated.name} (${id})${safeUpdates.consentStatus === 'OPTED_IN' ? ' — promotional consent verified' : ''}`
    );
    res.json({ success: true, data: updated });
  });

  app.delete('/api/contacts/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const actor = getActor(req);

    const success = db.deleteContact(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    db.addAuditLog(actor.userName, actor.role, 'DELETE_CONTACT', `Deleted contact ${id}`);
    res.json({ success: true });
  });

  // Bulk import with MANDATORY NOT_GIVEN consent rule
  app.post('/api/contacts/import', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { contacts: importedList } = req.body;
    if (!Array.isArray(importedList) || importedList.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid array of contacts required' });
    }

    const actor = getActor(req);
    let addedCount = 0;
    let duplicateCount = 0;

    for (const item of importedList) {
      if (!item.name || !item.phone) continue;
      const existing = db.getContactByPhone(item.phone);
      if (existing) {
        duplicateCount++;
        continue;
      }

      // STRICT REQUIREMENT 6: Strict statutory consent verification
      // A customer record should NOT become eligible merely because someone typed a sentence into the evidence field.
      // Each opted-in contact must satisfy all 7 mandatory requirements:
      // 1. Consent status: OPTED_IN
      // 2. Consent source: Mandatory valid source
      // 3. Consent date: Mandatory valid date
      // 4. Evidence reference: Mandatory verifiable reference
      // 5. Consent wording/version: Mandatory versioned text reference
      // 6. Permission category: Mandatory at least one promotional category
      // 7. Verification status: Explicitly 'VERIFIED'
      const evidenceRef = (item.evidenceReference || item.consentEvidence || '').trim();
      const hasSource = Boolean(item.consentSource && item.consentSource.trim());
      const hasDate = Boolean(item.consentDate && !isNaN(new Date(item.consentDate).getTime()));
      const hasWording = Boolean(item.consentWordingVersion && item.consentWordingVersion.trim());
      const perms = Array.isArray(item.permissionCategories) && item.permissionCategories.length > 0 ? item.permissionCategories : [];
      const isExplicitlyVerified = item.verificationStatus === 'VERIFIED';

      const isStrictlyVerified =
        item.consentStatus === 'OPTED_IN' &&
        hasSource &&
        hasDate &&
        evidenceRef.length >= 5 &&
        hasWording &&
        perms.length > 0 &&
        isExplicitlyVerified;

      const assignedConsent = isStrictlyVerified ? 'OPTED_IN' : 'NOT_GIVEN';
      const assignedVerification: VerificationStatus = isStrictlyVerified ? 'VERIFIED' : 'UNVERIFIED';

      db.createContact({
        name: item.name,
        phone: item.phone,
        businessName: item.businessName || '',
        city: item.city || 'Satna',
        category: item.category || 'Retailers',
        productInterest: item.productInterest || 'HP Lubricants',
        notes: item.notes || 'Imported via bulk CSV/Excel',
        tags: item.tags || ['Imported'],
        consentStatus: assignedConsent,
        consentSource: isStrictlyVerified ? item.consentSource : 'Bulk Import (Unverified)',
        consentEvidence: isStrictlyVerified ? evidenceRef : 'Unverified import. A customer record cannot become eligible merely by typing text.',
        evidenceReference: isStrictlyVerified ? evidenceRef : undefined,
        consentWordingVersion: item.consentWordingVersion || 'v1.2 - 2026 Statutory Compliance',
        permissionCategories: perms.length > 0 ? perms : ['Promotional Offers'],
        verificationStatus: assignedVerification,
        consentDate: isStrictlyVerified ? item.consentDate : undefined,
      });
      addedCount++;
    }

    db.addAuditLog(
      actor.userName,
      actor.role,
      'BULK_IMPORT_CONTACTS',
      `Imported ${addedCount} contacts (${duplicateCount} duplicates skipped). Strict statutory consent enforcement applied.`
    );

    res.json({
      success: true,
      data: {
        addedCount,
        duplicateCount,
        note: 'Imported contacts strictly validated. Only contacts with all 7 statutory fields and VERIFIED status granted OPTED_IN.',
      },
    });
  });

  // 4. CONTACT GROUPS
  app.get('/api/groups', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getGroups() });
  });

  app.post('/api/groups', requireAuth, (req: Request, res: Response) => {
    const { name, description, contactIds } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Group name required' });
    const created = db.createGroup(name, description || '', contactIds || []);
    res.json({ success: true, data: created });
  });

  app.put('/api/groups/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = db.updateGroup(id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Group not found' });
    res.json({ success: true, data: updated });
  });

  app.delete('/api/groups/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = db.deleteGroup(id);
    res.json({ success: deleted });
  });

  // 5. CONSENT MANAGER
  app.get('/api/consent', requireAuth, (req: Request, res: Response) => {
    const contacts = db.getContacts();
    const records = db.getConsentRecords();

    const stats = {
      total: contacts.length,
      optedIn: contacts.filter((c) => c.consentStatus === 'OPTED_IN').length,
      pending: contacts.filter((c) => c.consentStatus === 'PENDING').length,
      notGiven: contacts.filter((c) => c.consentStatus === 'NOT_GIVEN').length,
      optedOut: contacts.filter((c) => c.consentStatus === 'OPTED_OUT').length,
      expired: contacts.filter((c) => c.consentStatus === 'EXPIRED').length,
      blocked: contacts.filter((c) => c.consentStatus === 'BLOCKED').length,
    };

    res.json({
      success: true,
      data: {
        stats,
        records,
        standardWording: 'I agree to receive promotional updates, product availability information, offers and business communications from Vikas Automobiles through WhatsApp. I understand that I can withdraw my consent at any time.',
      },
    });
  });

  // Public/Counter consent registration form endpoint
  // SECURITY: A public checkbox alone must NEVER silently change an existing contact to OPTED_IN.
  // New contacts are created as PENDING and require admin verification.
  // Existing contacts that already have consent are left unchanged; a request is logged for review.
  app.post('/api/consent/register', publicConsentLimiter, (req: Request, res: Response) => {
    const { name, phone, businessName, city, category, checkboxChecked, source, evidence } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ success: false, error: 'Name and phone number are required.' });
    }

    if (!checkboxChecked) {
      return res.status(400).json({
        success: false,
        error: 'Explicit agreement required: Opening a form does NOT grant consent. The checkbox must be actively checked.',
      });
    }

    const existing = db.getContactByPhone(phone);
    const now = new Date().toISOString();
    const evidenceText = evidence || `Digital submission via local form from IP ${req.ip || 'unknown'} at ${now}`;

    if (existing) {
      // Do NOT silently upgrade consent. Log a pending request for admin review.
      db.addAuditLog(
        'CONSENT_PORTAL',
        'ADMIN',
        'CONSENT_REQUEST_RECEIVED',
        `Public form submitted for existing contact ${name} (${phone}). Status left as ${existing.consentStatus}. Admin verification required.`
      );

      // Optionally mark as PENDING only if they had no consent yet
      if (existing.consentStatus === 'NOT_GIVEN' || existing.consentStatus === 'PENDING') {
        db.updateContact(existing.id, {
          consentStatus: 'PENDING',
          consentSource: source || 'Customer Registration Web/Counter Form',
          consentEvidence: evidenceText,
          consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
        });
      }

      return res.json({
        success: true,
        message: 'Your request has been received. An administrator will verify and activate promotional consent. Existing consent status was not changed by this public form.',
        contact: db.getContactById(existing.id),
        requiresAdminVerification: true,
      });
    }

    // New contact: create as PENDING — admin must verify before promotional sends
    const contact = db.createContact({
      name,
      phone,
      businessName: businessName || '',
      city: city || 'Satna',
      category: category || 'Retailers',
      productInterest: 'HP Lubricants',
      notes: 'Consent request via public form — pending admin verification',
      tags: ['Pending Consent'],
      consentStatus: 'PENDING',
      consentDate: now,
      consentSource: source || 'Customer Registration Web/Counter Form',
      consentEvidence: evidenceText,
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
    });

    db.addAuditLog(
      'CONSENT_PORTAL',
      'ADMIN',
      'CONSENT_REQUEST_RECEIVED',
      `New contact ${name} (${phone}) created with PENDING consent via public form. Admin verification required before promotional messages.`
    );

    res.json({
      success: true,
      message: 'Consent request recorded. An administrator must verify this contact before promotional messages can be sent.',
      contact,
      requiresAdminVerification: true,
    });
  });

  // VMA-03: Public opt-out is restricted.
  // Unauthenticated callers may only request opt-out for a number that already exists
  // AND must supply a matching last-4 digits confirmation (simple verifiable workflow).
  // Authenticated ADMIN/MANAGER may opt-out any number without the confirmation.
  // Inbound STOP/UNSUBSCRIBE from WhatsApp remains the primary customer-initiated path
  // and is handled in the message processor (not this endpoint).
  app.post('/api/consent/opt-out', (req: Request, res: Response) => {
    const { phone, source, confirmLast4 } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });

    const isAuthenticated = Boolean(req.session?.userId);
    const role = req.session?.role;
    const isStaff = isAuthenticated && (role === 'ADMIN' || role === 'MANAGER');

    const existing = db.getContactByPhone(phone);
    if (!existing && !isStaff) {
      // Do not reveal whether the number exists; avoid enumeration + abuse
      return res.json({
        success: true,
        message: 'If this number is registered, an opt-out request has been recorded for review.',
      });
    }

    if (!isStaff) {
      const digits = String(phone).replace(/\D/g, '');
      const last4 = digits.slice(-4);
      if (!confirmLast4 || String(confirmLast4) !== last4) {
        return res.status(400).json({
          success: false,
          error: 'Verification failed. Provide confirmLast4 matching the last 4 digits of the phone number.',
        });
      }
    }

    db.handleCustomerOptOut(phone, source || (isStaff ? 'Administrative Opt-Out' : 'Customer Self-Service Opt-Out'));
    res.json({ success: true, message: 'Contact opted out and added to suppression list. Pending promotional messages cancelled.' });
  });

  // Query immutable consent audit history (Requirement 6)
  app.get('/api/consent/events', requireAuth, (req: Request, res: Response) => {
    const { contactId, phone } = req.query;
    const events = db.getConsentEvents(contactId ? String(contactId) : undefined, phone ? String(phone) : undefined);
    res.json({ success: true, data: events });
  });

  // 6. MESSAGES & INBOX
  app.get('/api/conversations', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getConversations() });
  });

  app.get('/api/messages', requireAuth, (req: Request, res: Response) => {
    const { conversationId, search, direction, status } = req.query;
    let list = db.getMessages(conversationId ? String(conversationId) : undefined);

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter((m) => m.content.toLowerCase().includes(q) || m.customerName.toLowerCase().includes(q) || m.phone.includes(q));
    }
    if (direction) {
      list = list.filter((m) => m.direction === direction);
    }
    if (status) {
      list = list.filter((m) => m.status === status);
    }

    res.json({ success: true, data: list });
  });

  app.post('/api/messages/send', requireAuth, async (req: Request, res: Response) => {
    const { contactId, phone, content, category: clientCategory, type } = req.body || {};
    if (!content || (!contactId && !phone)) {
      return res.status(400).json({ success: false, error: 'Recipient and content are required' });
    }

    const contact = contactId ? db.getContactById(contactId) : db.getContactByPhone(phone);
    const recipientPhone = contact?.phone || phone;
    if (!recipientPhone) {
      return res.status(400).json({ success: false, error: 'Valid recipient phone is required' });
    }

    // Server-side category derivation — never trust client alone for promotional eligibility.
    // "support" is only allowed when there is a recent inbound conversation (last 24h).
    // Everything else is treated as promotional and must pass full consent checks via the paced path,
    // OR as transactional when an explicit transactionReference is supplied.
    const requested = (clientCategory || 'support') as string;
    let effectiveCategory: 'support' | 'promotional' | 'transactional' | 'auto_reply' = 'support';

    const hasRecentInbound = (() => {
      if (!contact) return false;
      const convs = db.getConversations().filter((c: any) => c.contactId === contact.id || c.phone === recipientPhone);
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const conv of convs) {
        const msgs = (db.getData().messages || []).filter(
          (m: any) => m.conversationId === conv.id && m.direction === 'inbound'
        );
        if (msgs.some((m: any) => new Date(m.timestamp).getTime() >= cutoff)) return true;
      }
      // Also check messages directly by phone
      const recent = (db.getData().messages || []).filter(
        (m: any) =>
          m.direction === 'inbound' &&
          (m.phone === recipientPhone || (contact && m.contactId === contact.id)) &&
          new Date(m.timestamp).getTime() >= cutoff
      );
      return recent.length > 0;
    })();

    if (requested === 'transactional' && req.body.transactionReference) {
      effectiveCategory = 'transactional';
    } else if (requested === 'support' && hasRecentInbound) {
      effectiveCategory = 'support';
    } else if (requested === 'support' && !hasRecentInbound) {
      // Cold outreach cannot use support path — force promotional rules
      effectiveCategory = 'promotional';
    } else if (requested === 'promotional') {
      effectiveCategory = 'promotional';
    } else {
      effectiveCategory = 'promotional';
    }

    // Promotional (including reclassified cold "support") must go through paced queue validation,
    // not unrestricted direct send. Direct send still runs dispatcher validation.
    if (effectiveCategory === 'promotional') {
      const actor = getActor(req);
      // Only ADMIN/MANAGER may initiate promotional cold sends; employees cannot
      if (actor.role === 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          error: 'Employees cannot send promotional or cold outreach messages. Use the campaign flow with verified consent contacts.',
        });
      }
    }

    const result = await messageDispatcher.dispatchDirectMessage({
      phone: recipientPhone,
      contactId: contact?.id || contactId,
      content,
      category: effectiveCategory,
      type: type || 'text',
      transactionReference: req.body.transactionReference,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        data: result.message,
      });
    }

    res.json({
      success: true,
      data: result.message,
      meta: { effectiveCategory, hasRecentInbound },
    });
  });

  app.post('/api/conversations/:id/resolve', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolved } = req.body;
    db.resolveConversation(id, resolved !== false);
    res.json({ success: true });
  });

  app.post('/api/conversations/:id/assign', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const conv = db.getConversations().find((c) => c.id === id);
    if (conv) {
      conv.assignedTo = assignedTo;
      db.saveDatabase();
    }
    res.json({ success: true });
  });

  // 7. TEMPLATES
  app.get('/api/templates', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getTemplates() });
  });

  app.post('/api/templates', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { name, category, body, variables } = req.body;
    if (!name || !body) return res.status(400).json({ success: false, error: 'Name and body required' });
    const saved = db.saveTemplate({ name, category: category || 'General', body, variables: variables || [] });
    res.json({ success: true, data: saved });
  });

  app.delete('/api/templates/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    data.templates = data.templates.filter((t) => t.id !== id);
    db.saveDatabase();
    res.json({ success: true });
  });

  // 8. CAMPAIGNS & SAFETY CHECK
  app.get('/api/campaigns', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getCampaigns() });
  });

  app.post('/api/campaigns/safety-check', requireAuth, (req: Request, res: Response) => {
    const { targetGroupIds, targetContactIds } = req.body;

    let targetIds = new Set<string>();
    if (Array.isArray(targetContactIds)) {
      targetContactIds.forEach((id) => targetIds.add(id));
    }
    if (Array.isArray(targetGroupIds)) {
      targetGroupIds.forEach((gid) => {
        const group = db.getGroups().find((g) => g.id === gid);
        if (group) {
          group.contactIds.forEach((cid) => targetIds.add(cid));
        }
      });
    }

    const allContacts = db.getContacts();
    const targeted = allContacts.filter((c) => targetIds.has(c.id));

    const totalSelected = targeted.length;
    const validOptedIn = targeted.filter((c) => c.consentStatus === 'OPTED_IN');
    const pendingConsent = targeted.filter((c) => c.consentStatus === 'PENDING');
    const notGiven = targeted.filter((c) => c.consentStatus === 'NOT_GIVEN');
    const optedOut = targeted.filter((c) => c.consentStatus === 'OPTED_OUT');
    const blockedOrExpired = targeted.filter((c) => c.consentStatus === 'BLOCKED' || c.consentStatus === 'EXPIRED');

    const invalidNumbers = targeted.filter((c) => !c.phone || c.phone.replace(/[\s\-\(\)\+]/g, '').length < 10);

    res.json({
      success: true,
      data: {
        totalSelected,
        eligibleOptedInCount: validOptedIn.length,
        eligibleContacts: validOptedIn.map((c) => ({ id: c.id, name: c.name, phone: c.phone, city: c.city })),
        pendingConsentCount: pendingConsent.length,
        notGivenCount: notGiven.length,
        optedOutCount: optedOut.length,
        blockedOrExpiredCount: blockedOrExpired.length,
        invalidNumberCount: invalidNumbers.length,
        safeToSend: validOptedIn.length > 0,
        policyNotice: 'Promotional WhatsApp campaigns strictly require verified OPTED_IN consent. Non-consented contacts are automatically filtered and blocked from the queue.',
      },
    });
  });

  app.post('/api/campaigns/create', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { name, targetGroupIds, targetContactIds, templateId, customMessage, launchNow } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Campaign name required' });

    let targetIds = new Set<string>();
    if (Array.isArray(targetContactIds)) {
      targetContactIds.forEach((id) => targetIds.add(id));
    }
    if (Array.isArray(targetGroupIds)) {
      targetGroupIds.forEach((gid) => {
        const group = db.getGroups().find((g) => g.id === gid);
        if (group) group.contactIds.forEach((cid) => targetIds.add(cid));
      });
    }

    const allContacts = db.getContacts();
    const targeted = allContacts.filter((c) => targetIds.has(c.id));

    const eligibleOptedIn = targeted.filter((c) => c.consentStatus === 'OPTED_IN');
    const pending = targeted.filter((c) => c.consentStatus === 'PENDING');
    const optedOut = targeted.filter((c) => c.consentStatus === 'OPTED_OUT');
    const notGiven = targeted.filter((c) => c.consentStatus === 'NOT_GIVEN' || c.consentStatus === 'BLOCKED' || c.consentStatus === 'EXPIRED');

    const template = templateId ? db.getTemplates().find((t) => t.id === templateId) : null;
    const baseMessage = template ? template.body : customMessage || '';

    const newCampaign = db.createCampaign({
      name,
      targetGroupIds: targetGroupIds || [],
      targetContactIds: Array.from(targetIds),
      templateId,
      customMessage: baseMessage,
      status: launchNow ? 'RUNNING' : 'DRAFT',
    });

    newCampaign.stats = {
      totalTargeted: targeted.length,
      eligibleOptedIn: eligibleOptedIn.length,
      pendingConsentBlocked: pending.length,
      optedOutBlocked: optedOut.length,
      invalidOrDuplicateBlocked: notGiven.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    if (launchNow && eligibleOptedIn.length > 0) {
      eligibleOptedIn.forEach((contact) => {
        let interpolated = baseMessage
          .replace(/\{\{name\}\}/gi, contact.name)
          .replace(/\{\{city\}\}/gi, contact.city)
          .replace(/\{\{business\}\}/gi, contact.businessName || 'Your Business')
          .replace(/\{\{product\}\}/gi, contact.productInterest || 'HP Lubricants');

        db.enqueueMessage({
          contactId: contact.id,
          phone: contact.phone,
          customerName: contact.name,
          campaignId: newCampaign.id,
          category: 'promotional',
          content: interpolated,
          scheduledAt: new Date().toISOString(),
        });
      });
    }

    const actor = getActor(req);
    db.saveDatabase();
    db.addAuditLog(
      actor.userName,
      actor.role,
      'CREATE_CAMPAIGN',
      `Created campaign "${name}". Targeted ${targeted.length}, Enqueued ${eligibleOptedIn.length} eligible opted-in recipients.`
    );

    res.json({ success: true, data: newCampaign });
  });

  app.post('/api/campaigns/:id/pause', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const result = db.pauseCampaign(id);
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: result });
  });

  app.post('/api/campaigns/:id/cancel', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const result = db.cancelCampaign(id);
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: result });
  });

  app.post('/api/campaigns/:id/resume', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const result = db.resumeCampaign(id);
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: result });
  });

  // 9. AUTO REPLIES & KEYWORDS
  app.get('/api/auto-replies', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getAutoReplies() });
  });

  app.post('/api/auto-replies', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const created = db.saveAutoReply(req.body);
    res.json({ success: true, data: created });
  });

  app.delete('/api/auto-replies/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    data.autoReplies = data.autoReplies.filter((a) => a.id !== id);
    db.saveDatabase();
    res.json({ success: true });
  });

  app.get('/api/keyword-automations', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getKeywordAutomations() });
  });

  app.post('/api/keyword-automations', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const saved = db.saveKeywordAutomation(req.body);
    res.json({ success: true, data: saved });
  });

  app.delete('/api/keyword-automations/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    data.keywordAutomations = data.keywordAutomations.filter((k) => k.id !== id);
    db.saveDatabase();
    res.json({ success: true });
  });

  app.post('/api/keyword-automations/simulate', requireAuth, (req: Request, res: Response) => {
    if (db.getEnvironment() === 'LIVE') {
      return res.status(403).json({
        success: false,
        error: 'Simulation is strictly prohibited in LIVE mode. Only actual WhatsApp events are processed.',
      });
    }
    const { text, phone } = req.body;
    const result = pacingEngine.handleIncomingMessage(phone || '+919827003016', text || 'PRICE');
    res.json({ success: true, data: result });
  });

  // 10. FOLLOW UP SEQUENCES
  app.get('/api/follow-ups', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getFollowUpSequences() });
  });

  app.post('/api/follow-ups', requireAuth, (req: Request, res: Response) => {
    const saved = db.saveFollowUpSequence(req.body);
    res.json({ success: true, data: saved });
  });

  // 11. SMART PACING & QUEUE
  app.get('/api/pacing', requireAuth, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        config: db.getPacingConfig(),
        queue: db.getQueue(),
        pacingState: db.getPacingState(),
      },
    });
  });

  app.post('/api/pacing/config', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const body = req.body || {};
    // Allowlist only known pacing fields — prevent mass assignment
    const allowed: Record<string, unknown> = {};
    const keys = [
      'minIntervalSeconds', 'maxIntervalSeconds', 'dailyCampaignCap', 'batchSize',
      'pauseBetweenBatchesMinutes', 'workingHoursStart', 'workingHoursEnd',
      'mode', 'reasonForAdjustment', 'maxRetries', 'jitterPercent',
    ];
    for (const k of keys) {
      if (body[k] !== undefined) allowed[k] = body[k];
    }
    const updated = db.updatePacingConfig(allowed as any);
    res.json({ success: true, data: updated });
  });

  app.post('/api/pacing/mode', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const { mode } = req.body;
    if (mode === 'AUTO' || mode === 'MANUAL' || mode === 'PAUSED') {
      const updated = db.updatePacingConfig({
        mode,
        reasonForAdjustment: mode === 'PAUSED' ? 'Pacing paused by administrator.' : `Pacing active in ${mode} mode.`,
      });
      if (mode !== 'PAUSED') {
        db.updatePacingState({
          autoPausedAt: null,
          autoPauseReason: null,
          consecutiveErrors: 0,
        });
      }
      res.json({ success: true, data: updated, pacingState: db.getPacingState() });
    } else {
      res.status(400).json({ success: false, error: 'Invalid mode' });
    }
  });

  app.post('/api/pacing/queue/clear', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    db.clearQueue();
    res.json({ success: true });
  });

  // 12. ACCOUNT HEALTH (Requirement 33: Genuine indicators & non-green start)
  app.get('/api/health', requireAuth, (req: Request, res: Response) => {
    const health = calculateAccountHealth();
    res.json({
      success: true,
      data: health,
    });
  });

  // 13. ANALYTICS
  app.get('/api/analytics', requireAuth, (req: Request, res: Response) => {
    const env = db.getEnvironment();
    const contacts = db.getContacts();
    const messages = db.getMessages();
    const campaigns = db.getCampaigns();

    const categoryCounts: Record<string, number> = {};
    contacts.forEach((c) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });

    const categoryDistribution = Object.keys(categoryCounts).map((cat) => ({
      name: cat,
      count: categoryCounts[cat],
    }));

    // Real weekly traffic distribution based on actual message timestamps
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap: Record<string, { sent: number; delivered: number; incoming: number }> = {
      Mon: { sent: 0, delivered: 0, incoming: 0 },
      Tue: { sent: 0, delivered: 0, incoming: 0 },
      Wed: { sent: 0, delivered: 0, incoming: 0 },
      Thu: { sent: 0, delivered: 0, incoming: 0 },
      Fri: { sent: 0, delivered: 0, incoming: 0 },
      Sat: { sent: 0, delivered: 0, incoming: 0 },
      Sun: { sent: 0, delivered: 0, incoming: 0 },
    };

    messages.forEach((m) => {
      const d = new Date(m.timestamp);
      if (!isNaN(d.getTime())) {
        const dayName = dayNames[d.getDay()];
        if (weeklyMap[dayName]) {
          if (m.direction === 'outbound') {
            weeklyMap[dayName].sent += 1;
            if (m.status === 'DELIVERED' || m.status === 'READ') {
              weeklyMap[dayName].delivered += 1;
            }
          } else if (m.direction === 'inbound') {
            weeklyMap[dayName].incoming += 1;
          }
        }
      }
    });

    const weeklyData = days.map((day) => ({
      day,
      sent: weeklyMap[day].sent,
      delivered: weeklyMap[day].delivered,
      incoming: weeklyMap[day].incoming,
    }));

    res.json({
      success: true,
      data: {
        environment: env,
        totalContacts: contacts.length,
        optedInCount: contacts.filter((c) => c.consentStatus === 'OPTED_IN').length,
        pendingCount: contacts.filter((c) => c.consentStatus === 'PENDING').length,
        optedOutCount: contacts.filter((c) => c.consentStatus === 'OPTED_OUT').length,
        totalMessages: messages.length,
        outboundMessages: messages.filter((m) => m.direction === 'outbound').length,
        inboundMessages: messages.filter((m) => m.direction === 'inbound').length,
        deliveredMessages: messages.filter((m) => m.status === 'DELIVERED' || m.status === 'READ').length,
        readMessages: messages.filter((m) => m.status === 'READ').length,
        failedMessages: messages.filter((m) => m.status === 'FAILED').length,
        categoryDistribution,
        weeklyData,
        campaignsCount: campaigns.length,
      },
    });
  });

  // 14. TEAM MANAGEMENT & RBAC
  app.get('/api/team', requireAuth, requireRole(['ADMIN', 'MANAGER']), (req: Request, res: Response) => {
    const actor = getActor(req);
    // Strip password hashes from team member payload
    const safeMembers = db.getTeamMembers().map(({ passwordHash, ...rest }) => rest);
    res.json({
      success: true,
      data: {
        members: safeMembers,
        currentUser: actor,
      },
    });
  });

  // VMA-01: Privilege escalation fixed.
  // Role switching is disabled for security. Users must log in as the intended account.
  // Only ADMIN may view team members; nobody may change their own session role via API.
  app.post('/api/team/switch-role', requireAuth, (req: Request, res: Response) => {
    return res.status(403).json({
      success: false,
      error: 'Role switching is disabled for security. Log out and log in with the intended account. Session role cannot be modified via API.',
    });
  });

  // 15. AUDIT LOGS
  app.get('/api/audit-logs', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    res.json({ success: true, data: db.getAuditLogs() });
  });

  // 16. LOCAL BACKUP & RESTORE
  app.get('/api/backup/download', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const fullDb = db.getData();
    const filename = `vikas_automator_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(fullDb, null, 2));
  });

  app.post('/api/backup/restore', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const backupPayload = req.body;
    const actor = getActor(req);

    if (!backupPayload || typeof backupPayload !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid backup payload' });
    }
    // Structural validation — required collections must be arrays
    const requiredArrays = ['contacts', 'campaigns', 'messageQueue', 'teamMembers', 'messages', 'templates'];
    for (const key of requiredArrays) {
      if (backupPayload[key] !== undefined && !Array.isArray(backupPayload[key])) {
        return res.status(400).json({ success: false, error: `Invalid backup: ${key} must be an array` });
      }
    }
    if (!Array.isArray(backupPayload.contacts)) {
      return res.status(400).json({ success: false, error: 'Invalid backup payload: contacts array required' });
    }
    if (backupPayload.settings && typeof backupPayload.settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid backup: settings must be an object' });
    }

    // Pre-restore snapshot for recovery
    try {
      const snapshotDir = path.join(DATA_DIR, 'pre-restore-snapshots');
      if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
      const snapName = `pre-restore_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(
        path.join(snapshotDir, snapName),
        JSON.stringify(db.getData(), null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Failed to write pre-restore snapshot:', err);
      return res.status(500).json({ success: false, error: 'Could not create pre-restore snapshot; aborting restore.' });
    }

    // Do not blindly trust teamMembers password hashes from backup without admin confirmation.
    // Keep current teamMembers unless payload explicitly includes confirmReplaceUsers: true
    const { confirmReplaceUsers, ...rest } = backupPayload;
    const toRestore = { ...rest };
    if (!confirmReplaceUsers) {
      toRestore.teamMembers = db.getData().teamMembers;
    }

    db.saveDatabase(toRestore);
    db.addAuditLog(
      actor.userName,
      'ADMIN',
      'DATABASE_RESTORE',
      `Restored database from local JSON backup. Users replaced: ${confirmReplaceUsers === true}. Pre-restore snapshot saved.`
    );
    res.json({ success: true, message: 'Database successfully restored from backup. Pre-restore snapshot saved under data/pre-restore-snapshots/.' });
  });

  // 17. SETTINGS
  app.get('/api/settings', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: db.getSettings() });
  });

  app.post('/api/settings', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const actor = getActor(req);
    const updated = db.updateSettings(req.body);
    db.addAuditLog(actor.userName, 'ADMIN', 'UPDATE_SETTINGS', 'Updated business configurations.');
    res.json({ success: true, data: updated });
  });

  // 18. DEMO RESET
  app.post('/api/demo/reset', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const actor = getActor(req);
    db.resetToDemo();
    await baileysAdapter.disconnect();
    db.addAuditLog(actor.userName, actor.role, 'DEMO_DATA_RESET', 'Reset all records to factory demo defaults.');
    res.json({ success: true, message: 'All demo contacts, messages, and campaigns have been reset.' });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Bind to 127.0.0.1 by default for local-only access security
  app.listen(PORT, BIND_HOST, () => {
    console.log(`\n======================================================`);
    console.log(` VIKAS MESSAGE AUTOMATOR — SERVER RUNNING`);
    console.log(` Business: Vikas Automobiles, Satna, MP, India`);
    console.log(` HP Lube Distributor & C&F Agent | Contact: 9827003016`);
    console.log(` Local URL: http://${BIND_HOST === '0.0.0.0' ? 'localhost' : BIND_HOST}:${PORT}`);
    console.log(` Bind address: ${BIND_HOST} (change via BIND_HOST env if needed)`);
    console.log(` Security: Persistent sessions, CSRF, Rate Limiting & RBAC enforced`);
    console.log(` WhatsApp: Baileys multi-device QR (unofficial — use at own risk)`);
    const token = ensureSetupToken();
    if (token) {
      console.log(`------------------------------------------------------`);
      console.log(` FIRST-RUN SETUP REQUIRED`);
      console.log(` One-time SETUP TOKEN (enter this in the setup form):`);
      console.log(`   ${token}`);
      console.log(` This token is invalidated after Owner account creation.`);
      console.log(`------------------------------------------------------`);
    }
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
