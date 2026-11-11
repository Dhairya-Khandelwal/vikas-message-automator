import React, { useState } from 'react';
import {
  Send,
  Plus,
  ShieldCheck,
  Pause,
  Play,
  XCircle,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  ArrowRight,
  Eye,
  Check,
} from 'lucide-react';
import { Campaign, ContactGroup, Contact, MessageTemplate } from '../../types';

interface BulkCampaignsViewProps {
  campaigns: Campaign[];
  groups: ContactGroup[];
  contacts: Contact[];
  templates: MessageTemplate[];
  onCreateCampaign: (payload: any) => Promise<void>;
  onPauseCampaign: (id: string) => Promise<void>;
  onResumeCampaign?: (id: string) => Promise<void>;
  onCancelCampaign: (id: string) => Promise<void>;
  onCheckSafety: (payload: any) => Promise<any>;
  onOpenSafetyModal: (campaignName: string, safetyData: any, launchFn: () => Promise<void>) => void;
}

export const BulkCampaignsView: React.FC<BulkCampaignsViewProps> = ({
  campaigns,
  groups,
  contacts,
  templates,
  onCreateCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onCancelCampaign,
  onCheckSafety,
  onOpenSafetyModal,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['g-4']);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('t-1');
  const [customMessage, setCustomMessage] = useState('');
  const [previewContact, setPreviewContact] = useState<Contact>(contacts[0] || {} as any);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const rawText = customMessage || selectedTemplate?.body || '';

  // Personalized preview text
  const previewText = rawText
    .replace(/\{\{name\}\}/gi, previewContact.name || 'Ramesh Patel')
    .replace(/\{\{city\}\}/gi, previewContact.city || 'Satna')
    .replace(/\{\{business\}\}/gi, previewContact.businessName || 'Patel Auto Garage')
    .replace(/\{\{product\}\}/gi, previewContact.productInterest || 'HP Milcy Turbo 15W-40');

  const handleLaunchFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Run Campaign Safety Check calculation
    const safetyRes = await onCheckSafety({
      targetGroupIds: selectedGroups,
    });

    if (safetyRes.success) {
      onOpenSafetyModal(name, safetyRes.data, async () => {
        await onCreateCampaign({
          name,
          targetGroupIds: selectedGroups,
          templateId: selectedTemplateId,
          customMessage: rawText,
          launchNow: true,
        });
        setIsCreateOpen(false);
        setName('');
      });
    }
  };

  const toggleGroup = (id: string) => {
    if (selectedGroups.includes(id)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== id));
    } else {
      setSelectedGroups([...selectedGroups, id]);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Bulk Campaign Broadcast Manager
          </h2>
          <p className="text-xs text-slate-500">
            Segmented promotional campaigns with personalized tags and mandatory pre-send statutory screening.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Bulk Campaign</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((camp) => {
          const total = camp.stats.totalTargeted || 1;
          const sent = camp.stats.sent || 0;
          const progressPercent = Math.min(100, Math.round((sent / (camp.stats.eligibleOptedIn || 1)) * 100));

          return (
            <div key={camp.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{camp.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      camp.status === 'RUNNING'
                        ? 'bg-blue-100 text-blue-800'
                        : camp.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : camp.status === 'PAUSED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Created on {new Date(camp.createdAt).toLocaleDateString()} • Vikas Automobiles Satna
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {camp.status === 'RUNNING' && (
                    <button
                      onClick={() => onPauseCampaign(camp.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1 hover:bg-amber-100"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  {camp.status === 'PAUSED' && onResumeCampaign && (
                    <button
                      onClick={() => onResumeCampaign(camp.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                  )}
                  {camp.status !== 'COMPLETED' && camp.status !== 'CANCELLED' && (
                    <button
                      onClick={() => onCancelCampaign(camp.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1 hover:bg-rose-100"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Selected</span>
                  <span className="font-bold font-mono text-slate-800 text-base">{camp.stats.totalTargeted}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Eligible Opted-In</span>
                  <span className="font-bold font-mono text-emerald-700 text-base">{camp.stats.eligibleOptedIn}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-[10px] text-amber-700 font-semibold uppercase block">Pending Blocked</span>
                  <span className="font-bold font-mono text-amber-700 text-base">{camp.stats.pendingConsentBlocked}</span>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-rose-700 font-semibold uppercase block">Opted-Out Suppressed</span>
                  <span className="font-bold font-mono text-rose-700 text-base">{camp.stats.optedOutBlocked}</span>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-blue-700 font-semibold uppercase block">Sent & Delivered</span>
                  <span className="font-bold font-mono text-blue-700 text-base">{camp.stats.sent}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Dispatch Progress ({sent} of {camp.stats.eligibleOptedIn} eligible)</span>
                  <span className="font-mono font-bold text-slate-700">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Campaign Creation Drawer / Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs">
            <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Create New WhatsApp Bulk Campaign</h3>
                <p className="text-[11px] text-slate-400">Step 1 of 2: Audience & Template Configuration</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunchFlow} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali HP Milcy Turbo Booking Offer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Target Groups */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Target Contact Groups:
                </label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50 max-h-36 overflow-y-auto">
                  {groups.map((g) => {
                    const checked = selectedGroups.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded cursor-pointer hover:border-blue-400">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGroup(g.id)}
                          className="rounded text-blue-600"
                        />
                        <span className="font-medium text-slate-800 truncate">{g.name}</span>
                        <span className="text-[10px] text-slate-400 ml-auto font-mono">({g.contactIds.length})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Message Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value);
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) setCustomMessage(tpl.body);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Message Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Message Content</label>
                  <div className="flex gap-1 text-[10px] text-slate-500">
                    <span className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'{{name}}'}</span>
                    <span className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'{{city}}'}</span>
                    <span className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'{{business}}'}</span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-sans leading-relaxed"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                  Simulated WhatsApp Recipient Preview:
                </span>
                <p className="text-[11px] text-slate-800 bg-white p-3 rounded-lg border border-blue-100 leading-relaxed shadow-2xs">
                  {previewText}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <span>Proceed to Safety Screen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
