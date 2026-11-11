import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db';
import { WhatsAppConnectionInfo } from '../src/types/index';
import { eventProcessor } from './eventProcessor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../data/baileys_auth_info');

export class BaileysWhatsAppAdapter {
  private sock: WASocket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureAuthDir();
    // Auto-resume existing session if credentials already exist on disk
    if (this.hasSavedCredentials()) {
      console.log('[Baileys] Saved credentials found in data/baileys_auth_info, resuming connection...');
      this.initSocket().catch((err) => {
        console.error('[Baileys] Failed to auto-resume saved session:', err);
      });
    }
  }

  private ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  }

  private hasSavedCredentials(): boolean {
    if (!fs.existsSync(AUTH_DIR)) return false;
    const files = fs.readdirSync(AUTH_DIR);
    return files.some((f) => f.includes('creds.json'));
  }

  public async initSocket(): Promise<WhatsAppConnectionInfo> {
    if (this.isConnecting && this.sock) {
      return db.getConnectionInfo();
    }

    this.isConnecting = true;
    this.ensureAuthDir();

    // 1. Set connection state to INITIALIZING
    db.updateConnectionInfo({
      state: 'INITIALIZING',
      errorMessage: null,
      adapterMode: 'LOCAL_BRIDGE',
    });

    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      let version: [number, number, number] | undefined = undefined;

      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch (err) {
        // Fallback to default version if offline
        version = [2, 3000, 1015901307];
      }

      // Initialize real WhatsApp Web Socket
      const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }) as any,
        printQRInTerminal: false,
        auth: state,
        browser: ['Vikas Message Automator', 'Chrome', '124.0.0'],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        emitOwnEvents: false,
      });

      this.sock = sock;

      // 2. Listen for credentials updates and save locally
      sock.ev.on('creds.update', saveCreds);

      // 3. Listen for connection.update
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // If Baileys emitted a real QR string
        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
              errorCorrectionLevel: 'M',
            });

            db.updateConnectionInfo({
              state: 'WAITING_FOR_QR',
              qrCodeDataUrl: qrDataUrl,
              lastSyncTime: new Date().toISOString(),
              errorMessage: null,
            });

            db.addAuditLog(
              'BAILEYS_SOCKET',
              'ADMIN',
              'WHATSAPP_QR_EMITTED',
              'Received authentic WhatsApp Web authentication QR code from WhatsApp socket.'
            );
          } catch (err: any) {
            console.error('[Baileys] Error rendering QR data URL:', err);
          }
        }

        // Connecting state
        if (connection === 'connecting') {
          db.updateConnectionInfo({
            state: 'CONNECTING',
            errorMessage: null,
          });
        }

        // CONNECTED: Successful authentication
        if (connection === 'open') {
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // Extract verified phone number and display name
          const userJid = sock.user?.id || '';
          const phoneNumber = userJid.split(':')[0] || userJid.split('@')[0] || 'Connected';
          const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
          const displayName = sock.user?.name || 'Vikas Automobiles (WhatsApp Business)';
          const now = new Date().toISOString();

          db.updateConnectionInfo({
            state: 'CONNECTED',
            linkedNumber: formattedPhone,
            linkedName: displayName,
            qrCodeDataUrl: null,
            lastConnectedTime: now,
            lastSyncTime: now,
            errorMessage: null,
          });

          db.addAuditLog(
            'BAILEYS_SOCKET',
            'ADMIN',
            'WHATSAPP_AUTHENTICATED',
            `Device successfully authenticated and verified with WhatsApp servers (${formattedPhone})`
          );

          console.log(`[Baileys] WhatsApp Connected successfully: ${formattedPhone} (${displayName})`);
        }

        // DISCONNECTED / CLOSED: Handle auto-reconnect or logout via Central Event Processor
        if (connection === 'close') {
          this.isConnecting = false;
          const statusCode =
            (lastDisconnect?.error as any)?.output?.statusCode ||
            (lastDisconnect?.error as any)?.statusCode;

          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          console.log(`[Baileys] Connection closed. Status code: ${statusCode}, isLoggedOut: ${isLoggedOut}`);

          // Route disconnect event through Central Event Processor
          eventProcessor.processEvent({
            type: 'DISCONNECT',
            reason: isLoggedOut
              ? 'WhatsApp session was unlinked or logged out from your phone.'
              : `Connection closed unexpectedly (code ${statusCode || 'unknown'}).`,
            statusCode,
            isLoggedOut,
            source: 'BAILEYS_SOCKET',
          });

          if (isLoggedOut) {
            // User unlinked the device from phone
            this.clearSavedCredentials();
            this.sock = null;
            db.updateConnectionInfo({
              state: 'DISCONNECTED',
              linkedNumber: null,
              linkedName: null,
              qrCodeDataUrl: null,
              errorMessage: 'WhatsApp session was unlinked or logged out from your phone.',
            });
          } else {
            // Unexpected disconnection (network glitch, socket dropped) -> Auto-reconnect!
            db.updateConnectionInfo({
              state: 'RECONNECTING',
              errorMessage: `Connection closed unexpectedly (code ${statusCode || 'unknown'}). Auto-reconnecting...`,
            });

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts += 1;
              const delay = Math.min(3000 * this.reconnectAttempts, 20000);
              console.log(`[Baileys] Scheduling automatic reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);
              if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
              this.reconnectTimer = setTimeout(() => {
                this.initSocket().catch((e) => console.error('[Baileys] Auto-reconnect failed:', e));
              }, delay);
            } else {
              db.updateConnectionInfo({
                state: 'CONNECTION_ERROR',
                errorMessage: 'Exceeded maximum reconnection attempts. Click "Connect WhatsApp" to reconnect.',
              });
            }
          }
        }
      });

      // 4. Listen for real delivery receipts and status updates via Central Event Processor
      sock.ev.on('messages.update', async (messageUpdates) => {
        for (const update of messageUpdates) {
          const waId = update.key?.id;
          if (!waId) continue;
          const status = update.update?.status;
          // Status 3 = DELIVERY_ACK, 4 = READ, 5 = PLAYED
          if (status === 3 || (status as any) === 'DELIVERY_ACK') {
            console.log(`[Baileys] Central Event Processor: confirmed delivery receipt for message ${waId}`);
            eventProcessor.processEvent({
              type: 'RECEIPT',
              whatsappMessageId: waId,
              receiptStatus: 'DELIVERED',
              source: 'BAILEYS_SOCKET',
            });
          } else if (status === 4 || status === 5 || (status as any) === 'READ' || (status as any) === 'PLAYED') {
            console.log(`[Baileys] Central Event Processor: confirmed read receipt for message ${waId}`);
            eventProcessor.processEvent({
              type: 'RECEIPT',
              whatsappMessageId: waId,
              receiptStatus: 'READ',
              source: 'BAILEYS_SOCKET',
            });
          }
        }
      });

      // 5. Listen for real incoming messages from WhatsApp via Central Event Processor
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          // Ignore messages sent by self
          if (msg.key.fromMe) continue;

          // Extract text content
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '';

          if (!text.trim()) continue;

          // Extract sender JID and phone
          const remoteJid = msg.key.remoteJid || '';
          // Ignore status broadcast or group messages if only private 1-on-1 CRM
          if (remoteJid.endsWith('@broadcast') || remoteJid.includes('@g.us')) continue;

          const senderPhone = remoteJid.replace('@s.whatsapp.net', '');
          const senderName = msg.pushName || undefined;

          console.log(`[Baileys] Central Event Processor: incoming message from ${senderPhone}: "${text}"`);

          // Process through Central Event Processor (Validate • Identify • Deduplicate • Store)
          const outcome = eventProcessor.processEvent({
            type: 'INCOMING_MESSAGE',
            whatsappMessageId: msg.key.id || undefined,
            phone: senderPhone,
            text,
            senderName,
            source: 'BAILEYS_SOCKET',
          });

          // If opt-out acknowledgement or automated reply was triggered, dispatch via connected WhatsApp socket
          if (
            outcome.replyAction &&
            outcome.replyAction.type !== 'NONE' &&
            outcome.replyAction.replyText &&
            this.isConnected()
          ) {
            console.log(
              `[Baileys] Dispatching ${outcome.replyAction.type} reply to ${senderPhone} via live WhatsApp session`
            );
            const sendRes = await this.sendTextMessage(senderPhone, outcome.replyAction.replyText);
            if (sendRes.success && sendRes.messageId) {
              if (outcome.replyAction.outboundMessageId) {
                const outMsg = db.getMessages().find((m) => m.id === outcome.replyAction?.outboundMessageId);
                if (outMsg) {
                  outMsg.whatsappMessageId = sendRes.messageId;
                  outMsg.status = 'SENT';
                  db.saveDatabase();
                }
              }
            }
          }
        }
      });

      return db.getConnectionInfo();
    } catch (err: any) {
      this.isConnecting = false;
      console.error('[Baileys] Fatal error initializing socket:', err);
      return db.updateConnectionInfo({
        state: 'CONNECTION_ERROR',
        errorMessage: 'Failed to initialize WhatsApp socket: ' + (err?.message || 'Unknown error'),
      });
    }
  }

  public isConnected(): boolean {
    return db.getConnectionInfo().state === 'CONNECTED' && this.sock !== null;
  }

  // Real WhatsApp message dispatch via socket transport
  public async sendTextMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; status: 'SENT' | 'FAILED'; error?: string }> {
    if (!this.sock) {
      return {
        success: false,
        status: 'FAILED',
        error: 'WhatsApp socket is not initialized',
      };
    }

    const info = db.getConnectionInfo();
    if (info.state !== 'CONNECTED') {
      return {
        success: false,
        status: 'FAILED',
        error: `Cannot send message: WhatsApp status is ${info.state}, not CONNECTED`,
      };
    }

    if (!toPhone || typeof toPhone !== 'string') {
      return {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient phone number',
      };
    }

    // Format phone number to WhatsApp JID
    let clean = toPhone.replace(/[\s\-\(\)\+]/g, '');
    if (clean.length === 10) {
      clean = '91' + clean; // Prepend India country code for local 10-digit numbers
    }

    if (clean.length < 10) {
      return {
        success: false,
        status: 'FAILED',
        error: `Invalid phone number length (${clean.length} digits): ${toPhone}`,
      };
    }

    const jid = clean.includes('@') ? clean : `${clean}@s.whatsapp.net`;

    try {
      console.log(`[Baileys] Dispatching authentic WhatsApp message to ${jid}: "${text.slice(0, 60)}..."`);
      const sent = await this.sock.sendMessage(jid, { text });
      const actualMessageId = sent?.key?.id || `wa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      console.log(`[Baileys] Socket transport confirmed send. Message ID: ${actualMessageId}`);
      return {
        success: true,
        messageId: actualMessageId,
        status: 'SENT',
      };
    } catch (err: any) {
      console.error('[Baileys] Socket sendMessage error:', err);
      return {
        success: false,
        status: 'FAILED',
        error: err?.message || 'WhatsApp socket transport error',
      };
    }
  }

  // Backward compatibility alias for sendMessage
  public async sendMessage(toPhone: string, text: string): Promise<boolean> {
    const res = await this.sendTextMessage(toPhone, text);
    if (!res.success) {
      throw new Error(res.error || 'Failed to send message via WhatsApp socket');
    }
    return true;
  }

  public async disconnect(): Promise<WhatsAppConnectionInfo> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.isConnecting = false;

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        // socket may already be closing
      }
      try {
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = null;
    }

    this.clearSavedCredentials();

    const updated = db.updateConnectionInfo({
      state: 'DISCONNECTED',
      linkedNumber: null,
      linkedName: null,
      qrCodeDataUrl: null,
      errorMessage: null,
    });

    db.addAuditLog(
      'BAILEYS_SOCKET',
      'ADMIN',
      'WHATSAPP_DISCONNECTED_BY_USER',
      'User disconnected WhatsApp session. Local authentication credentials cleared.'
    );

    return updated;
  }

  private clearSavedCredentials() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        const files = fs.readdirSync(AUTH_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(AUTH_DIR, file));
        }
      }
    } catch (err) {
      console.error('[Baileys] Error clearing credentials folder:', err);
    }
  }

  public getStatus(): WhatsAppConnectionInfo {
    return db.getConnectionInfo();
  }
}

export const baileysAdapter = new BaileysWhatsAppAdapter();
export const whatsappAdapter = baileysAdapter;
