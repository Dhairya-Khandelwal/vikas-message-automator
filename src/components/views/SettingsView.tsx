import React, { useState } from 'react';
import {
  Settings,
  Building,
  Phone,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle2,
  HardDrive,
  RotateCcw,
} from 'lucide-react';

interface SettingsViewProps {
  settings: any;
  onUpdateSettings: (settings: any) => Promise<void>;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetDemoData,
}) => {
  const [formData, setFormData] = useState({
    businessName: settings?.businessName || 'VIKAS AUTOMOBILES',
    businessType: settings?.businessType || 'HP LUBE DISTRIBUTOR & C&F AGENT',
    location: settings?.location || 'Satna, Madhya Pradesh, India',
    contactNumber: settings?.contactNumber || '9827003016',
    gstin: settings?.gstin || '23AABCV1234F1Z9',
    address: settings?.address || 'Opp. Transport Nagar, Rewa Road / Semariya Chowk, Satna (M.P.) 485001',
    workingHoursStart: settings?.workingHoursStart || '09:00',
    workingHoursEnd: settings?.workingHoursEnd || '20:00',
    optOutKeywords: (settings?.optOutKeywords || ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'NO MORE', 'REMOVE', 'OPT OUT']).join(', '),
    environment: (settings?.environment as 'DEMO' | 'LIVE') || 'DEMO',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const keywords = formData.optOutKeywords.split(',').map((k: string) => k.trim().toUpperCase()).filter(Boolean);
      await onUpdateSettings({
        ...formData,
        optOutKeywords: keywords,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            System & Business Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Manage distributor profile for Vikas Automobiles, operating hours, and automatic opt-out keywords.
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Environment Selection */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-600" />
              <span>Operational Environment</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                formData.environment === 'LIVE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {formData.environment === 'LIVE' ? 'LIVE PRODUCTION' : 'DEMO MODE'}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`p-3.5 rounded-lg border-2 cursor-pointer flex items-start gap-3 transition-colors ${
                formData.environment === 'DEMO'
                  ? 'border-amber-500 bg-amber-50/50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="environment"
                value="DEMO"
                checked={formData.environment === 'DEMO'}
                onChange={() => setFormData({ ...formData, environment: 'DEMO' })}
                className="mt-0.5 text-amber-600"
              />
              <div>
                <p className="font-bold text-slate-900 text-xs">Demo Simulation Mode</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Preloaded sample customers, simulated inbound test triggers, and safe testing sandbox.
                </p>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-lg border-2 cursor-pointer flex items-start gap-3 transition-colors ${
                formData.environment === 'LIVE'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="environment"
                value="LIVE"
                checked={formData.environment === 'LIVE'}
                onChange={() => setFormData({ ...formData, environment: 'LIVE' })}
                className="mt-0.5 text-emerald-600"
              />
              <div>
                <p className="font-bold text-slate-900 text-xs">Live Production Environment</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Zero test data. Exclusively real WhatsApp contacts, verified statutory opt-ins, and authentic dispatch receipts.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Business Profile */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Distributor Business Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Firm Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Classification</label>
              <input
                type="text"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Satna Office Mobile</label>
              <input
                type="text"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location / Hub</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warehouse Address (M.P.)</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Operating Window & Regulatory Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Broadcast Business Hours</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Pacing engine automatically holds promotional queues outside these hours.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Window Open (IST)</label>
                <input
                  type="time"
                  value={formData.workingHoursStart}
                  onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Window Close (IST)</label>
                <input
                  type="time"
                  value={formData.workingHoursEnd}
                  onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Opt-Out Trigger Keywords</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Comma-separated triggers that immediately place incoming sender numbers on the suppression list.
            </p>

            <div>
              <input
                type="text"
                value={formData.optOutKeywords}
                onChange={(e) => setFormData({ ...formData, optOutKeywords: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default: STOP, UNSUBSCRIBE, CANCEL, NO MORE, REMOVE, OPT OUT
              </span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="px-4 py-2 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Factory Reset Demo Data</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
