import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CustomerCategory } from '../../types';

interface ConsentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    phone: string;
    businessName: string;
    city: string;
    category: CustomerCategory;
    checkboxChecked: boolean;
    source: string;
    evidence: string;
  }) => Promise<void>;
}

export const ConsentRegistrationModal: React.FC<ConsentRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('Satna');
  const [category, setCategory] = useState<CustomerCategory>('Workshops');
  const [source, setSource] = useState('In-Store Physical Registration Form');
  const [evidence, setEvidence] = useState('Physical counterfoil signed at Vikas Automobiles Satna sales counter');
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide customer name.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please provide a valid 10-digit mobile number with country code.');
      return;
    }

    if (!checkboxChecked) {
      setError('Opening the consent form does NOT activate consent. The customer agreement checkbox MUST be checked.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        city: city.trim(),
        category,
        checkboxChecked,
        source,
        evidence: evidence.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setName('');
        setPhone('+91 ');
        setBusinessName('');
        setCheckboxChecked(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to record consent record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Customer Consent Registration</h2>
              <p className="text-xs text-slate-300">Statutory WhatsApp Marketing Permission Form</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Consent verified and registered successfully into local audit trail!</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <span className="font-semibold block mb-1">Notice for Vikas Automobiles Staff:</span>
            Indian regulatory compliance strictly prohibits unsolicited commercial messaging. Only register consent when the customer has affirmatively opted in.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9827003016"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business / Garage Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Patel Auto Garage"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Tehsil
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Satna"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Workshops">Workshops</option>
                <option value="Mechanics">Mechanics</option>
                <option value="Retailers">Retailers</option>
                <option value="Automobile Dealers">Automobile Dealers</option>
                <option value="Distributors">Distributors</option>
                <option value="Industrial Customers">Industrial Customers</option>
                <option value="Individual Customers">Individual Customers</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consent Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="In-Store Physical Registration Form">In-Store Physical Registration Form</option>
                <option value="QR-Code Consent Form">QR-Code Consent Form</option>
                <option value="Website Form">Website Form</option>
                <option value="Counter Visit Order Form">Counter Visit Order Form</option>
                <option value="In-Bound WhatsApp Opt-in">In-Bound WhatsApp Opt-in</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verifiable Evidence Reference
            </label>
            <input
              type="text"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. Physical counterfoil kept in Satna office file #2026"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Mandatory Statutory Consent Checkbox */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="statutory-consent-checkbox"
                type="checkbox"
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="statutory-consent-checkbox"
                className="text-xs text-slate-800 leading-relaxed cursor-pointer select-none font-medium"
              >
                "I agree to receive promotional updates, product availability information, offers and business communications from Vikas Automobiles through WhatsApp. I understand that I can withdraw my consent at any time."
              </label>
            </div>
            <p className="text-[11px] text-slate-500 pl-7 italic">
              Note: Unchecked by default. Must be explicitly selected by the customer.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !checkboxChecked}
              className={`px-5 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-sm ${
                checkboxChecked
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Registering...' : 'Register Verified Opt-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
