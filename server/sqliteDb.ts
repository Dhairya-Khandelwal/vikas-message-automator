import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'counters.sqlite');

/**
 * Business timezone helper: Satna, MP, India operates in Asia/Kolkata (UTC+05:30).
 * Consistent date string format: YYYY-MM-DD.
 */
export function getBusinessDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export interface DailyCounterRow {
  date: string;
  sent_count: number;
  failed_count: number;
  updated_at: string;
}

export interface ConsentEventRecord {
  id: string;
  contactId: string;
  phone: string;
  customerName?: string;
  eventType: 'OPT_IN' | 'OPT_OUT' | 'CONSENT_VERIFIED' | 'CONSENT_REVOKED' | 'STATUS_CHANGE';
  consentStatus: string;
  consentSource?: string;
  consentDate: string;
  evidenceReference?: string;
  consentWordingVersion?: string;
  permissionCategories?: string[];
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REVOKED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  timestamp: string;
}

export class SqliteManager {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    this.initSchema();
  }

  private initSchema() {
    // 1. Daily send counters table (persistent across restarts)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_send_counters (
        date TEXT PRIMARY KEY,
        sent_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. Consent events history table (immutable audit of opt-ins and opt-outs)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consent_events (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        customer_name TEXT,
        event_type TEXT NOT NULL,
        consent_status TEXT NOT NULL,
        consent_source TEXT,
        consent_date TEXT NOT NULL,
        evidence_reference TEXT,
        consent_wording_version TEXT,
        permission_categories TEXT,
        verification_status TEXT NOT NULL,
        verified_by TEXT,
        verified_at TEXT,
        notes TEXT,
        timestamp TEXT NOT NULL
      );
    `);

    // 3. Sent idempotency keys table (duplicate dispatch prevention)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sent_idempotency_keys (
        idempotency_key TEXT PRIMARY KEY,
        queue_item_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        message_id TEXT,
        sent_at TEXT NOT NULL
      );
    `);
  }

  // --- Daily Counter Methods ---

  public getDailyCounter(dateStr: string = getBusinessDateString()): DailyCounterRow {
    const stmt = this.db.prepare('SELECT date, sent_count, failed_count, updated_at FROM daily_send_counters WHERE date = ?');
    const row = stmt.get(dateStr) as DailyCounterRow | undefined;

    if (row) {
      return row;
    }

    const now = new Date().toISOString();
    const insertStmt = this.db.prepare(`
      INSERT INTO daily_send_counters (date, sent_count, failed_count, updated_at)
      VALUES (?, 0, 0, ?)
    `);
    insertStmt.run(dateStr, now);

    return {
      date: dateStr,
      sent_count: 0,
      failed_count: 0,
      updated_at: now,
    };
  }

  public incrementDailySent(dateStr: string = getBusinessDateString()): number {
    this.getDailyCounter(dateStr); // Ensure row exists
    const now = new Date().toISOString();
    const updateStmt = this.db.prepare(`
      UPDATE daily_send_counters
      SET sent_count = sent_count + 1, updated_at = ?
      WHERE date = ?
    `);
    updateStmt.run(now, dateStr);

    const updated = this.getDailyCounter(dateStr);
    return updated.sent_count;
  }

  public incrementDailyFailed(dateStr: string = getBusinessDateString()): number {
    this.getDailyCounter(dateStr);
    const now = new Date().toISOString();
    const updateStmt = this.db.prepare(`
      UPDATE daily_send_counters
      SET failed_count = failed_count + 1, updated_at = ?
      WHERE date = ?
    `);
    updateStmt.run(now, dateStr);

    const updated = this.getDailyCounter(dateStr);
    return updated.failed_count;
  }

  public setDailySent(count: number, dateStr: string = getBusinessDateString()) {
    this.getDailyCounter(dateStr); // Ensure row exists
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE daily_send_counters
      SET sent_count = ?, updated_at = ?
      WHERE date = ?
    `);
    stmt.run(count, now, dateStr);
  }

  public resetDailyCounter(dateStr: string = getBusinessDateString()) {
    this.setDailySent(0, dateStr);
  }

  // --- Consent Events Methods ---

  public recordConsentEvent(event: ConsentEventRecord): ConsentEventRecord {
    const stmt = this.db.prepare(`
      INSERT INTO consent_events (
        id, contact_id, phone, customer_name, event_type,
        consent_status, consent_source, consent_date, evidence_reference,
        consent_wording_version, permission_categories, verification_status,
        verified_by, verified_at, notes, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const categoriesJson = JSON.stringify(event.permissionCategories || []);
    stmt.run(
      event.id,
      event.contactId,
      event.phone,
      event.customerName || null,
      event.eventType,
      event.consentStatus,
      event.consentSource || null,
      event.consentDate,
      event.evidenceReference || null,
      event.consentWordingVersion || null,
      categoriesJson,
      event.verificationStatus,
      event.verifiedBy || null,
      event.verifiedAt || null,
      event.notes || null,
      event.timestamp
    );

    return event;
  }

  public getConsentEvents(contactId?: string, phone?: string): ConsentEventRecord[] {
    let rows: any[] = [];
    if (contactId) {
      const stmt = this.db.prepare('SELECT * FROM consent_events WHERE contact_id = ? ORDER BY timestamp DESC');
      rows = stmt.all(contactId) as any[];
    } else if (phone) {
      const stmt = this.db.prepare('SELECT * FROM consent_events WHERE phone = ? ORDER BY timestamp DESC');
      rows = stmt.all(phone) as any[];
    } else {
      const stmt = this.db.prepare('SELECT * FROM consent_events ORDER BY timestamp DESC LIMIT 500');
      rows = stmt.all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      contactId: r.contact_id,
      phone: r.phone,
      customerName: r.customer_name || undefined,
      eventType: r.event_type,
      consentStatus: r.consent_status,
      consentSource: r.consent_source || undefined,
      consentDate: r.consent_date,
      evidenceReference: r.evidence_reference || undefined,
      consentWordingVersion: r.consent_wording_version || undefined,
      permissionCategories: r.permission_categories ? JSON.parse(r.permission_categories) : [],
      verificationStatus: r.verification_status,
      verifiedBy: r.verified_by || undefined,
      verifiedAt: r.verified_at || undefined,
      notes: r.notes || undefined,
      timestamp: r.timestamp,
    }));
  }

  // --- Idempotency Methods ---

  public isIdempotencyKeyClaimed(key: string): boolean {
    const stmt = this.db.prepare('SELECT idempotency_key FROM sent_idempotency_keys WHERE idempotency_key = ?');
    const row = stmt.get(key);
    return Boolean(row);
  }

  public recordIdempotencyKey(key: string, queueItemId: string, phone: string, messageId: string = '') {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO sent_idempotency_keys (idempotency_key, queue_item_id, phone, message_id, sent_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(key, queueItemId, phone, messageId, now);
  }
}

export const sqliteManager = new SqliteManager();
