import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Play,
  Pause,
  Sliders,
  Clock,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Calendar,
  Layers,
  Lock,
  Hourglass,
  Activity,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { SmartPacingConfig, MessageQueueItem, PacingMode, PersistentPacingState } from '../../types';

interface SmartPacingViewProps {
  config: SmartPacingConfig;
  queue: MessageQueueItem[];
  pacingState?: PersistentPacingState | null;
  onUpdateConfig: (updates: Partial<SmartPacingConfig>) => Promise<void>;
  onSetMode: (mode: PacingMode) => Promise<void>;
  onClearQueue: () => Promise<void>;
}

export const SmartPacingView: React.FC<SmartPacingViewProps> = ({
  config,
  queue,
  pacingState,
  onUpdateConfig,
  onSetMode,
  onClearQueue,
}) => {
  const [minInterval, setMinInterval] = useState(config.minIntervalSeconds);
  const [batchSize, setBatchSize] = useState(config.batchSize);
  const [pauseMinutes, setPauseMinutes] = useState(config.pauseBetweenBatchesMinutes);
  const [dailyCap, setDailyCap] = useState(config.dailyCampaignCap);
  const [isSaving, setIsSaving] = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number | null>(null);

  // Sync state when config changes
  useEffect(() => {
    setMinInterval(config.minIntervalSeconds);
    setBatchSize(config.batchSize);
    setPauseMinutes(config.pauseBetweenBatchesMinutes);
    setDailyCap(config.dailyCampaignCap);
  }, [config]);

  // Live timer countdown for nextEligibleSendAt
  useEffect(() => {
    const updateCountdown = () => {
      if (pacingState?.nextEligibleSendAt) {
        const diffMs = new Date(pacingState.nextEligibleSendAt).getTime() - Date.now();
        const diffSec = Math.max(0, Math.ceil(diffMs / 1000));
        setSecondsUntilNext(diffSec);
      } else {
        setSecondsUntilNext(null);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 500);
    return () => clearInterval(timer);
  }, [pacingState?.nextEligibleSendAt]);

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateConfig({
        minIntervalSeconds: Number(minInterval),
        batchSize: Number(batchSize),
        pauseBetweenBatchesMinutes: Number(pauseMinutes),
        dailyCampaignCap: Number(dailyCap),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const pendingCount = queue.filter((q) => q.status === 'PENDING' || q.status === 'SCHEDULED').length;
  const processingCount = queue.filter((q) => q.status === 'PROCESSING').length;
  const sentCount = queue.filter((q) => q.status === 'SENT' || q.status === 'DELIVERED').length;
  const failedCount = queue.filter((q) => q.status === 'FAILED' || q.status === 'CANCELLED').length;

  const isAutoPaused = config.mode === 'PAUSED' || Boolean(pacingState?.autoPausedAt);
  const isBatchPauseActive =
    pacingState?.batchCompletedAt &&
    pacingState?.nextEligibleSendAt &&
    new Date(pacingState.nextEligibleSendAt).getTime() > Date.now();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                config.mode === 'AUTO'
                  ? 'bg-blue-100 text-blue-800'
                  : config.mode === 'MANUAL'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Mode: {config.mode}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Conservative Pacing: {config.minIntervalSeconds}s interval
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Smart Message Pacing & Persistent Scheduler
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Independent persistent timestamps, strict batch pauses from <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono">batchCompletedAt</code>, and automatic error pausing.
          </p>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
          <button
            onClick={() => onSetMode('AUTO')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              config.mode === 'AUTO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>AUTO</span>
          </button>
          <button
            onClick={() => onSetMode('MANUAL')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              config.mode === 'MANUAL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>MANUAL</span>
          </button>
          <button
            onClick={() => onSetMode('PAUSED')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              config.mode === 'PAUSED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>PAUSED</span>
          </button>
        </div>
      </div>

      {/* Automatic Safety Pause Alert Banner (if triggered) */}
      {isAutoPaused && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 text-xs text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-900 font-bold text-sm">
                Safety Pause Active (Pacing Halted)
              </strong>
              <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                {config.reasonForAdjustment || pacingState?.autoPauseReason || 'Queue is paused to prevent account flags.'}
              </p>
              <p className="text-[11px] text-amber-700/80 mt-1">
                Account protection policy: Automatic pausing halts outbound queue immediately on errors or restrictions. No sending interval is guaranteed safe.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSetMode('AUTO')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Resume Pacing Engine</span>
          </button>
        </div>
      )}

      {/* Conservative Policy & Safety Advisory */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-blue-900 font-bold">
            Account Protection & Pacing Discipline Policy:
          </strong>
          <p className="leading-relaxed text-[11px] text-blue-900">
            <strong>No sending interval is guaranteed safe.</strong> We do not use random delays as an account-protection guarantee.
            Account longevity relies on: (1) conservative, configurable rate limits, (2) strict verified recipient opt-in consent, (3) targeted relevance, and (4) immediate automatic pausing on any error or restriction.
          </p>
        </div>
      </div>

      {/* 6 Independent Persistent Timestamps Display */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm tracking-wide">Independent Persistent Timestamps (Database Scheduler)</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Persistent state in database.json
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. lastMessageSentAt */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              lastMessageSentAt
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1 truncate">
              {pacingState?.lastMessageSentAt
                ? new Date(pacingState.lastMessageSentAt).toLocaleTimeString()
                : 'None yet'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {pacingState?.lastMessageSentAt
                ? `${Math.floor((Date.now() - new Date(pacingState.lastMessageSentAt).getTime()) / 1000)}s ago`
                : 'Idle'}
            </div>
          </div>

          {/* 2. batchStartedAt */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              batchStartedAt
            </div>
            <div className="text-sm font-bold font-mono text-blue-300 mt-1 truncate">
              {pacingState?.batchStartedAt
                ? new Date(pacingState.batchStartedAt).toLocaleTimeString()
                : 'Between batches'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Batch: {pacingState?.currentBatchCount || 0} / {config.batchSize}
            </div>
          </div>

          {/* 3. batchCompletedAt */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              batchCompletedAt
            </div>
            <div className="text-sm font-bold font-mono text-amber-300 mt-1 truncate">
              {pacingState?.batchCompletedAt
                ? new Date(pacingState.batchCompletedAt).toLocaleTimeString()
                : 'None recorded'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isBatchPauseActive ? 'Batch Pause Active' : 'Normal Interval'}
            </div>
          </div>

          {/* 4. nextEligibleSendAt */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-blue-500/50 bg-blue-950/30">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 flex items-center justify-between">
              <span>nextEligibleSendAt</span>
              {secondsUntilNext !== null && secondsUntilNext > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              )}
            </div>
            <div className="text-sm font-bold font-mono text-white mt-1">
              {secondsUntilNext !== null && secondsUntilNext > 0 ? (
                <span className="text-blue-400">{secondsUntilNext}s</span>
              ) : (
                <span className="text-emerald-400">DUE NOW</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
              {pacingState?.nextEligibleSendAt
                ? new Date(pacingState.nextEligibleSendAt).toLocaleTimeString()
                : 'Immediate'}
            </div>
          </div>

          {/* 5. dailyCount */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              dailyCount
            </div>
            <div className="text-sm font-bold font-mono text-white mt-1">
              {pacingState?.dailyCount ?? 0}
              <span className="text-xs text-slate-400 font-normal"> / {config.dailyCampaignCap}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Cap limit per day
            </div>
          </div>

          {/* 6. dailyCounterDate */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              dailyCounterDate
            </div>
            <div className="text-sm font-bold font-mono text-indigo-300 mt-1 truncate">
              {pacingState?.dailyCounterDate || new Date().toISOString().slice(0, 10)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Resets at 00:00 UTC/IST
            </div>
          </div>
        </div>
      </div>

      {/* The 8 Mandatory Sending Checks Status Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              The 8 Mandatory Sending Verification Checks
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Evaluated per message
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Campaign is RUNNING</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Blocks sends if campaign is PAUSED, DRAFT or CANCELLED.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Message is Eligible</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Status must be PENDING/SCHEDULED and time arrived.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Verified Consent</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Promotional sends strictly require OPTED_IN permission.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">4</span>
              <span>Not Suppressed</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Verifies recipient has not opted out or requested STOP.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">5</span>
              <span>Working Hours</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Permits sending only between {config.workingHoursStart} and {config.workingHoursEnd}.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">6</span>
              <span>Daily Limits Permit</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Checks persistent dailyCount against {config.dailyCampaignCap} cap.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">7</span>
              <span>Scheduled Action Due</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Verifies nextEligibleSendAt from batchCompletedAt has passed.</p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">8</span>
              <span>Atomic Worker Claim</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Prevents double-sending with exclusive atomic claim lock.</p>
          </div>
        </div>
      </div>

      {/* Manual Configuration & Queue Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Settings Box */}
        <div className="md:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Conservative Pacing Parameters</span>
          </h3>

          <form onSubmit={handleSaveManual} className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Minimum Interval Between Messages (Seconds)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={minInterval}
                onChange={(e) => setMinInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Conservative default: 15s - 30s. No delay guarantees safety.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Size</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 10 messages</span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pause After Batch (Min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={pauseMinutes}
                  onChange={(e) => setPauseMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">From batchCompletedAt</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Daily Broadcast Cap</label>
              <input
                type="number"
                min={20}
                max={500}
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Hard daily limit. Automatically halts queue once reached.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Update Pacing Configuration'}
            </button>
          </form>
        </div>

        {/* Live Queue Box */}
        <div className="md:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Persistent Message Queue</h3>
              <p className="text-[11px] text-slate-500">
                {config.reasonForAdjustment || 'Pacing engine active and listening to persistent queue.'}
              </p>
            </div>
            {queue.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all pending queue items?')) onClearQueue();
                }}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Queue</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-slate-100">
            {queue.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Queue is empty. No outgoing messages currently waiting.
              </div>
            ) : (
              queue.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.customerName}</span>
                      <span className="font-mono text-[10px] text-slate-500">{item.phone}</span>
                      {item.claimedBy && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                          {item.claimedBy}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5 font-sans">
                      {item.content}
                    </p>
                    {item.failureReason && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                        {item.failureReason}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      item.status === 'SENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'PROCESSING'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : item.status === 'FAILED' || item.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
