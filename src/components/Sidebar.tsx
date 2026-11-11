import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  Inbox,
  Users,
  FolderTree,
  ShieldCheck,
  Bot,
  Zap,
  Clock,
  Send,
  FileText,
  Workflow,
  History,
  Gauge,
  Activity,
  BarChart3,
  UserCheck,
  Database,
  Settings,
  HelpCircle,
  Truck,
  Sparkles,
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'connection'
  | 'inbox'
  | 'contacts'
  | 'groups'
  | 'consent'
  | 'auto_replies'
  | 'keywords'
  | 'follow_ups'
  | 'campaigns'
  | 'templates'
  | 'automation_builder'
  | 'message_history'
  | 'pacing'
  | 'health'
  | 'analytics'
  | 'team'
  | 'backup'
  | 'settings'
  | 'help';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  connectionState: string;
  pendingQueueCount: number;
  unreadCount: number;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  group: 'Core' | 'Messaging & CRM' | 'Automation & Rules' | 'Operations & System';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  connectionState,
  pendingQueueCount,
  unreadCount,
}) => {
  const navItems: NavItem[] = [
    // Core
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Core' },
    {
      id: 'connection',
      label: 'WhatsApp Connection',
      icon: QrCode,
      badge: connectionState === 'CONNECTED' ? 'Linked' : 'Pair',
      badgeColor: connectionState === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      group: 'Core',
    },
    {
      id: 'inbox',
      label: 'Message Inbox',
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: 'bg-blue-600 text-white',
      group: 'Core',
    },

    // Messaging & CRM
    { id: 'contacts', label: 'Contacts (CRM)', icon: Users, group: 'Messaging & CRM' },
    { id: 'groups', label: 'Contact Groups', icon: FolderTree, group: 'Messaging & CRM' },
    { id: 'consent', label: 'Consent Manager', icon: ShieldCheck, badge: 'Mandatory', badgeColor: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40', group: 'Messaging & CRM' },
    { id: 'campaigns', label: 'Bulk Campaigns', icon: Send, group: 'Messaging & CRM' },
    { id: 'templates', label: 'Message Templates', icon: FileText, group: 'Messaging & CRM' },
    { id: 'message_history', label: 'Message History', icon: History, group: 'Messaging & CRM' },

    // Automation & Rules
    { id: 'auto_replies', label: 'Auto Replies', icon: Bot, group: 'Automation & Rules' },
    { id: 'keywords', label: 'Keyword Automation', icon: Zap, group: 'Automation & Rules' },
    { id: 'follow_ups', label: 'Follow-up Sequences', icon: Clock, group: 'Automation & Rules' },
    { id: 'automation_builder', label: 'Automation Builder', icon: Workflow, group: 'Automation & Rules' },

    // Operations & System
    {
      id: 'pacing',
      label: 'Smart Message Pacing',
      icon: Gauge,
      badge: pendingQueueCount > 0 ? `${pendingQueueCount} queued` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      group: 'Operations & System',
    },
    { id: 'health', label: 'Account Health', icon: Activity, group: 'Operations & System' },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, group: 'Operations & System' },
    { id: 'team', label: 'Team Management', icon: UserCheck, group: 'Operations & System' },
    { id: 'backup', label: 'Backup & Restore', icon: Database, group: 'Operations & System' },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'Operations & System' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, group: 'Operations & System' },
  ];

  const groups = ['Core', 'Messaging & CRM', 'Automation & Rules', 'Operations & System'] as const;

  return (
    <aside className="w-68 bg-[#0b1329] text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0 select-none overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-[#090f20]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm tracking-tight truncate leading-tight">
              VIKAS AUTOMOBILES
            </h1>
            <p className="text-[11px] text-blue-400 font-medium truncate">
              HP Lube C&F Agent, Satna
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
          <span className="text-slate-400">Suite</span>
          <span className="font-semibold text-white flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Message Automator
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {groups.map((group) => {
          const items = navItems.filter((item) => item.group === group);
          return (
            <div key={group} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {group}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                          item.badgeColor || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090f20] text-[11px] text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'CONNECTED'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionState === 'WAITING_FOR_QR'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            <span className="capitalize text-slate-300 font-medium">
              {connectionState.replace(/_/g, ' ').toLowerCase()}
            </span>
          </span>
          <span className="text-slate-500 text-[10px]">v2.4 Local</span>
        </div>
        <p className="text-[10px] text-slate-500 truncate">
          Satna, M.P. • Ph: 9827003016
        </p>
      </div>
    </aside>
  );
};
