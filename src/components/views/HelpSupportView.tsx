import React from 'react';
import {
  HelpCircle,
  Terminal,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Phone,
  HardDrive,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const HelpSupportView: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>Vikas Message Automator — User Manual & Operations Guide</span>
        </h2>
        <p className="text-xs text-slate-500">
          Official operating documentation for Vikas Automobiles, HP Lube Distributor & C&F Agent, Satna (M.P.).
        </p>
      </div>

      {/* Windows Quick Reference */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" />
          <span>Windows 10 / 11 Batch Script Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-blue-700">
              <span>install.bat</span>
              <span className="text-[10px] text-slate-400">One-Time Setup</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Verifies Node.js, runs <code>npm install</code> for local free dependencies, and initializes the local data directory.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-emerald-700">
              <span>start.bat</span>
              <span className="text-[10px] text-slate-400">Daily Execution</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Launches the Express server, background pacing scheduler, and opens <code>http://localhost:3000</code> in your browser.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-rose-700">
              <span>stop.bat</span>
              <span className="text-[10px] text-slate-400">Graceful Shutdown</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Terminates background Node processes running on port 3000 cleanly before turning off your computer.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-amber-700">
              <span>backup.bat</span>
              <span className="text-[10px] text-slate-400">Database Safety</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Copies <code>data/database.json</code> to a timestamped backup file in the <code>backups/</code> folder.
            </p>
          </div>
        </div>
      </div>

      {/* QR Pairing FAQ */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span>Linking Your Existing WhatsApp Business Phone</span>
        </h3>

        <div className="space-y-3 text-slate-700 leading-relaxed">
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
            <div className="font-bold text-blue-900 mb-1">
              Do I have to buy a cloud API or pay monthly subscriptions?
            </div>
            <p className="text-[11px] text-blue-950">
              No. Vikas Message Automator is designed with a strict zero-budget local architecture. You connect directly using WhatsApp Web Linked Devices on your existing Android or iPhone.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-900 mb-1">
              What happens if my Windows computer is turned off?
            </div>
            <p className="text-[11px] text-slate-600">
              Because this application runs locally without expensive cloud servers, your Windows computer must remain powered on with <code>start.bat</code> running for queued messages and automated follow-ups to execute.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="font-bold text-amber-900 mb-1">
              How does the system protect against WhatsApp account bans?
            </div>
            <p className="text-[11px] text-amber-900">
              Account restrictions occur when users report messages as spam. The automator mitigates this through three mandatory safeguards:
              1) <strong>Strict Consent Gate:</strong> Promotional broadcasts are blocked unless a contact is verified OPTED_IN.
              2) <strong>Smart Message Pacing:</strong> 10–20 second intervals with random jitter prevent burst spikes.
              3) <strong>Immediate Opt-Out:</strong> Any customer who replies STOP is suppressed automatically and excluded from all future broadcasts.
            </p>
          </div>
        </div>
      </div>

      {/* Office Contact Info */}
      <div className="bg-[#0b1329] text-white p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
            Distributor Helpdesk
          </div>
          <div className="text-base font-bold mt-0.5">VIKAS AUTOMOBILES, SATNA</div>
          <p className="text-xs text-slate-300 mt-1">
            Opp. Transport Nagar, Rewa Road / Maihar Bypass, Satna (M.P.) 485001
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Emergency & Dispatch Desk</div>
          <div className="text-lg font-bold font-mono text-emerald-400">9827003016</div>
        </div>
      </div>
    </div>
  );
};
