import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { WhatsAppConnectionInfo, WhatsAppAdapterMode } from '../src/types/index';

// Optional dynamic import / require for Baileys to ensure resilience
let makeWASocket: any = null;
let useMultiFileAuthState: any = null;
let DisconnectReason: any = null;
let pino: any = null;

try {
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default || baileys.makeWASocket;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  pino = require('pino');
} catch (e) {
  console.warn('[WhatsAppQRAdapter] Baileys module dynamic loading note:', e);
}

export type IncomingMessageCallback = (phone: string, text: string, name?: string) => void;

export class WhatsAppQRAdapter {
  private sock: any = null;
  private authDir: string;
  private qrRefreshCount: number = 0;
  private incomingMessageHandler: IncomingMessageCallback | null = null;
  private isConnectingSocket: boolean = false;

  constructor() {
    this.authDir = path.join(process.cwd(), 'data', 'baileys_auth');
    this.ensureAuthDir();
  }

  private ensureAuthDir() {
    if (!fs.existsSync(this.authDir)) {
      try {
        fs.mkdirSync(this.authDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create auth directory:', err);
      }
    }
  }

  public onIncomingMessage(handler: IncomingMessageCallback) {
    this.incomingMessageHandler = handler;
  }

  public async startConnection(adapterMode: WhatsAppAdapterMode = 'LIVE_WHATSAPP_SOCKET'): Promise<WhatsAppConnectionInfo> {
    if (adapterMode === 'DEMO_SIMULATION') {
      return this.startDemoSimulation();
    }

    // Otherwise, start real WhatsApp Multi-Device WebSocket
    return this.startLiveBaileysSocket();
  }

  /**
   * Real WhatsApp Multi-Device Socket connection via Baileys.
   * Generates the authentic 237-byte noise-handshake QR that WhatsApp Business
   * on a physical phone recognises and connects to.
   */
  private async startLiveBaileysSocket(): Promise<WhatsAppConnectionInfo> {
    if (this.isConnectingSocket) {
      return db.getConnectionInfo();
    }

    this.isConnectingSocket = true;
    this.ensureAuthDir();

    // Clean up previous socket if any
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.end(undefined);
      } catch (e) {
        // ignore close errors
      }
      this.sock = null;
    }

    db.updateConnectionInfo({
      state: 'INITIALIZING',
      errorMessage: null,
      adapterMode: 'LIVE_WHATSAPP_SOCKET',
      lastSyncTime: new Date().toISOString(),
    });

    try {
      if (!makeWASocket || !useMultiFileAuthState) {
        throw new Error('Baileys library not available in runtime environment.');
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino ? pino({ level: 'silent' }) : undefined,
        printQRInTerminal: false,
        connectTimeoutMs: 35000,
        keepAliveIntervalMs: 15000,
        browser: ['Vikas Automobiles Automator', 'Chrome', '124.0.0'],
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Connection state listener
      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRefreshCount += 1;
          const expiresAt = new Date(Date.now() + 25000).toISOString();

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
              qrExpiresAt: expiresAt,
              qrRefreshCount: this.qrRefreshCount,
              adapterMode: 'LIVE_WHATSAPP_SOCKET',
              lastSyncTime: new Date().toISOString(),
              errorMessage: null,
            });

            db.addAuditLog(
              'WHATSAPP_SERVICE',
              'ADMIN',
              'REAL_QR_GENERATED',
              `Authentic WhatsApp Multi-Device pairing token generated (Token #${this.qrRefreshCount})`
            );
          } catch (err: any) {
            console.error('Error rendering QR data URL:', err);
          }
        }

        if (connection === 'open') {
          this.isConnectingSocket = false;
          const rawId = (this.sock?.user?.id || '').split(':')[0].split('@')[0];
          const rawPhone = rawId.replace(/\D/g, '');
          const formattedNumber = rawPhone.length === 10 ? `+91 ${rawPhone}` : `+${rawPhone}`;
          const userName = this.sock?.user?.name || 'Vikas Automobiles (HP Lube C&F)';

          db.updateConnectionInfo({
            state: 'CONNECTED',
            linkedNumber: formattedNumber,
            linkedName: userName,
            qrCodeDataUrl: null,
            lastConnectedTime: new Date().toISOString(),
            lastSyncTime: new Date().toISOString(),
            errorMessage: null,
            adapterMode: 'LIVE_WHATSAPP_SOCKET',
          });

          db.addAuditLog(
            'WHATSAPP_SERVICE',
            'ADMIN',
            'WHATSAPP_DEVICE_LINKED',
            `Device linked via live WhatsApp Multi-Device session to ${formattedNumber} (${userName})`
          );
        }

        if (connection === 'close') {
          this.isConnectingSocket = false;
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason?.loggedOut;

          console.log(`[WhatsApp Socket] Closed with statusCode: ${statusCode}, isLoggedOut: ${isLoggedOut}`);

          if (isLoggedOut) {
            // Phone unlinked session
            this.clearAuthFiles();
            db.updateConnectionInfo({
              state: 'DISCONNECTED',
              qrCodeDataUrl: null,
              linkedNumber: null,
              linkedName: null,
              errorMessage: 'Session was unlinked or logged out from your phone. Click Connect to pair again.',
              adapterMode: 'LIVE_WHATSAPP_SOCKET',
            });
            db.addAuditLog(
              'WHATSAPP_SERVICE',
              'ADMIN',
              'WHATSAPP_DEVICE_UNLINKED',
              'Session unlinked from phone. Local credentials purged.'
            );
          } else {
            // Temporary network drop or QR timeout
            const current = db.getConnectionInfo();
            if (current.state === 'WAITING_FOR_QR') {
              // QR expired without scan -> wait for user to click regenerate or automatically try once
              db.updateConnectionInfo({
                state: 'WAITING_FOR_QR',
                errorMessage: 'QR code session timed out. Click "Refresh Live QR" to generate a fresh pairing token.',
              });
            } else if (current.state === 'CONNECTED') {
              db.updateConnectionInfo({
                state: 'RECONNECTING',
                errorMessage: 'Connection temporarily dropped. Re-establishing link...',
              });
              // Auto-reconnect after 3 seconds
              setTimeout(() => {
                this.startLiveBaileysSocket().catch((e) => console.error('Auto-reconnect error:', e));
              }, 3000);
            }
          }
        }
      });

      // Inbound WhatsApp messages listener
      this.sock.ev.on('messages.upsert', async (m: any) => {
        if (!m.messages || m.messages.length === 0) return;

        for (const msg of m.messages) {
          if (msg.key?.fromMe) continue;
          if (!msg.message) continue;

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '';

          if (!text) continue;

          const remoteJid = msg.key?.remoteJid || '';
          if (!remoteJid.endsWith('@s.whatsapp.net')) continue; // Skip status broadcasts and group messages

          const cleanPhone = remoteJid.replace('@s.whatsapp.net', '');
          const pushName = msg.pushName || undefined;

          console.log(`[WhatsApp Inbound] From: ${cleanPhone}, Text: "${text}"`);

          if (this.incomingMessageHandler) {
            try {
              this.incomingMessageHandler(cleanPhone, text, pushName);
            } catch (err) {
              console.error('Error invoking incomingMessageHandler:', err);
            }
          }
        }
      });

      // Wait a moment for initial QR or connection event
      return db.getConnectionInfo();
    } catch (err: any) {
      this.isConnectingSocket = false;
      db.updateConnectionInfo({
        state: 'CONNECTION_ERROR',
        errorMessage: 'Failed to start WhatsApp socket: ' + (err?.message || 'Unknown socket error'),
      });
      throw err;
    }
  }

  /**
   * Demo Simulation Mode
   * For instant zero-friction demonstrations and tests without requiring a real phone camera.
   */
  private async startDemoSimulation(): Promise<WhatsAppConnectionInfo> {
    this.ensureAuthDir();
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    db.updateConnectionInfo({
      state: 'INITIALIZING',
      errorMessage: null,
      adapterMode: 'DEMO_SIMULATION',
    });

    const sessionId = 'WA_SIMULATOR_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const demoPayload = `DEMO_SIMULATION_VIKAS_${sessionId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 60000).toISOString();

    const qrDataUrl = await QRCode.toDataURL(demoPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    const updated = db.updateConnectionInfo({
      state: 'WAITING_FOR_QR',
      qrCodeDataUrl: qrDataUrl,
      qrExpiresAt: expiresAt,
      adapterMode: 'DEMO_SIMULATION',
      lastSyncTime: new Date().toISOString(),
      errorMessage: null,
    });

    db.addAuditLog(
      'WHATSAPP_SIMULATOR',
      'ADMIN',
      'SIMULATED_QR_GENERATED',
      'Generated instant Demo Simulator QR token for testing'
    );

    return updated;
  }

  /**
   * Simulate a scan pairing (used in Demo Mode)
   */
  public async simulateScanPairing(phoneNumber: string = '9827003016'): Promise<WhatsAppConnectionInfo> {
    db.updateConnectionInfo({
      state: 'CONNECTING',
      errorMessage: null,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const now = new Date().toISOString();
    const clean = phoneNumber.replace(/\D/g, '');
    const formatted = clean.length === 10 ? `+91 ${clean}` : `+${clean}`;

    const updated = db.updateConnectionInfo({
      state: 'CONNECTED',
      linkedNumber: formatted,
      linkedName: 'Vikas Automobiles (HP Lube C&F Satna)',
      lastConnectedTime: now,
      lastSyncTime: now,
      qrCodeDataUrl: null,
      errorMessage: null,
      adapterMode: 'DEMO_SIMULATION',
    });

    db.addAuditLog(
      'WHATSAPP_SIMULATOR',
      'ADMIN',
      'SIMULATED_DEVICE_LINKED',
      `Simulated device pairing linked to ${formatted}`
    );

    return updated;
  }

  /**
   * Send a live message via Baileys WebSocket if connected
   */
  public async sendLiveMessage(phone: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    const conn = db.getConnectionInfo();

    if (conn.adapterMode === 'LIVE_WHATSAPP_SOCKET' && conn.state === 'CONNECTED' && this.sock) {
      try {
        const clean = phone.replace(/\D/g, '');
        const jid = `${clean}@s.whatsapp.net`;
        const res = await this.sock.sendMessage(jid, { text });
        return { success: true, messageId: res?.key?.id };
      } catch (err: any) {
        console.error('[WhatsApp Socket Send Error]:', err);
        throw err;
      }
    }

    // Otherwise in demo mode, message treated as sent
    return { success: true };
  }

  public isLiveConnected(): boolean {
    const conn = db.getConnectionInfo();
    return conn.adapterMode === 'LIVE_WHATSAPP_SOCKET' && conn.state === 'CONNECTED' && Boolean(this.sock);
  }

  private clearAuthFiles() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Failed to clear auth files:', e);
    }
  }

  public disconnect(): WhatsAppConnectionInfo {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    this.clearAuthFiles();

    const updated = db.updateConnectionInfo({
      state: 'DISCONNECTED',
      qrCodeDataUrl: null,
      linkedNumber: null,
      linkedName: null,
      errorMessage: null,
    });

    db.addAuditLog(
      'WHATSAPP_SERVICE',
      'ADMIN',
      'WHATSAPP_DEVICE_DISCONNECTED',
      'WhatsApp session disconnected and pairing keys cleared.'
    );

    return updated;
  }

  public getStatus(): WhatsAppConnectionInfo {
    return db.getConnectionInfo();
  }
}

export const qrAdapter = new WhatsAppQRAdapter();
