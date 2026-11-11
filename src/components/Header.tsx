import React from 'react';
import {
  QrCode,
  ShieldCheck,
  MessageSquarePlus,
  RotateCcw,
  UserCheck,
  Wifi,
  WifiOff,
  LogOut,
} from 'lucide-react';
import { NavSection } from './Sidebar';

interface HeaderProps {
  currentSection: NavSection;
  connectionState: string;
  linkedNumber: string | null;
  currentUser: { userId: string; userName: string; role: string };
  environment: 'DEMO' | 'LIVE';
  onSwitchEnvironment: (env: 'DEMO' | 'LIVE') => void;
  onOpenConsentModal: () => void;
  onOpenTestInboundModal: () => void;
  onResetDemoData: () => void;
  onSwitchRole: (role: string) => void;
  onNavigateToConnection: () => void;
  onLogout?: () => void;
}

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: { title: 'Executive Dashboard', subtitle: 'Overview of customer relationships, dispatch metrics & WhatsApp queues' },
  connection: { title: 'WhatsApp QR Connection', subtitle: 'Pair existing WhatsApp Business account via Linked Devices' },
  inbox: { title: 'Message Inbox', subtitle: 'Real-time multi-agent customer conversations & HP Lube quick replies' },
  contacts: { title: 'Contact Management (CRM)', subtitle: 'Customer directory categorized by mechanics, retailers, and industrial fleets' },
  groups: { title: 'Contact Groups', subtitle: 'Targeted customer segments with non-consented exclusions' },
  consent: { title: 'Consent Manager', subtitle: 'Statutory customer opt-in verification, audit logs & automatic opt-out suppression' },
  auto_replies: { title: 'Auto Replies', subtitle: 'Instant automated responses for rates, catalogue, and location' },
  keywords: { title: 'Keyword Automation', subtitle: 'Rule-based triggers for tagging, lead routing, and auto-dispatch' },
  follow_ups: { title: 'Follow-up Sequences', subtitle: 'Multi-day drip sequences with auto-cancel on customer response' },
  campaigns: { title: 'Bulk Campaigns', subtitle: 'Promotional broadcasts with mandatory pre-send safety verification' },
  templates: { title: 'Message Templates', subtitle: 'Pre-approved messages for HP Milcy Turbo, Racer 4, and dealer schemes' },
  automation_builder: { title: 'Automation Builder', subtitle: 'Visual Trigger → Condition → Action workflow architect' },
  message_history: { title: 'Message History & Audit', subtitle: 'Searchable log of all dispatched and inbound messages' },
  pacing: { title: 'Smart Message Pacing', subtitle: 'Dynamic local rate regulator with anti-spike queue throttling' },
  health: { title: 'Account Health Monitor', subtitle: 'Verifiable operational indicators, error rate analysis & risk reduction' },
  analytics: { title: 'Analytics & Reports', subtitle: 'Conversion metrics, category distributions, and dispatch trends' },
  team: { title: 'Team Management & RBAC', subtitle: 'Role-based access controls for Admin, Manager, and Employee' },
  backup: { title: 'Local Backup & Restore', subtitle: 'Zero-cloud local storage snapshots and database recovery' },
  settings: { title: 'Business Settings', subtitle: 'Vikas Automobiles profile, working hours, and operational defaults' },
  help: { title: 'Help & Documentation', subtitle: 'Windows run guide, WhatsApp Business linking instructions & FAQ' },
};

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  connectionState,
  linkedNumber,
  currentUser,
  environment,
  onSwitchEnvironment,
  onOpenConsentModal,
  onOpenTestInboundModal,
  onResetDemoData,
  onSwitchRole,
  onNavigateToConnection,
  onLogout,
}) => {
  const currentInfo = SECTION_TITLES[currentSection] || { title: 'Vikas Message Automator', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
      {/* Title & Subtitle */}
      <div className="min-w-0 pr-4">
        <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-slate-500 truncate hidden sm:block">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Action Controls & Indicators */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Permanent LIVE / DEMO Indicator & Switcher */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            environment === 'LIVE'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
              : 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                environment === 'LIVE' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-bold tracking-wide text-[11px]">
              {environment === 'LIVE' ? 'LIVE PRODUCTION' : 'DEMO MODE'}
            </span>
          </div>

          <button
            onClick={() => onSwitchEnvironment(environment === 'LIVE' ? 'DEMO' : 'LIVE')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors border ${
              environment === 'LIVE'
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
            }`}
            title={
              environment === 'LIVE'
                ? 'Switch to Demo mode to use sample data & simulated inbound messages'
                : 'Switch to Live production to use actual WhatsApp contacts & broadcasts'
            }
          >
            {environment === 'LIVE' ? 'Switch to Demo' : 'Switch to Live'}
          </button>

          {environment === 'DEMO' && (
            <button
              onClick={onResetDemoData}
              className="p-1 hover:bg-amber-100 rounded text-amber-700 hover:text-amber-900 transition-colors ml-0.5"
              title="Reset demo data to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* WhatsApp Connection Status Button */}
        <button
          onClick={onNavigateToConnection}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            connectionState === 'CONNECTED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : connectionState === 'WAITING_FOR_QR'
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
          title="Click to view WhatsApp Connection settings"
        >
          {connectionState === 'CONNECTED' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="font-semibold truncate max-w-[140px]">
                {linkedNumber || 'Connected'}
              </span>
            </>
          ) : (
            <>
              <QrCode className="w-3.5 h-3.5 text-slate-500" />
              <span>{connectionState === 'WAITING_FOR_QR' ? 'Scan QR' : 'Pair WhatsApp'}</span>
            </>
          )}
        </button>

        {/* Test Inbound Message simulator button (Only available in DEMO mode) */}
        {environment === 'DEMO' ? (
          <button
            onClick={onOpenTestInboundModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            title="Simulate incoming customer message (PRICE, CATALOGUE, STOP)"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Simulate Inbound</span>
          </button>
        ) : (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed"
            title="Inbound simulation is disabled in LIVE environment. Only real WhatsApp messages are received."
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Real Events Only</span>
          </div>
        )}

        {/* Public Consent Form button */}
        <button
          onClick={onOpenConsentModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          title="Open in-store / web customer consent opt-in form"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Consent Form</span>
        </button>

        {/* Active Role Switcher */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs">
          <UserCheck className="w-4 h-4 text-slate-400" />
          <select
            value={currentUser.role}
            onChange={(e) => onSwitchRole(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            title="Switch User Role to test RBAC permissions"
          >
            <option value="ADMIN">Admin (Full Access)</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee (Inbox only)</option>
          </select>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 ml-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out of Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
