import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, CheckCircle2, AlertTriangle, ArrowRight, Building2, PhoneCall } from 'lucide-react';
import { api } from '../../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username, password);
      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error. Ensure local server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-600/30 mb-4 border border-blue-400/30">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Vikas Automobiles</h1>
          <p className="text-xs tracking-wider uppercase text-blue-400 font-semibold mt-1">
            HP Lubricants Distributor & C&F Agent • Satna (M.P.)
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Security & Statutory Compliance Active</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign In to Dashboard</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your credentials to access the message pacing system and contacts.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username / Email / Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or dhairya@vikasautomobiles.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Secure Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick select demo accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-3 flex items-center justify-between">
              <span>Quick Login Accounts</span>
              <span className="text-[10px] text-blue-400">Pre-seeded</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin', 'admin123')}
                className={`p-2 rounded-lg text-left border transition-all text-xs cursor-pointer ${
                  username === 'admin'
                    ? 'bg-blue-600/20 border-blue-500/60 text-blue-200'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="font-semibold text-white">Admin</div>
                <div className="text-[10px] text-slate-400 font-mono">admin123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('manager', 'manager123')}
                className={`p-2 rounded-lg text-left border transition-all text-xs cursor-pointer ${
                  username === 'manager'
                    ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-200'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="font-semibold text-white">Manager</div>
                <div className="text-[10px] text-slate-400 font-mono">manager123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('employee', 'employee123')}
                className={`p-2 rounded-lg text-left border transition-all text-xs cursor-pointer ${
                  username === 'employee'
                    ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="font-semibold text-white">Employee</div>
                <div className="text-[10px] text-slate-400 font-mono">employee123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>Local Machine Access Binding: 127.0.0.1:3000</p>
          <p className="text-[11px] text-slate-600">
            Compliant with DPDP Act & TRAI Commercial WhatsApp Communications Guidelines
          </p>
        </div>
      </div>
    </div>
  );
}
