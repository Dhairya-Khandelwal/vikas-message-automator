import React, { useState } from 'react';
import { FileText, Plus, Edit2, Trash2, Copy, Check, X, Tag } from 'lucide-react';
import { MessageTemplate } from '../../types';

interface MessageTemplatesViewProps {
  templates: MessageTemplate[];
  onSaveTemplate: (tpl: Partial<MessageTemplate>) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export const MessageTemplatesView: React.FC<MessageTemplatesViewProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Product Availability');
  const [body, setBody] = useState('');

  const categories = [
    'Product Availability',
    'New Lubricant Launch',
    'Dealer Offers',
    'Mechanic Promotions',
    'Payment Reminders',
    'Festival Greetings',
    'General',
  ];

  const filteredTemplates = selectedCategory === 'All'
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName('');
    setCategory('Product Availability');
    setBody('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setCategory(t.category);
    setBody(t.body);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (t: MessageTemplate) => {
    await onSaveTemplate({
      name: `${t.name} (Copy)`,
      category: t.category,
      body: t.body,
      variables: t.variables,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;

    await onSaveTemplate({
      id: editingTemplate?.id,
      name,
      category,
      body,
      variables: ['name', 'city', 'business', 'product'],
    });

    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            HP Lubricants Message Templates Library
          </h2>
          <p className="text-xs text-slate-500">
            Pre-configured templates for Milcy Turbo, Racer 4 coupon promotions, dealer schemes, and payment reminders.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Templates ({templates.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {tpl.category}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Duplicate Template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(tpl)}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Edit Template"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete template "${tpl.name}"?`)) onDeleteTemplate(tpl.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-xs text-slate-900">{tpl.name}</h3>

              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed font-sans min-h-[90px]">
                {tpl.body}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Local WhatsApp Web Format</span>
              <span className="font-mono">{tpl.variables?.length || 4} dynamic variables</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs">
            <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingTemplate ? 'Edit Message Template' : 'Create Message Template'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon Dealer Rebate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Template Message Body *</label>
                  <div className="flex gap-1 text-[10px] text-slate-500">
                    <span className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'{{name}}'}</span>
                    <span className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'{{business}}'}</span>
                    <span className="bg-slate-100 px-1 py-0.5 rounded font-mono">{'{{city}}'}</span>
                  </div>
                </div>
                <textarea
                  rows={5}
                  required
                  placeholder="Dear {{name}}, greetings from Vikas Automobiles..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-sans leading-relaxed"
                />
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
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
