import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit2,
  ShieldCheck,
  Ban,
  Clock,
  AlertCircle,
  Tag,
  Phone,
  Building,
  MapPin,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Contact, CustomerCategory, ConsentStatus } from '../../types';

interface ContactsViewProps {
  contacts: Contact[];
  currentUserRole: string;
  onAddContact: (contact: Partial<Contact>) => Promise<void>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onImportContacts: (contacts: any[]) => Promise<void>;
  onOpenInboxWithContact?: (contactId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  currentUserRole,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onImportContacts,
  onOpenInboxWithContact,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [consentFilter, setConsentFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    phone: '+91 ',
    businessName: '',
    city: 'Satna',
    category: 'Workshops',
    productInterest: 'HP Milcy Turbo 15W-40',
    notes: '',
    tags: [],
    consentStatus: 'NOT_GIVEN',
    consentSource: 'Manual Direct Entry',
    consentEvidence: '',
  });

  const categories: CustomerCategory[] = [
    'Retailers',
    'Mechanics',
    'Workshops',
    'Automobile Dealers',
    'Distributors',
    'Industrial Customers',
    'Individual Customers',
    'Other',
  ];

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.businessName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.productInterest.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    const matchesConsent = consentFilter === 'All' || c.consentStatus === consentFilter;
    const matchesCity = cityFilter === 'All' || c.city.toLowerCase() === cityFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesConsent && matchesCity;
  });

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Name and phone are required.');
      return;
    }

    try {
      if (editingContact) {
        await onUpdateContact(editingContact.id, formData);
        setEditingContact(null);
      } else {
        await onAddContact(formData);
        setIsAddModalOpen(false);
      }
      setFormData({
        name: '',
        phone: '+91 ',
        businessName: '',
        city: 'Satna',
        category: 'Workshops',
        productInterest: 'HP Milcy Turbo 15W-40',
        notes: '',
        tags: [],
        consentStatus: 'NOT_GIVEN',
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to save contact.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Business', 'City', 'Category', 'Product Interest', 'Consent Status', 'Consent Date', 'Evidence'];
    const rows = filteredContacts.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.businessName || ''}"`,
      `"${c.city || ''}"`,
      `"${c.category}"`,
      `"${c.productInterest || ''}"`,
      `"${c.consentStatus}"`,
      `"${c.consentDate || ''}"`,
      `"${(c.consentEvidence || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vikas_automobiles_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSampleImport = async () => {
    // Demonstration bulk import adhering strictly to:
    // "All imported contacts should initially receive the consent status NOT_GIVEN unless verifiable consent evidence is imported."
    const sampleBatch = [
      {
        name: 'Gita Tractor Spares',
        phone: '+919827991122',
        businessName: 'Gita Agro Workshop',
        city: 'Satna',
        category: 'Workshops',
        productInterest: 'HP Milcy Turbo, HP Gear Oil',
        consentStatus: 'NOT_GIVEN',
        consentEvidence: '',
      },
      {
        name: 'Shree Ram Auto Point',
        phone: '+919425114477',
        businessName: 'Shree Ram Bike Garage',
        city: 'Rewa',
        category: 'Mechanics',
        productInterest: 'HP Racer 4',
        consentStatus: 'NOT_GIVEN',
        consentEvidence: '',
      },
      {
        name: 'Vindhya Lubricants Counter',
        phone: '+919826338899',
        businessName: 'Vindhya Spares',
        city: 'Maihar',
        category: 'Retailers',
        productInterest: 'HP Neo Synth',
        consentStatus: 'NOT_GIVEN',
        consentEvidence: '',
      },
    ];

    await onImportContacts(sampleBatch);
    setIsImportModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by customer, garage name, phone, city or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Consent Status Filter */}
          <select
            value={consentFilter}
            onChange={(e) => setConsentFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Consent Statuses</option>
            <option value="OPTED_IN">OPTED_IN (Eligible)</option>
            <option value="PENDING">PENDING</option>
            <option value="NOT_GIVEN">NOT_GIVEN</option>
            <option value="OPTED_OUT">OPTED_OUT (Suppressed)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingContact(null);
              setFormData({
                name: '',
                phone: '+91 ',
                businessName: '',
                city: 'Satna',
                category: 'Workshops',
                productInterest: 'HP Milcy Turbo 15W-40',
                notes: '',
                tags: [],
                consentStatus: 'NOT_GIVEN',
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer & Garage</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Phone / City</th>
                <th className="py-3 px-4">HP Product Interest</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4">Evidence / Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No customers match the active filters.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{c.businessName || 'Independent'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-800 font-medium">{c.phone}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{c.city}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-700 line-clamp-1 max-w-[180px]">
                        {c.productInterest || 'HP Lubricants'}
                      </span>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.consentStatus === 'OPTED_IN'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : c.consentStatus === 'OPTED_OUT'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : c.consentStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {c.consentStatus === 'OPTED_IN' ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        ) : c.consentStatus === 'OPTED_OUT' ? (
                          <Ban className="w-3 h-3 text-rose-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-500" />
                        )}
                        {c.consentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      <div className="truncate max-w-[150px] font-medium text-slate-700">
                        {c.consentSource || 'Direct'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {c.consentEvidence || 'Audit log on file'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingContact(c);
                            setFormData(c);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {currentUserRole !== 'EMPLOYEE' && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete contact ${c.name}?`)) {
                                onDeleteContact(c.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
      {(isAddModalOpen || editingContact) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingContact ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingContact(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business / Garage Name</label>
                  <input
                    type="text"
                    value={formData.businessName || ''}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CustomerCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statutory Consent Status</label>
                  <select
                    value={formData.consentStatus}
                    onChange={(e) => setFormData({ ...formData, consentStatus: e.target.value as ConsentStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="NOT_GIVEN">NOT_GIVEN (Default)</option>
                    <option value="OPTED_IN">OPTED_IN (Verified)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="OPTED_OUT">OPTED_OUT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">HP Lubricant Interest</label>
                <input
                  type="text"
                  placeholder="e.g. HP Milcy Turbo 15W-40, HP Racer 4 20W-40"
                  value={formData.productInterest || ''}
                  onChange={(e) => setFormData({ ...formData, productInterest: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verifiable Consent Evidence</label>
                <input
                  type="text"
                  placeholder="e.g. Physical counterfoil kept in Satna office folder #481"
                  value={formData.consentEvidence || ''}
                  onChange={(e) => setFormData({ ...formData, consentEvidence: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingContact(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs">
            <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Bulk CSV / Excel Contact Import</span>
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Mandatory Statutory Compliance Rule</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  Importing a phone number <strong>must NEVER automatically mean</strong> the customer has given promotional consent.
                  All imported contacts strictly default to <strong>NOT_GIVEN</strong> unless verifiable physical or digital evidence is attached.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="font-semibold text-slate-800">
                  Import Satna Trade Directory / Lube Retailers
                </div>
                <p className="text-[11px] text-slate-500">
                  Click below to simulate importing 3 verified workshop records into your local database.
                </p>
                <button
                  onClick={handleSampleImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  Run Compliant Sample Batch Import
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
