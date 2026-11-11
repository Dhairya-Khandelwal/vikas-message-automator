import React, { useState, useEffect } from 'react';
import { Sidebar, NavSection } from './components/Sidebar';
import { Header } from './components/Header';
import { api } from './services/api';

// Views
import { DashboardView } from './components/views/DashboardView';
import { WhatsAppConnectionView } from './components/views/WhatsAppConnectionView';
import { MessageInboxView } from './components/views/MessageInboxView';
import { ContactsView } from './components/views/ContactsView';
import { ContactGroupsView } from './components/views/ContactGroupsView';
import { ConsentManagerView } from './components/views/ConsentManagerView';
import { AutoRepliesView } from './components/views/AutoRepliesView';
import { KeywordAutomationView } from './components/views/KeywordAutomationView';
import { FollowUpSequencesView } from './components/views/FollowUpSequencesView';
import { BulkCampaignsView } from './components/views/BulkCampaignsView';
import { MessageTemplatesView } from './components/views/MessageTemplatesView';
import { AutomationBuilderView } from './components/views/AutomationBuilderView';
import { MessageHistoryView } from './components/views/MessageHistoryView';
import { SmartPacingView } from './components/views/SmartPacingView';
import { AccountHealthView } from './components/views/AccountHealthView';
import { AnalyticsReportsView } from './components/views/AnalyticsReportsView';
import { TeamManagementView } from './components/views/TeamManagementView';
import { BackupRestoreView } from './components/views/BackupRestoreView';
import { SettingsView } from './components/views/SettingsView';
import { HelpSupportView } from './components/views/HelpSupportView';
import { LoginView } from './components/views/LoginView';
import { setOnAuthRequired } from './services/api';

// Modals
import { ConsentRegistrationModal } from './components/modals/ConsentRegistrationModal';
import { TestInboundModal } from './components/modals/TestInboundModal';
import { CampaignSafetyModal } from './components/modals/CampaignSafetyModal';

import {
  Contact,
  ContactGroup,
  ConsentRecord,
  Message,
  Conversation,
  MessageTemplate,
  Campaign,
  AutoReplyRule,
  KeywordAutomation,
  FollowUpSequence,
  SmartPacingConfig,
  MessageQueueItem,
  WhatsAppConnectionInfo,
  AccountHealth,
  TeamMember,
  PersistentPacingState,
} from './types';

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [autoReplies, setAutoReplies] = useState<AutoReplyRule[]>([]);
  const [keywordRules, setKeywordRules] = useState<KeywordAutomation[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSequence[]>([]);
  const [pacingConfig, setPacingConfig] = useState<SmartPacingConfig>({
    mode: 'AUTO',
    minIntervalSeconds: 12,
    batchSize: 15,
    pauseBetweenBatchesMinutes: 3,
    dailyCampaignCap: 150,
    workingHoursStart: '09:00',
    workingHoursEnd: '20:00',
    autoCalculatedInterval: 12,
  });
  const [queue, setQueue] = useState<MessageQueueItem[]>([]);
  const [pacingState, setPacingState] = useState<PersistentPacingState | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<WhatsAppConnectionInfo>({
    state: 'DISCONNECTED',
    qrCodeDataUrl: null,
    linkedNumber: null,
    linkedName: null,
    lastConnectedTime: null,
    lastSyncTime: null,
    errorMessage: null,
    adapterMode: 'DEMO_SIMULATION',
    disclaimerAccepted: true,
  });
  const [accountHealth, setAccountHealth] = useState<AccountHealth>({
    status: 'GREEN',
    connectionStatus: 'DISCONNECTED',
    authenticationStatus: 'Unauthenticated',
    recentConnectionFailures: 0,
    messageFailures: 0,
    queueStatus: '0 pending',
    activeCampaigns: 0,
    pausedCampaigns: 0,
    lastSuccessfulMessage: null,
    warnings: [],
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState({
    userId: 'u-1',
    userName: 'Dhairya Khandelwal',
    role: 'ADMIN',
  });
  const [settings, setSettings] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>({});
  const [environment, setEnvironment] = useState<'DEMO' | 'LIVE'>('DEMO');

  // Modals state
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isTestInboundOpen, setIsTestInboundOpen] = useState(false);
  const [safetyModalData, setSafetyModalData] = useState<{
    isOpen: boolean;
    campaignName: string;
    safetyData: any;
    launchFn: () => Promise<void>;
  }>({
    isOpen: false,
    campaignName: '',
    safetyData: null,
    launchFn: async () => {},
  });

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [
        contactsRes,
        groupsRes,
        consentRes,
        convsRes,
        msgsRes,
        templatesRes,
        campaignsRes,
        autoRepliesRes,
        keywordRes,
        followUpsRes,
        pacingRes,
        healthRes,
        teamRes,
        settingsRes,
        analyticsRes,
      ] = await Promise.all([
        api.getContacts(),
        api.getGroups(),
        api.getConsentData(),
        api.getConversations(),
        api.getMessages(),
        api.getTemplates(),
        api.getCampaigns(),
        api.getAutoReplies(),
        api.getKeywordAutomations(),
        api.getFollowUps(),
        api.getPacingData(),
        api.getAccountHealth(),
        api.getTeam(),
        api.getSettings(),
        api.getAnalytics(),
      ]);

      if (contactsRes.success) setContacts(contactsRes.data);
      if (groupsRes.success) setGroups(groupsRes.data);
      if (consentRes.success) setConsentRecords(consentRes.data.records);
      if (convsRes.success) setConversations(convsRes.data);
      if (msgsRes.success) setMessages(msgsRes.data);
      if (templatesRes.success) setTemplates(templatesRes.data);
      if (campaignsRes.success) setCampaigns(campaignsRes.data);
      if (autoRepliesRes.success) setAutoReplies(autoRepliesRes.data);
      if (keywordRes.success) setKeywordRules(keywordRes.data);
      if (followUpsRes.success) setFollowUps(followUpsRes.data);
      if (pacingRes.success) {
        setPacingConfig(pacingRes.data.config);
        setQueue(pacingRes.data.queue);
        if (pacingRes.data.pacingState) setPacingState(pacingRes.data.pacingState);
      }
      if (healthRes.success) setAccountHealth(healthRes.data);
      if (teamRes.success) {
        setTeamMembers(teamRes.data.members);
        setCurrentUser(teamRes.data.currentUser);
      }
      if (settingsRes.success) {
        setSettings(settingsRes.data);
        if (settingsRes.data?.environment) {
          setEnvironment(settingsRes.data.environment);
        }
      }
      if (analyticsRes.success) setAnalytics(analyticsRes.data);

      const waStatus = await api.getWhatsAppStatus();
      if (waStatus.success) setConnectionInfo(waStatus.data);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOnAuthRequired(() => {
      setIsAuthenticated(false);
      setLoading(false);
    });

    const checkSession = async () => {
      try {
        const authRes = await api.getCurrentUser();
        if (authRes.success && authRes.authenticated && authRes.data) {
          setCurrentUser({
            userId: authRes.data.userId,
            userName: authRes.data.userName,
            role: authRes.data.role,
          });
          setIsAuthenticated(true);
          await refreshAllData();
        } else {
          setIsAuthenticated(false);
          setLoading(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Background sync polling every 3 seconds for live message inbox & queue
    const interval = setInterval(async () => {
      try {
        const [pacingRes, convsRes, msgsRes, waRes] = await Promise.all([
          api.getPacingData(),
          api.getConversations(),
          api.getMessages(),
          api.getWhatsAppStatus(),
        ]);
        if (pacingRes.success) {
          setPacingConfig(pacingRes.data.config);
          setQueue(pacingRes.data.queue);
          if (pacingRes.data.pacingState) setPacingState(pacingRes.data.pacingState);
        }
        if (convsRes.success) setConversations(convsRes.data);
        if (msgsRes.success) setMessages(msgsRes.data);
        if (waRes.success) setConnectionInfo(waRes.data);
      } catch (e) {
        // quiet background poll
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Action Handlers
  const handleConnectWhatsApp = async () => {
    const res = await api.connectWhatsApp();
    if (res.success) {
      setConnectionInfo(res.data);
      showToast('Initializing WhatsApp Web socket. QR code will appear momentarily.', 'info');
    } else {
      showToast(res.error || 'Failed to initialize WhatsApp connection', 'error');
    }
  };

  const handleDisconnectWhatsApp = async () => {
    const res = await api.disconnectWhatsApp();
    if (res.success) {
      setConnectionInfo(res.data);
      showToast('WhatsApp Business session disconnected.');
    }
  };

  const handleSendMessage = async (payload: any) => {
    const res = await api.sendMessage(payload);
    if (res.success) {
      showToast('Message dispatched.');
      refreshAllData();
    } else {
      showToast(res.error || 'Failed to send message', 'error');
    }
  };

  const handleResolveConversation = async (id: string, resolved: boolean) => {
    await api.resolveConversation(id, resolved);
    refreshAllData();
  };

  const handleAssignConversation = async (id: string, assignedTo: string) => {
    await api.assignConversation(id, assignedTo);
    refreshAllData();
    showToast('Conversation reassigned.');
  };

  const handleAddContact = async (contactData: Partial<Contact>) => {
    const res = await api.createContact(contactData);
    if (res.success) {
      showToast(`Added ${contactData.name} to customer directory.`);
      refreshAllData();
    } else {
      showToast(res.error || 'Failed to add contact', 'error');
    }
  };

  const handleUpdateContact = async (id: string, updates: Partial<Contact>) => {
    const res = await api.updateContact(id, updates);
    if (res.success) {
      showToast('Customer record updated.');
      refreshAllData();
    } else {
      showToast(res.error || 'Failed to update contact', 'error');
    }
  };

  const handleDeleteContact = async (id: string) => {
    const res = await api.deleteContact(id);
    if (res.success) {
      showToast('Customer deleted.');
      refreshAllData();
    } else {
      showToast(res.error || 'Failed to delete contact', 'error');
    }
  };

  const handleImportContacts = async (list: any[]) => {
    const res = await api.importContacts(list);
    if (res.success) {
      showToast(`Imported ${res.data.addedCount} contacts. Defaulted consent to NOT_GIVEN.`);
      refreshAllData();
    } else {
      showToast(res.error || 'Import failed', 'error');
    }
  };

  const handleCreateGroup = async (name: string, description: string, contactIds: string[]) => {
    const res = await api.createGroup(name, description, contactIds);
    if (res.success) {
      showToast(`Created group "${name}".`);
      refreshAllData();
    }
  };

  const handleUpdateGroup = async (id: string, updates: Partial<ContactGroup>) => {
    await api.updateGroup(id, updates);
    showToast('Group updated.');
    refreshAllData();
  };

  const handleDeleteGroup = async (id: string) => {
    await api.deleteGroup(id);
    showToast('Group deleted.');
    refreshAllData();
  };

  const handleRegisterConsent = async (payload: any) => {
    const res = await api.registerConsent(payload);
    if (res.success) {
      showToast('Verified consent recorded with legal audit evidence.');
      refreshAllData();
    } else {
      throw new Error(res.error || 'Failed to record consent');
    }
  };

  const handleManualOptOut = async (phone: string, reason?: string) => {
    const res = await api.optOut(phone, reason);
    if (res.success) {
      showToast(`Suppressed ${phone} from all promotional marketing.`);
      refreshAllData();
    }
  };

  const handleSaveAutoReply = async (rule: AutoReplyRule) => {
    await api.saveAutoReply(rule);
    showToast('Auto reply rule saved.');
    refreshAllData();
  };

  const handleDeleteAutoReply = async (id: string) => {
    await api.deleteAutoReply(id);
    showToast('Auto reply rule deleted.');
    refreshAllData();
  };

  const handleSaveKeyword = async (rule: KeywordAutomation) => {
    await api.saveKeywordAutomation(rule);
    showToast('Keyword automation rule saved.');
    refreshAllData();
  };

  const handleDeleteKeyword = async (id: string) => {
    await api.deleteKeywordAutomation(id);
    showToast('Keyword rule deleted.');
    refreshAllData();
  };

  const handleSaveFollowUp = async (seq: FollowUpSequence) => {
    await api.saveFollowUp(seq);
    showToast('Follow-up sequence saved.');
    refreshAllData();
  };

  const handleSaveTemplate = async (tpl: Partial<MessageTemplate>) => {
    await api.saveTemplate(tpl);
    showToast('Message template saved.');
    refreshAllData();
  };

  const handleDeleteTemplate = async (id: string) => {
    await api.deleteTemplate(id);
    showToast('Message template deleted.');
    refreshAllData();
  };

  const handleCreateCampaign = async (payload: any) => {
    const res = await api.createCampaign(payload);
    if (res.success) {
      showToast(`Campaign "${payload.name}" launched into pacing queue!`);
      refreshAllData();
    }
  };

  const handlePauseCampaign = async (id: string) => {
    await api.pauseCampaign(id);
    showToast('Campaign paused.');
    refreshAllData();
  };

  const handleResumeCampaign = async (id: string) => {
    await api.resumeCampaign(id);
    showToast('Campaign resumed and queue items restored.');
    refreshAllData();
  };

  const handleCancelCampaign = async (id: string) => {
    await api.cancelCampaign(id);
    showToast('Campaign cancelled.');
    refreshAllData();
  };

  const handleUpdatePacingConfig = async (updates: Partial<SmartPacingConfig>) => {
    const res = await api.updatePacingConfig(updates);
    if (res.success) {
      setPacingConfig(res.data);
      showToast('Pacing configuration updated.');
    }
  };

  const handleSetPacingMode = async (mode: 'AUTO' | 'MANUAL' | 'PAUSED') => {
    const res = await api.setPacingMode(mode);
    if (res.success) {
      setPacingConfig(res.data);
      showToast(`Pacing mode switched to ${mode}.`);
    }
  };

  const handleClearQueue = async () => {
    await api.clearQueue();
    showToast('Message queue cleared.');
    refreshAllData();
  };

  const handleSwitchRole = async (role: string, userId?: string) => {
    const res = await api.switchRole(role, userId);
    if (res.success) {
      setCurrentUser(res.data);
      showToast(`Switched active role to ${role}.`);
    }
  };

  const handleResetDemoData = async () => {
    if (confirm('Reset database to pristine Vikas Automobiles initial demo records?')) {
      await api.resetDemoData();
      showToast('Demo data reset to factory defaults.');
      refreshAllData();
    }
  };

  const handleSwitchEnvironment = async (newEnv: 'DEMO' | 'LIVE') => {
    try {
      setLoading(true);
      const res = await api.setEnvironment(newEnv);
      if (res.success && res.data) {
        setEnvironment(res.data.environment);
        await refreshAllData();
        if (res.data.environment === 'LIVE') {
          showToast('🟢 Switched to LIVE PRODUCTION. Real customer records and actual WhatsApp events only.', 'success');
        } else {
          showToast('🟡 Switched to DEMO ENVIRONMENT with sample data & simulated testing.', 'info');
        }
      } else {
        showToast(res.error || 'Failed to switch environment', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error switching environment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    const res = await api.updateSettings(newSettings);
    if (res.success) {
      setSettings(res.data);
      showToast('Business settings saved.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setIsAuthenticated(false);
      showToast('Signed out successfully.', 'info');
    }
  };

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingQueueCount = queue.filter((q) => q.status === 'PENDING' || q.status === 'SCHEDULED').length;

  if (isAuthenticated === null || (loading && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Loading Vikas Message Automator...
        </p>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <LoginView
        onLoginSuccess={async (userData) => {
          setCurrentUser({
            userId: userData.userId,
            userName: userData.userName,
            role: userData.role,
          });
          setIsAuthenticated(true);
          setLoading(true);
          await refreshAllData();
          showToast(`Welcome back, ${userData.userName}`, 'success');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        connectionState={connectionInfo.state}
        pendingQueueCount={pendingQueueCount}
        unreadCount={totalUnreadCount}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentSection={currentSection}
          connectionState={connectionInfo.state}
          linkedNumber={connectionInfo.linkedNumber}
          currentUser={currentUser}
          environment={environment}
          onSwitchEnvironment={handleSwitchEnvironment}
          onOpenConsentModal={() => setIsConsentModalOpen(true)}
          onOpenTestInboundModal={() => setIsTestInboundOpen(true)}
          onResetDemoData={handleResetDemoData}
          onSwitchRole={handleSwitchRole}
          onNavigateToConnection={() => setCurrentSection('connection')}
          onLogout={handleLogout}
        />

        {/* View Switcher */}
        <main className="flex-1 overflow-y-auto">
          {currentSection === 'dashboard' && (
            <DashboardView
              analyticsData={analytics}
              connectionInfo={connectionInfo}
              pacingConfig={pacingConfig}
              accountHealth={accountHealth}
              environment={environment}
              onNavigate={setCurrentSection}
              onOpenTestInbound={() => setIsTestInboundOpen(true)}
              onOpenConsentModal={() => setIsConsentModalOpen(true)}
            />
          )}

          {currentSection === 'connection' && (
            <WhatsAppConnectionView
              connectionInfo={connectionInfo}
              onConnect={handleConnectWhatsApp}
              onDisconnect={handleDisconnectWhatsApp}
            />
          )}

          {currentSection === 'inbox' && (
            <MessageInboxView
              conversations={conversations}
              messages={messages}
              teamMembers={teamMembers}
              onSendMessage={handleSendMessage}
              onResolveConversation={handleResolveConversation}
              onAssignConversation={handleAssignConversation}
            />
          )}

          {currentSection === 'contacts' && (
            <ContactsView
              contacts={contacts}
              currentUserRole={currentUser.role}
              onAddContact={handleAddContact}
              onUpdateContact={handleUpdateContact}
              onDeleteContact={handleDeleteContact}
              onImportContacts={handleImportContacts}
            />
          )}

          {currentSection === 'groups' && (
            <ContactGroupsView
              groups={groups}
              contacts={contacts}
              onCreateGroup={handleCreateGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
            />
          )}

          {currentSection === 'consent' && (
            <ConsentManagerView
              contacts={contacts}
              consentRecords={consentRecords}
              onOpenRegisterConsent={() => setIsConsentModalOpen(true)}
              onManualOptOut={handleManualOptOut}
            />
          )}

          {currentSection === 'auto_replies' && (
            <AutoRepliesView
              autoReplies={autoReplies}
              onSaveReply={handleSaveAutoReply}
              onDeleteReply={handleDeleteAutoReply}
            />
          )}

          {currentSection === 'keywords' && (
            <KeywordAutomationView
              rules={keywordRules}
              groups={groups}
              onSaveRule={handleSaveKeyword}
              onDeleteRule={handleDeleteKeyword}
              onTestSimulation={(text) => {
                setIsTestInboundOpen(true);
              }}
            />
          )}

          {currentSection === 'follow_ups' && (
            <FollowUpSequencesView
              sequences={followUps}
              onSaveSequence={handleSaveFollowUp}
            />
          )}

          {currentSection === 'campaigns' && (
            <BulkCampaignsView
              campaigns={campaigns}
              groups={groups}
              contacts={contacts}
              templates={templates}
              onCreateCampaign={handleCreateCampaign}
              onPauseCampaign={handlePauseCampaign}
              onResumeCampaign={handleResumeCampaign}
              onCancelCampaign={handleCancelCampaign}
              onCheckSafety={api.checkCampaignSafety}
              onOpenSafetyModal={(name, data, fn) => {
                setSafetyModalData({
                  isOpen: true,
                  campaignName: name,
                  safetyData: data,
                  launchFn: fn,
                });
              }}
            />
          )}

          {currentSection === 'templates' && (
            <MessageTemplatesView
              templates={templates}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {currentSection === 'automation_builder' && <AutomationBuilderView />}

          {currentSection === 'message_history' && <MessageHistoryView messages={messages} />}

          {currentSection === 'pacing' && (
            <SmartPacingView
              config={pacingConfig}
              queue={queue}
              pacingState={pacingState}
              onUpdateConfig={handleUpdatePacingConfig}
              onSetMode={handleSetPacingMode}
              onClearQueue={handleClearQueue}
            />
          )}

          {currentSection === 'health' && (
            <AccountHealthView health={accountHealth} onRefresh={refreshAllData} />
          )}

          {currentSection === 'analytics' && <AnalyticsReportsView analyticsData={analytics} />}

          {currentSection === 'team' && (
            <TeamManagementView
              teamMembers={teamMembers}
              currentUser={currentUser}
              onSwitchRole={handleSwitchRole}
            />
          )}

          {currentSection === 'backup' && (
            <BackupRestoreView onRestoreSuccess={refreshAllData} />
          )}

          {currentSection === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetDemoData={handleResetDemoData}
            />
          )}

          {currentSection === 'help' && <HelpSupportView />}
        </main>
      </div>

      {/* Global Modals */}
      <ConsentRegistrationModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onSubmit={handleRegisterConsent}
      />

      <TestInboundModal
        isOpen={isTestInboundOpen}
        onClose={() => setIsTestInboundOpen(false)}
        onSendSimulation={async (phone, text, name) => {
          const res = await api.simulateIncomingMessage(phone, text, name);
          refreshAllData();
          return res;
        }}
      />

      <CampaignSafetyModal
        isOpen={safetyModalData.isOpen}
        onClose={() => setSafetyModalData({ ...safetyModalData, isOpen: false })}
        campaignName={safetyModalData.campaignName}
        safetyData={safetyModalData.safetyData}
        onConfirmLaunch={safetyModalData.launchFn}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : toast.type === 'info'
                ? 'bg-blue-900 text-white border-blue-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
