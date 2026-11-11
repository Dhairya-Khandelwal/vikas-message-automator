import React from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Wifi,
  AlertOctagon,
  Info,
} from 'lucide-react';
import { AccountHealth } from '../../types';

interface AccountHealthViewProps {
  health: AccountHealth;
  onRefresh: () => void;
}

export const AccountHealthView: React.FC<AccountHealthViewProps> = ({ health, onRefresh }) => {
  const getBadge = () => {
    switch (health?.status) {
      case 'GREEN':
        return {
          bg: 'bg-emerald-500',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          cardBg: 'bg-emerald-50/40',
          label: 'MONITORED CHECKS HEALTHY (GREEN)',
          sub: health.statusReason || 'Connection established, no monitored errors.',
          notice:
            'Notice: GREEN means only that local monitored technical checks are healthy (socket online, keys valid, queue nominal). It does NOT imply that WhatsApp guarantees unrestricted sending or immunity from spam heuristic blocks.',
        };
      case 'YELLOW':
        return {
          bg: 'bg-amber-500',
          text: 'text-amber-700',
          border: 'border-amber-200',
          cardBg: 'bg-amber-50/40',
          label: 'SENDING PAUSED / CAUTION (YELLOW)',
          sub: health.statusReason || 'Sending paused for investigation or safety thresholds reached.',
          notice:
            'Caution: Outbound queue has been paused by administrator or safety limiter. Review queue items and error rates prior to resuming.',
        };
      case 'RED':
        return {
          bg: 'bg-rose-500',
          text: 'text-rose-700',
          border: 'border-rose-200',
          cardBg: 'bg-rose-50/40',
          label: health.connectionStatus === 'CONNECTED' ? 'REPEATED FAILURES (RED)' : 'NOT CONNECTED (RED)',
          sub: health.statusReason || 'WhatsApp device is not connected or repeated connection failures occurred.',
          notice:
            'Alert: The application does not assume GREEN health on startup. Dispatches are blocked until an authentic WhatsApp session is linked and active.',
        };
      default:
        return {
          bg: 'bg-slate-500',
          text: 'text-slate-700',
          border: 'border-slate-200',
          cardBg: 'bg-slate-50',
          label: 'INSUFFICIENT INFORMATION (UNKNOWN)',
          sub: health?.statusReason || 'Insufficient technical telemetry to evaluate account health.',
          notice:
            'Telemetric checks unavailable or initializing. Awaiting local socket status verification.',
        };
    }
  };

  const badge = getBadge();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-xs">
      {/* Health Status Header */}
      <div className={`p-6 rounded-xl border bg-white shadow-xs space-y-3 ${badge.border}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full ${badge.bg} animate-pulse`} />
            <div>
              <h2 className="text-base font-bold text-slate-900">{badge.label}</h2>
              <p className="text-xs text-slate-500">{badge.sub}</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 self-start sm:self-auto"
          >
            Refresh Health Audit
          </button>
        </div>

        {/* Status Specific Notice */}
        <div className={`text-[11px] p-3 rounded-lg border leading-relaxed ${badge.cardBg} ${badge.border} ${badge.text}`}>
          {badge.notice}
        </div>

        {/* Genuine Indicators Specification Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Genuine Health Indicators Specification (Requirement 33)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">No Auto-Green on Boot</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px]">
                  <th className="pb-1">Condition</th>
                  <th className="pb-1">Health State</th>
                  <th className="pb-1">Operational Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className={health.status === 'RED' && health.connectionStatus !== 'CONNECTED' ? 'bg-rose-50 font-semibold text-rose-900' : ''}>
                  <td className="py-1.5">Not connected</td>
                  <td className="py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">RED</span></td>
                  <td className="py-1.5">WhatsApp device unlinked or socket offline. No dispatches permitted.</td>
                </tr>
                <tr className={health.status === 'RED' && health.recentConnectionFailures > 0 ? 'bg-rose-50 font-semibold text-rose-900' : ''}>
                  <td className="py-1.5">Repeated connection failures</td>
                  <td className="py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">RED</span></td>
                  <td className="py-1.5">Repeated socket errors or expired session. Re-authentication required.</td>
                </tr>
                <tr className={health.status === 'YELLOW' ? 'bg-amber-50 font-semibold text-amber-900' : ''}>
                  <td className="py-1.5">Sending paused for investigation</td>
                  <td className="py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">YELLOW</span></td>
                  <td className="py-1.5">Pacing paused by admin, safety limit reached, or high block rate.</td>
                </tr>
                <tr className={health.status === 'GREEN' ? 'bg-emerald-50 font-semibold text-emerald-900' : ''}>
                  <td className="py-1.5">Connection established, no errors</td>
                  <td className="py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">GREEN</span></td>
                  <td className="py-1.5">Local monitored technical checks are healthy. <em>(Does not guarantee unrestricted sending).</em></td>
                </tr>
                <tr className={health.status === 'UNKNOWN' ? 'bg-slate-100 font-semibold text-slate-900' : ''}>
                  <td className="py-1.5">Insufficient information</td>
                  <td className="py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-bold">UNKNOWN</span></td>
                  <td className="py-1.5">Awaiting local socket handshake or telemetry metrics.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-1">
            * Note: Even GREEN means only that monitored technical checks are healthy. It never implies that WhatsApp guarantees unrestricted sending.
          </p>
        </div>
      </div>

      {/* Operational Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Connection State</span>
          <div className="text-sm font-bold text-slate-900 font-mono">{health.connectionStatus}</div>
          <span className="text-[10px] text-slate-500">Local WhatsApp Web Socket</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Authentication</span>
          <div className="text-sm font-bold text-emerald-700 font-mono">{health.authenticationStatus}</div>
          <span className="text-[10px] text-slate-500">Pairing keys stored locally</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Message Queue Health</span>
          <div className="text-sm font-bold text-slate-900">{health.queueStatus}</div>
          <span className="text-[10px] text-slate-500">Pacing rate limiter active</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Active Campaigns</span>
          <div className="text-sm font-bold text-slate-900 font-mono">
            {health.activeCampaigns} Running / {health.pausedCampaigns} Paused
          </div>
          <span className="text-[10px] text-slate-500">Promotional dispatches</span>
        </div>
      </div>

      {/* Warnings & Risk Reduction Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Active System Warnings ({health.warnings.length})</span>
          </h3>

          {health.warnings.length === 0 ? (
            <div className="p-4 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All verifiable systems operating within nominal parameters.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {health.warnings.map((w, i) => (
                <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Best Practices to Prevent WhatsApp Flags</span>
          </h3>

          <ul className="space-y-2 text-[11px] text-slate-700 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Never blast unsolicited messages:</strong> Only message mechanics, workshops, and retailers who have provided documented opt-in permission.
            </li>
            <li>
              <strong>Maintain 10–20s pacing intervals:</strong> Never bypass the Smart Message Pacing Engine. Spikes of 50+ messages in seconds trigger automated heuristic blocks.
            </li>
            <li>
              <strong>Immediately honor STOP triggers:</strong> The application automatically cancels pending messages for opt-outs. Never override this.
            </li>
            <li>
              <strong>Respect Business Hours:</strong> Keep dispatches restricted to normal Indian operating hours (09:00 AM to 08:00 PM).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
