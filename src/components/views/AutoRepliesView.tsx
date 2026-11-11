import React, { useState } from 'react';
import { Bot, Plus, Edit2, Trash2, CheckCircle2, X, Clock, AlertCircle } from 'lucide-react';
import { AutoReplyRule } from '../../types';

interface AutoRepliesViewProps {
  autoReplies: AutoReplyRule[];
  onSaveReply: (rule: AutoReplyRule) => Promise<void>;
  onDeleteReply: (id: string) => Promise<void>;
}

export const AutoRepliesView: React.FC<AutoRepliesViewProps> = ({
  autoReplies,
  onSaveReply,
  onDeleteReply,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);

  const [formData, setFormData] = useState<Partial<AutoReplyRule>>({
    title: '',
    triggerKeyword: '',
    matchType: 'CONTAINS',
    response: '',
    priority: 1,
    isAwayOnly: false,
    enabled: true,
  });

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData({
      title: '',
      triggerKeyword: '',
      matchType: 'CONTAINS',
      response: '',
      priority: autoReplies.length + 1,
      isAwayOnly: false,
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setFormData(rule);
    setIsModalOpen(true);
  };

  const handleToggle = async (rule: AutoReplyRule) => {
    await onSaveReply({ ...rule, enabled: !rule.enabled });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.triggerKeyword || !formData.response) return;

    const ruleToSave: AutoReplyRule = {
      id: editingRule ? editingRule.id : 'ar-' + Date.now(),
      title: formData.title,
      triggerKeyword: formData.triggerKeyword.toUpperCase(),
      matchType: formData.matchType as any,
      response: formData.response,
      priority: formData.priority || 1,
      isAwayOnly: !!formData.isAwayOnly,
      enabled: formData.enabled !== false,
    };

    await onSaveReply(ruleToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Instant Auto Replies & Canned Responses
          </h2>
          <p className="text-xs text-slate-500">
            Automated WhatsApp responses for lubricant pricing, catalogue requests, and Satna warehouse location.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Auto Reply</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {autoReplies.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white p-5 rounded-xl border transition-all shadow-xs space-y-3 ${
              rule.enabled ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  rule.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">{rule.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>Priority: {rule.priority}</span>
                    <span>•</span>
                    <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">
                      {rule.matchType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(rule)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                    rule.enabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}
                >
                  {rule.enabled ? 'Active' : 'Disabled'}
                </button>
                <button
                  onClick={() => handleOpenEdit(rule)}
                  className="p-1 text-slate-400 hover:text-blue-600"
                  title="Edit Rule"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete rule "${rule.title}"?`)) onDeleteReply(rule.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600"
                  title="Delete Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Trigger Phrase:
              </div>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                {rule.triggerKeyword}
              </span>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Dispatched Response:
              </div>
              <p className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                {rule.response}
              </p>
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
                {editingRule ? 'Edit Auto Reply Rule' : 'New Auto Reply Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Price Inquiry Response"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trigger Keyword *</label>
                  <input
                    type="text"
                    required
                    placeholder="PRICE"
                    value={formData.triggerKeyword || ''}
                    onChange={(e) => setFormData({ ...formData, triggerKeyword: e.target.value })}
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
                    <option value="EXACT">EXACT MATCH</option>
                    <option value="CONTAINS">CONTAINS KEYWORD</option>
                    <option value="STARTS_WITH">STARTS WITH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Response Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Hello! Welcome to Vikas Automobiles..."
                  value={formData.response || ''}
                  onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Execution Priority</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.priority || 1}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="away-only"
                    checked={formData.isAwayOnly}
                    onChange={(e) => setFormData({ ...formData, isAwayOnly: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <label htmlFor="away-only" className="font-semibold text-slate-700">Outside Hours Only</label>
                </div>
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
