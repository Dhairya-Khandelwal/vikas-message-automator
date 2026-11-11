import React, { useState } from 'react';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  LogOut,
  ShieldAlert,
  Info,
  Clock,
  Wifi,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Lock,
  HardDrive,
} from 'lucide-react';
import { WhatsAppConnectionInfo } from '../../types';

interface WhatsAppConnectionViewProps {
  connectionInfo: WhatsAppConnectionInfo;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const WhatsAppConnectionView: React.FC<WhatsAppConnectionViewProps> = ({
  connectionInfo,
  onConnect,
  onDisconnect,
}) => {
  const [loading, setLoading] = useState(false);

  const handleStartConnect = async () => {
    setLoading(true);
    try {
      await onConnect();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your WhatsApp Business session? Local session keys in data/baileys_auth_info will be unlinked and cleared.')) {
      setLoading(true);
      try {
        await onDisconnect();
      } finally {
        setLoading(false);
      }
    }
  };

  const isConnected = connectionInfo.state === 'CONNECTED';
  const isWaitingQR = connectionInfo.state === 'WAITING_FOR_QR';
  const isConnecting = connectionInfo.state === 'CONNECTING';
  const isInitializing = connectionInfo.state === 'INITIALIZING';
  const isReconnecting = connectionInfo.state === 'RECONNECTING';
  const isError = connectionInfo.state === 'CONNECTION_ERROR';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Info Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : isWaitingQR || isConnecting || isInitializing || isReconnecting
                  ? 'bg-amber-400 animate-pulse'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              State: {connectionInfo.state.replace(/_/g, ' ')}
            </span>
            {isConnected ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                Online & Synchronized
              </span>
            ) : isWaitingQR ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                Awaiting Device Scan
              </span>
            ) : isReconnecting ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                Auto-Reconnecting
              </span>
            ) : null}
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            WhatsApp Business Multi-Device Pairing
          </h2>
          <p className="text-xs text-slate-500">
            Direct socket connection via Baileys multi-device adapter for Vikas Automobiles Satna.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </button>
          ) : (
            <button
              onClick={handleStartConnect}
              disabled={loading || isConnecting || isInitializing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading || isConnecting || isInitializing ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              <span>{isWaitingQR ? 'Regenerate QR Code' : 'Connect WhatsApp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Connection Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: QR Code / Connected Badge */}
        <div className="md:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
          {isConnected ? (
            <div className="space-y-4 py-6 w-full">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {connectionInfo.linkedName || 'Vikas Automobiles (WhatsApp Business)'}
                </h3>
                <p className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                  {connectionInfo.linkedNumber || '+91 9827003016'}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Authenticated WhatsApp Web Session</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs space-y-2 w-full">
                <div className="flex justify-between text-slate-600">
                  <span>Linked At:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {connectionInfo.lastConnectedTime ? new Date(connectionInfo.lastConnectedTime).toLocaleTimeString() : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Session Storage:</span>
                  <span className="font-mono text-slate-800">data/baileys_auth_info</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Auto-Reconnect:</span>
                  <span className="text-emerald-700 font-semibold">Active (Socket heartbeat)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Protocol:</span>
                  <span className="font-semibold text-slate-800">Baileys Multi-Device WS</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                All scheduled campaigns and inbound customer queries are processed directly through this live authenticated connection.
              </p>
            </div>
          ) : isWaitingQR && connectionInfo.qrCodeDataUrl ? (
            <div className="space-y-4 w-full">
              <div className="p-3 bg-white border-2 border-dashed border-blue-400 rounded-xl inline-block shadow-sm">
                <img
                  src={connectionInfo.qrCodeDataUrl}
                  alt="WhatsApp Web Pairing QR Code"
                  className="w-64 h-64 mx-auto object-contain"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Live QR generated from WhatsApp socket</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Scan this QR code with WhatsApp Business on your phone.
                </p>
                <p className="text-[11px] text-slate-400">
                  This dashboard will automatically switch to <strong>CONNECTED</strong> once authentication succeeds.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>QR updates automatically if it times out.</span>
              </div>
            </div>
          ) : isConnecting || isInitializing ? (
            <div className="space-y-4 py-12">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                <RotateCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  {isInitializing ? 'Initializing WhatsApp Socket...' : 'Authenticating Device...'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Connecting to WhatsApp multi-device servers and awaiting key exchange...
                </p>
              </div>
            </div>
          ) : isReconnecting ? (
            <div className="space-y-4 py-12">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Reconnecting to WhatsApp...
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {connectionInfo.errorMessage || 'Recovering socket connection with saved credentials...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-8">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  No WhatsApp Account Linked
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click the button below to initialize the WhatsApp Web socket and render your authentic pairing QR code.
                </p>
                {connectionInfo.errorMessage && (
                  <p className="text-xs text-rose-600 max-w-xs mx-auto pt-1 font-medium">
                    {connectionInfo.errorMessage}
                  </p>
                )}
              </div>
              <button
                onClick={handleStartConnect}
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 mx-auto shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Connect WhatsApp (Generate QR)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Step-by-Step Instructions & Compliance Notice */}
        <div className="md:col-span-7 space-y-4">
          {/* Step by Step Instructions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              How to Link with WhatsApp Business Phone
            </h3>

            <div className="space-y-2.5 text-slate-600">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-slate-800">Open WhatsApp Business</strong> on your phone (e.g. Vikas Automobiles SIM: 9827003016).
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  Tap <strong className="text-slate-800">Settings</strong> (or the 3 dots in the top right corner) and select <strong className="text-slate-800">Linked Devices</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  Tap <strong className="text-slate-800">Link a Device</strong>. If biometric unlock is enabled, confirm your fingerprint or face ID.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  Point your phone camera directly at the QR code on the left. The dashboard will automatically detect authentication and change status to <strong>CONNECTED</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Technical Architecture & Anti-Ban Notice */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2 text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Statutory Technical Transparency & Anti-Ban Architecture</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              <strong>Authentic WhatsApp Multi-Device Protocol:</strong> This integration connects directly via the official multi-device web socket protocol using local session keys stored securely in <code>data/baileys_auth_info/</code>.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800">
              <li>
                <strong>Automatic Reconnection:</strong> If your network drops or the socket disconnects unexpectedly, the adapter automatically reconnects using your saved keys without asking you to re-scan.
              </li>
              <li>
                <strong>Safe Pacing Engine Active:</strong> All outgoing messages are queued and regulated with random 10–18s intervals to mimic natural human typing patterns and prevent spam detection.
              </li>
              <li>
                <strong>Consent Enforced:</strong> Promotional messages are strictly blocked unless a contact is in <code>OPTED_IN</code> status. Opt-out keywords (<code>STOP</code>, <code>UNSUBSCRIBE</code>) are processed instantly.
              </li>
              <li>
                <strong>100% Local:</strong> No external gateway or third-party cloud service has access to your chats or credentials.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
