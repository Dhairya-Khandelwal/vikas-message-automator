import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Users,
  ShieldCheck,
  Ban,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { ContactGroup, Contact } from '../../types';

interface ContactGroupsViewProps {
  groups: ContactGroup[];
  contacts: Contact[];
  onCreateGroup: (name: string, description: string, contactIds: string[]) => Promise<void>;
  onUpdateGroup: (id: string, updates: Partial<ContactGroup>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

export const ContactGroupsView: React.FC<ContactGroupsViewProps> = ({
  groups,
  contacts,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<ContactGroup | null>(groups[0] || null);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setName('');
    setDescription('');
    setSelectedContactIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description);
    setSelectedContactIds(group.contactIds || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingGroup) {
      await onUpdateGroup(editingGroup.id, { name, description, contactIds: selectedContactIds });
    } else {
      await onCreateGroup(name, description, selectedContactIds);
    }
    setIsModalOpen(false);
  };

  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((cid) => cid !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Customer Segmentation & Contact Groups
          </h2>
          <p className="text-xs text-slate-500">
            Group retailers, mechanics, workshops, and industrial fleets for segmented broadcasts.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {groups.map((group) => {
          const groupContacts = contacts.filter((c) => group.contactIds.includes(c.id));
          const optedInCount = groupContacts.filter((c) => c.consentStatus === 'OPTED_IN').length;
          const ineligibleCount = groupContacts.length - optedInCount;

          return (
            <div
              key={group.id}
              onClick={() => setSelectedGroupDetails(group)}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
                selectedGroupDetails?.id === group.id
                  ? 'border-blue-600 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(group);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    title="Edit Group"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete group "${group.name}"?`)) onDeleteGroup(group.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete Group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-xs truncate">{group.name}</h3>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                {group.description || 'Customer segment for targeted updates.'}
              </p>

              {/* Counts & Ineligible Exclusion Metric */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Total Members</span>
                  <span className="font-bold text-slate-800">{group.contactIds.length}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-600 block font-sans">Eligible (Opted In)</span>
                  <span className="font-bold text-emerald-700">{optedInCount}</span>
                </div>
              </div>

              {ineligibleCount > 0 && (
                <div className="mt-2 text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  <span>{ineligibleCount} non-consented (auto-excluded)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Group Contacts Inspector */}
      {selectedGroupDetails && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Members of: {selectedGroupDetails.name}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedGroupDetails.description}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Name & Business</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Consent Status</th>
                  <th className="py-2.5 px-3">Campaign Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.filter((c) => selectedGroupDetails.contactIds.includes(c.id)).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {c.name} {c.businessName ? `(${c.businessName})` : ''}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{c.category}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-2 px-3 text-slate-600">{c.city}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.consentStatus === 'OPTED_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.consentStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {c.consentStatus === 'OPTED_IN' ? (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Eligible to receive broadcasts</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5 text-rose-600" />
                          <span>Excluded by consent rule</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs">
            <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingGroup ? 'Edit Contact Group' : 'Create Contact Group'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Satna Tractor Garages"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Group purpose or criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Contacts to Include ({selectedContactIds.length} selected):
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50 p-2">
                  {contacts.map((c) => {
                    const checked = selectedContactIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleContact(c.id)}
                          className="rounded text-blue-600"
                        />
                        <span className="font-medium text-slate-800">{c.name}</span>
                        <span className="text-[11px] text-slate-400">({c.businessName || c.category})</span>
                        <span className="text-[10px] ml-auto font-mono text-slate-500">{c.phone}</span>
                      </label>
                    );
                  })}
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
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
