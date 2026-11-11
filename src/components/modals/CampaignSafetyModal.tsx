import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle, Ban, Clock, Check } from 'lucide-react';

interface CampaignSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  safetyData: {
    totalSelected: number;
    eligibleOptedInCount: number;
    eligibleContacts: any[];
    pendingConsentCount: number;
    notGivenCount: number;
    optedOutCount: number;
    blockedOrExpiredCount: number;
    invalidNumberCount: number;
    safeToSend: boolean;
    policyNotice: string;
  } | null;
  onConfirmLaunch: () => Promise<void>;
}

export const CampaignSafetyModal: React.FC<CampaignSafetyModalProps> = ({
  isOpen,
  onClose,
  campaignName,
  safetyData,
  onConfirmLaunch,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  if (!isOpen || !safetyData) return null;

  const handleLaunch = async () => {
    if (!confirmed || safetyData.eligibleOptedInCount === 0) return;
    setIsLaunching(true);
    try {
      await onConfirmLaunch();
      onClose();
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Campaign Safety Verification Screen</h2>
              <p className="text-xs text-slate-400">Pre-Dispatch Legal Consent & Eligibility Audit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-800">
              Campaign: <span className="text-blue-600">{campaignName}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Targeted recipients have undergone automated statutory permission verification.
            </p>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-emerald-700">Eligible</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono">{safetyData.eligibleOptedInCount}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">Verified Opt-In</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-amber-700">Pending</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold font-mono">{safetyData.pendingConsentCount}</div>
              <div className="text-[10px] text-amber-600 mt-0.5 font-medium">Blocked (No Opt-in)</div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-rose-700">Opted Out</span>
                <Ban className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-xl font-bold font-mono">{safetyData.optedOutCount}</div>
              <div className="text-[10px] text-rose-600 mt-0.5 font-medium">Permanent Suppression</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Not Given</span>
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-bold font-mono">{safetyData.notGivenCount + safetyData.blockedOrExpiredCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Blocked from Queue</div>
            </div>
          </div>

          {/* Policy Compliance Callout */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-xs text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Automated Backend Policy Enforcement Active</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              {safetyData.policyNotice} Non-consented contacts (Pending, Not Given, and Opted Out) are
              filtered out immediately. Only the <strong>{safetyData.eligibleOptedInCount} verified opted-in</strong> contacts will be enqueued.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] font-medium text-blue-700">
              <span>Estimated Third-Party Cost:</span>
              <span className="font-bold text-emerald-700">₹0.00 (Zero Cost Local Linked Device)</span>
            </div>
          </div>

          {/* List of Eligible Recipients Preview */}
          {safetyData.eligibleOptedInCount > 0 && (
            <div>
              <div className="font-semibold text-slate-700 mb-1">
                Eligible Queue Recipients ({safetyData.eligibleOptedInCount}):
              </div>
              <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50">
                {safetyData.eligibleContacts.map((c: any) => (
                  <div key={c.id} className="p-2 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-800">{c.name} ({c.city})</span>
                    <span className="font-mono text-slate-500">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Administrator Confirmation Checkbox */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-3 space-y-1">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="admin-launch-confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="admin-launch-confirm" className="font-medium text-slate-800 cursor-pointer select-none">
                I confirm as Administrator that only contacts with verified promotional consent will be queued, and that pacing rate limits will be respected.
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!confirmed || safetyData.eligibleOptedInCount === 0 || isLaunching}
            className={`px-5 py-2 text-xs font-bold rounded-lg text-white flex items-center gap-1.5 transition-all shadow-sm ${
              confirmed && safetyData.eligibleOptedInCount > 0
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{isLaunching ? 'Dispatching to Queue...' : `Confirm & Enqueue (${safetyData.eligibleOptedInCount})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
