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
  AuditLog,
} from '../types';

let cachedCsrfToken: string | null = null;
let onAuthRequiredCallback: (() => void) | null = null;

export function setOnAuthRequired(cb: () => void) {
  onAuthRequiredCallback = cb;
}

async function request(url: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});

  // Send CSRF token on mutating methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && cachedCsrfToken) {
    if (!headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', cachedCsrfToken);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !url.includes('/api/auth/me') && !url.includes('/api/auth/login')) {
    if (onAuthRequiredCallback) {
      onAuthRequiredCallback();
    }
  }

  const data = await response.json().catch(() => ({ success: false, error: 'Non-JSON response' }));
  if (data?.data?.csrfToken) {
    cachedCsrfToken = data.data.csrfToken;
  } else if (data?.csrfToken) {
    cachedCsrfToken = data.csrfToken;
  }
  return data;
}

export const api = {
  // Authentication
  async getCsrfToken(): Promise<string> {
    const res = await request('/api/auth/csrf');
    if (res?.csrfToken) cachedCsrfToken = res.csrfToken;
    return cachedCsrfToken || '';
  },

  async getCurrentUser(): Promise<{
    success: boolean;
    authenticated: boolean;
    data?: {
      userId: string;
      userName: string;
      role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
      email?: string;
      phone?: string;
      avatarColor?: string;
      csrfToken?: string;
    };
  }> {
    return request('/api/auth/me');
  },

  async login(username: string, password: string): Promise<any> {
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res?.data?.csrfToken) {
      cachedCsrfToken = res.data.csrfToken;
    }
    return res;
  },

  async logout(): Promise<any> {
    const res = await request('/api/auth/logout', { method: 'POST' });
    cachedCsrfToken = null;
    return res;
  },

  // Status
  async getStatus() {
    return request('/api/status');
  },

  // WhatsApp (Baileys WebSocket Integration)
  async getWhatsAppStatus(): Promise<{ success: boolean; data: WhatsAppConnectionInfo }> {
    return request('/api/whatsapp/status');
  },

  async connectWhatsApp() {
    return request('/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  async disconnectWhatsApp() {
    return request('/api/whatsapp/disconnect', { method: 'POST' });
  },

  async simulateIncomingMessage(phone: string, text: string, name?: string) {
    return request('/api/whatsapp/test-incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text, name }),
    });
  },

  // Contacts
  async getContacts(params?: { search?: string; category?: string; consentStatus?: string; city?: string }): Promise<{ success: boolean; data: Contact[] }> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.category) q.append('category', params.category);
    if (params?.consentStatus) q.append('consentStatus', params.consentStatus);
    if (params?.city) q.append('city', params.city);
    return request(`/api/contacts?${q.toString()}`);
  },

  async createContact(contact: Partial<Contact>) {
    return request('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
  },

  async updateContact(id: string, updates: Partial<Contact>) {
    return request(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async deleteContact(id: string) {
    return request(`/api/contacts/${id}`, { method: 'DELETE' });
  },

  async importContacts(contacts: any[]) {
    return request('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    });
  },

  // Groups
  async getGroups(): Promise<{ success: boolean; data: ContactGroup[] }> {
    return request('/api/groups');
  },

  async createGroup(name: string, description: string, contactIds: string[]) {
    return request('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, contactIds }),
    });
  },

  async updateGroup(id: string, updates: Partial<ContactGroup>) {
    return request(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async deleteGroup(id: string) {
    return request(`/api/groups/${id}`, { method: 'DELETE' });
  },

  // Consent
  async getConsentData(): Promise<{ success: boolean; data: { stats: any; records: ConsentRecord[]; standardWording: string } }> {
    return request('/api/consent');
  },

  async registerConsent(payload: {
    name: string;
    phone: string;
    businessName?: string;
    city?: string;
    category?: string;
    checkboxChecked: boolean;
    source?: string;
    evidence?: string;
  }) {
    return request('/api/consent/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async optOutContact(phone: string, source?: string) {
    return request('/api/consent/opt-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, source }),
    });
  },

  async optOut(phone: string, source?: string) {
    return this.optOutContact(phone, source);
  },

  // Messages & Inbox
  async getConversations(): Promise<{ success: boolean; data: Conversation[] }> {
    return request('/api/conversations');
  },

  async getMessages(params?: { conversationId?: string; search?: string; direction?: string; status?: string }): Promise<{ success: boolean; data: Message[] }> {
    const q = new URLSearchParams();
    if (params?.conversationId) q.append('conversationId', params.conversationId);
    if (params?.search) q.append('search', params.search);
    if (params?.direction) q.append('direction', params.direction);
    if (params?.status) q.append('status', params.status);
    return request(`/api/messages?${q.toString()}`);
  },

  async sendMessage(payload: { contactId?: string; phone?: string; content: string; category?: string; type?: string }) {
    return request('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async resolveConversation(id: string, resolved: boolean = true) {
    return request(`/api/conversations/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    });
  },

  async assignConversation(id: string, assignedTo: string) {
    return request(`/api/conversations/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }),
    });
  },

  // Templates
  async getTemplates(): Promise<{ success: boolean; data: MessageTemplate[] }> {
    return request('/api/templates');
  },

  async createTemplate(template: { name: string; category: string; body: string; variables: string[] }) {
    return request('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
  },

  async saveTemplate(template: any) {
    return this.createTemplate(template);
  },

  async deleteTemplate(id: string) {
    return request(`/api/templates/${id}`, { method: 'DELETE' });
  },

  // Campaigns
  async getCampaigns(): Promise<{ success: boolean; data: Campaign[] }> {
    return request('/api/campaigns');
  },

  async checkCampaignSafety(param1: any, param2?: string[]) {
    let targetGroupIds: string[] = [];
    let targetContactIds: string[] = [];
    if (Array.isArray(param1)) {
      targetGroupIds = param1;
      targetContactIds = param2 || [];
    } else if (param1 && typeof param1 === 'object') {
      targetGroupIds = param1.targetGroupIds || [];
      targetContactIds = param1.targetContactIds || [];
    }
    return request('/api/campaigns/safety-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetGroupIds, targetContactIds }),
    });
  },

  async createCampaign(campaignData: {
    name: string;
    targetGroupIds?: string[];
    targetContactIds?: string[];
    templateId?: string;
    customMessage?: string;
    launchNow?: boolean;
  }) {
    return request('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData),
    });
  },

  async pauseCampaign(id: string) {
    return request(`/api/campaigns/${id}/pause`, { method: 'POST' });
  },

  async resumeCampaign(id: string) {
    return request(`/api/campaigns/${id}/resume`, { method: 'POST' });
  },

  async cancelCampaign(id: string) {
    return request(`/api/campaigns/${id}/cancel`, { method: 'POST' });
  },

  async getConsentEvents(contactId?: string, phone?: string) {
    const q = new URLSearchParams();
    if (contactId) q.append('contactId', contactId);
    if (phone) q.append('phone', phone);
    return request(`/api/consent/events?${q.toString()}`);
  },

  // Auto Replies & Keywords
  async getAutoReplies(): Promise<{ success: boolean; data: AutoReplyRule[] }> {
    return request('/api/auto-replies');
  },

  async saveAutoReply(rule: Partial<AutoReplyRule>) {
    return request('/api/auto-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
  },

  async deleteAutoReply(id: string) {
    return request(`/api/auto-replies/${id}`, { method: 'DELETE' });
  },

  async getKeywordAutomations(): Promise<{ success: boolean; data: KeywordAutomation[] }> {
    return request('/api/keyword-automations');
  },

  async saveKeywordAutomation(auto: Partial<KeywordAutomation>) {
    return request('/api/keyword-automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auto),
    });
  },

  async deleteKeywordAutomation(id: string) {
    return request(`/api/keyword-automations/${id}`, { method: 'DELETE' });
  },

  async simulateKeyword(text: string, phone?: string) {
    return request('/api/keyword-automations/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, phone }),
    });
  },

  // Follow Ups
  async getFollowUps(): Promise<{ success: boolean; data: FollowUpSequence[] }> {
    return request('/api/follow-ups');
  },

  async saveFollowUp(sequence: Partial<FollowUpSequence>) {
    return request('/api/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sequence),
    });
  },

  // Smart Pacing
  async getPacingData(): Promise<{ success: boolean; data: { config: SmartPacingConfig; queue: MessageQueueItem[]; pacingState?: any } }> {
    return request('/api/pacing');
  },

  async updatePacingConfig(config: Partial<SmartPacingConfig>) {
    return request('/api/pacing/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  async setPacingMode(mode: 'AUTO' | 'MANUAL' | 'PAUSED') {
    return request('/api/pacing/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  },

  async clearQueue() {
    return request('/api/pacing/queue/clear', { method: 'POST' });
  },

  // Health
  async getAccountHealth(): Promise<{ success: boolean; data: AccountHealth }> {
    return request('/api/health');
  },

  // Analytics
  async getAnalytics(): Promise<{ success: boolean; data: any }> {
    return request('/api/analytics');
  },

  // Team
  async getTeam(): Promise<{ success: boolean; data: { members: TeamMember[]; currentUser: any } }> {
    return request('/api/team');
  },

  async switchRole(role: string, userId?: string) {
    return request('/api/team/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, userId }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ success: boolean; data: AuditLog[] }> {
    return request('/api/audit-logs');
  },

  // Backup & Restore
  getBackupDownloadUrl() {
    return '/api/backup/download';
  },

  async restoreBackup(backupData: any) {
    return request('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
  },

  // Settings
  async getSettings() {
    return request('/api/settings');
  },

  async updateSettings(settings: any) {
    return request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  // Environment management (DEMO vs LIVE)
  async getEnvironment(): Promise<{ success: boolean; data?: { environment: 'DEMO' | 'LIVE'; isDemoMode: boolean }; error?: string }> {
    return request('/api/environment');
  },

  async setEnvironment(environment: 'DEMO' | 'LIVE'): Promise<{ success: boolean; data?: { environment: 'DEMO' | 'LIVE'; isDemoMode: boolean }; error?: string }> {
    return request('/api/environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environment }),
    });
  },

  // Demo Reset
  async resetDemoData() {
    return request('/api/demo/reset', { method: 'POST' });
  },
};
