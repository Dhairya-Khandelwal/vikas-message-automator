import React, { useState } from 'react';
import {
  ShieldCheck,
  Ban,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  Search,
} from 'lucide-react';
import { ConsentRecord, Contact } from '../../types';

interface ConsentManagerViewProps {
  contacts: Contact[];
  consentRecords: ConsentRecord[];
  onOpenRegisterConsent: () => void;
  onManualOptOut: (phone: string, reason?: string) => Promise<void>;
}

export const ConsentManagerView: React.FC<ConsentManagerViewProps> = ({
  contacts,
  consentRecords,
  onOpenRegisterConsent,
  onManualOptOut,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [optOutPhone, setOptOutPhone] = useState('');
  const [optOutReason, setOptOutReason] = useState('Customer verbal request at Satna counter');

  const stats = {
    total: contacts.length,
    optedIn: contacts.filter((c) => c.consentStatus === 'OPTED_IN').length,
    pending: contacts.filter((c) => c.consentStatus === 'PENDING').length,
    notGiven: contacts.filter((c) => c.consentStatus === 'NOT_GIVEN').length,
    optedOut: contacts.filter((c) => c.consentStatus === 'OPTED_OUT').length,
    expired: contacts.filter((c) => c.consentStatus === 'EXPIRED').length,
    blocked: contacts.filter((c) => c.consentStatus === 'BLOCKED').length,
  };

  const filteredRecords = consentRecords.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = r.customerName.toLowerCase().includes(q) || r.phone.includes(q) || (r.consentSource || '').toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'All' || r.consentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOptOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optOutPhone.trim()) return;
    if (confirm(`Immediately suppress and opt-out ${optOutPhone}? All scheduled promotional messages will be cancelled.`)) {
      await onManualOptOut(optOutPhone.trim(), optOutReason);
      setOptOutPhone('');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
              Statutory Enforcement Active
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Wording Version: v1.2 - 2026 Statutory Compliance
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Customer Permission & Consent Manager
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Promotional broadcasts are locked until explicit, documented consent is verified. All opt-outs via WhatsApp triggers (STOP, UNSUBSCRIBE) are suppressed immediately.
          </p>
        </div>

        <button
          onClick={onOpenRegisterConsent}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-500/20 shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Register New Customer Opt-In</span>
        </button>
      </div>

      {/* Consent Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
            <span>OPTED_IN</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{stats.optedIn}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Eligible for broadcasts</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
            <span>PENDING</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{stats.pending}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Awaiting customer action</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold">
            <span>NOT_GIVEN</span>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-1">{stats.notGiven}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Default on imports</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold">
            <span>OPTED_OUT</span>
            <Ban className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">{stats.optedOut}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Suppressed permanently</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold">
            <span>EXPIRED</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-1">{stats.expired}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Consent past renewal</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold">
            <span>BLOCKED</span>
            <Ban className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-1">{stats.blocked}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Administrative stop</div>
        </div>
      </div>

      {/* Consent Review Timer Explanation & Manual Opt-out Drawer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Day 0, Day 3, Day 7 Lifecycle */}
        <div className="md:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Consent Review Timer & Lifecycle Rules</span>
          </h3>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-bold text-slate-900 mb-1">Day 0 (Initial)</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Check whether valid permission exists. If permission is missing, block all promotional messaging immediately.
              </p>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <div className="font-bold text-amber-900 mb-1">Day 3 (Review)</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Show administrator reminder badge for pending consent. No repetitive messages sent to customer.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-bold text-slate-900 mb-1">Day 7 (Inactivation)</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Mark consent invitation as inactive. Never automatically opt the customer in. Maintain strict suppression.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
            <strong>Mandatory Legal Text Wording:</strong>
            <p className="italic mt-1 text-slate-700">
              "I agree to receive promotional updates, product availability information, offers and business communications from Vikas Automobiles through WhatsApp. I understand that I can withdraw my consent at any time."
            </p>
          </div>
        </div>

        {/* Manual Opt-Out Box */}
        <div className="md:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-600" />
            <span>Immediate Number Suppression</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Instantly suppress a number upon verbal or paper opt-out. Cancels all pending broadcasts and follow-ups.
          </p>

          <form onSubmit={handleOptOutSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">WhatsApp Number</label>
              <input
                type="text"
                placeholder="+91 9827003016"
                value={optOutPhone}
                onChange={(e) => setOptOutPhone(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Opt-Out Evidence / Reason</label>
              <input
                type="text"
                value={optOutReason}
                onChange={(e) => setOptOutReason(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition-colors"
            >
              Suppress Number & Cancel Queued Messages
            </button>
          </form>
        </div>
      </div>

      {/* Consent Audit Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Verified Consent Records & Suppression List ({filteredRecords.length})
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search consent logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md bg-white"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="OPTED_IN">OPTED_IN</option>
              <option value="OPTED_OUT">OPTED_OUT</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-4">Customer Name & Phone</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Consent Source</th>
                <th className="py-2.5 px-4">Evidence Document</th>
                <th className="py-2.5 px-4">Wording Version</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{r.customerName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.phone}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.consentStatus === 'OPTED_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.consentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{r.consentSource}</td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-[200px]" title={r.consentEvidence}>
                      {r.consentEvidence}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">
                      {r.consentWordingVersion}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(r.consentDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
