import React, { useState } from 'react';
import { Zap, Plus, Edit2, Trash2, CheckCircle2, X, Tag, UserCheck, FolderPlus, Bell } from 'lucide-react';
import { KeywordAutomation, ContactGroup } from '../../types';

interface KeywordAutomationViewProps {
  rules: KeywordAutomation[];
  groups: ContactGroup[];
  onSaveRule: (rule: KeywordAutomation) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onTestSimulation: (text: string) => void;
}

export const KeywordAutomationView: React.FC<KeywordAutomationViewProps> = ({
  rules,
  groups,
  onSaveRule,
  onDeleteRule,
  onTestSimulation,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<KeywordAutomation | null>(null);

  const [formData, setFormData] = useState<Partial<KeywordAutomation>>({
    title: '',
    keyword: '',
    matchType: 'CASE_INSENSITIVE',
    actions: {
      sendReply: '',
      addTag: '',
      addToGroup: '',
      notifyAdmin: true,
    },
    enabled: true,
  });

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData({
      title: '',
      keyword: '',
      matchType: 'CASE_INSENSITIVE',
      actions: {
        sendReply: '',
        addTag: '',
        addToGroup: '',
        notifyAdmin: true,
      },
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: KeywordAutomation) => {
    setEditingRule(rule);
    setFormData(rule);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.keyword) return;

    const saved: KeywordAutomation = {
      id: editingRule ? editingRule.id : 'ka-' + Date.now(),
      title: formData.title,
      keyword: formData.keyword.toUpperCase(),
      matchType: formData.matchType as any,
      actions: formData.actions || {},
      enabled: formData.enabled !== false,
      triggerCount: editingRule ? editingRule.triggerCount : 0,
    };

    await onSaveRule(saved);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Keyword Automation & Lead Routing Rules
          </h2>
          <p className="text-xs text-slate-500">
            Automate customer tagging, group assignment, and sales desk notifications on specific WhatsApp keywords.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Keyword Rule</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3.5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{rule.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {rule.triggerCount} triggers recorded
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Edit Rule"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete rule "${rule.title}"?`)) onDeleteRule(rule.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Trigger */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  WHEN MESSAGE CONTAINS:
                </span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                  {rule.keyword}
                </span>
              </div>

              {/* Actions List */}
              <div className="space-y-1.5 text-xs text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  THEN EXECUTE ACTIONS:
                </span>

                {rule.actions.sendReply && (
                  <div className="flex items-start gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded">
                    <span className="font-bold text-blue-600 shrink-0">REPLY:</span>
                    <span className="text-slate-600 line-clamp-2">{rule.actions.sendReply}</span>
                  </div>
                )}

                {rule.actions.addTag && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Tag: <strong className="font-mono text-blue-700">{rule.actions.addTag}</strong></span>
                  </div>
                )}

                {rule.actions.addToGroup && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add to Group: <strong>{groups.find(g => g.id === rule.actions.addToGroup)?.name || 'Group'}</strong></span>
                  </div>
                )}

                {rule.actions.notifyAdmin && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Notify Satna Sales Desk Admin</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {rule.enabled ? 'Active' : 'Paused'}
              </span>

              <button
                onClick={() => onTestSimulation(rule.keyword)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Test Rule →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs">
            <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingRule ? 'Edit Keyword Rule' : 'New Keyword Automation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route Price Inquiry"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Keyword *</label>
                  <input
                    type="text"
                    required
                    placeholder="PRICE"
                    value={formData.keyword || ''}
                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Match Type</label>
                  <select
                    value={formData.matchType}
                    onChange={(e) => setFormData({ ...formData, matchType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="CASE_INSENSITIVE">CASE INSENSITIVE</option>
                    <option value="PARTIAL">PARTIAL MATCH</option>
                    <option value="EXACT">EXACT MATCH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action: Send Reply Message</label>
                <textarea
                  rows={2}
                  placeholder="Automatic reply text..."
                  value={formData.actions?.sendReply || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    actions: { ...formData.actions, sendReply: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action: Add Customer Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. PRICE_ENQUIRY"
                    value={formData.actions?.addTag || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actions: { ...formData.actions, addTag: e.target.value.toUpperCase() }
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action: Add to Group</label>
                  <select
                    value={formData.actions?.addToGroup || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actions: { ...formData.actions, addToGroup: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">None</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notify-admin"
                  checked={formData.actions?.notifyAdmin !== false}
                  onChange={(e) => setFormData({
                    ...formData,
                    actions: { ...formData.actions, notifyAdmin: e.target.checked }
                  })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="notify-admin" className="font-semibold text-slate-700">
                  Notify Satna Office Administrator
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
