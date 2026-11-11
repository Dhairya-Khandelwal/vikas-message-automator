export type CustomerCategory =
  | 'Retailers'
  | 'Mechanics'
  | 'Workshops'
  | 'Automobile Dealers'
  | 'Distributors'
  | 'Industrial Customers'
  | 'Individual Customers'
  | 'Other';

export type ConsentStatus =
  | 'OPTED_IN'
  | 'PENDING'
  | 'NOT_GIVEN'
  | 'OPTED_OUT'
  | 'EXPIRED'
  | 'BLOCKED';

export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REVOKED' | 'REJECTED';

export interface Contact {
  id: string;
  name: string;
  phone: string; // e.g. +91 9827003016
  businessName: string;
  city: string;
  category: CustomerCategory;
  productInterest: string;
  notes: string;
  tags: string[];
  consentStatus: ConsentStatus;
  consentDate?: string;
  consentSource?: string;
  consentEvidence?: string;
  evidenceReference?: string;
  consentWordingVersion?: string;
  permissionCategories?: string[];
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  lastInteraction?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface ConsentEvent {
  id: string;
  contactId: string;
  phone: string;
  customerName?: string;
  eventType: 'OPT_IN' | 'OPT_OUT' | 'CONSENT_VERIFIED' | 'CONSENT_REVOKED' | 'STATUS_CHANGE';
  consentStatus: ConsentStatus;
  consentSource?: string;
  consentDate: string;
  evidenceReference?: string;
  consentWordingVersion?: string;
  permissionCategories?: string[];
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  timestamp: string;
}

export type AppEnvironment = 'DEMO' | 'LIVE';

export interface ConsentRecord {
  id: string;
  contactId: string;
  customerName: string;
  phone: string;
  consentStatus: ConsentStatus;
  consentDate: string;
  consentSource: string; // e.g. 'Website Form', 'QR-Code Form', 'In-Store Physical Job Card', 'In-Bound WhatsApp Opt-in'
  consentEvidence: string;
  evidenceReference?: string;
  consentWordingVersion: string;
  permissionCategories: string[];
  verificationStatus?: VerificationStatus;
  lastReminderDate?: string;
  optOutDate?: string;
  optOutSource?: string;
  reviewDate?: string;
  isDemo?: boolean;
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  criteria?: string;
  contactIds: string[];
  createdAt: string;
  isDemo?: boolean;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'template' | 'document' | 'system';
export type MessageStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED'
  | 'PAUSED';

export type MessageCategory = 'promotional' | 'transactional' | 'support' | 'auto_reply';

export interface Message {
  id: string;
  whatsappMessageId?: string;
  conversationId: string;
  contactId: string;
  customerName: string;
  phone: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  timestamp: string;
  status: MessageStatus;
  category?: MessageCategory;
  campaignId?: string;
  transactionReference?: string;
  idempotencyKey?: string;
  failureReason?: string;
  isDemo?: boolean;
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  customerName: string;
  phone: string;
  businessName: string;
  category: CustomerCategory;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  resolved: boolean;
  assignedTo?: string; // Team member ID
  consentStatus: ConsentStatus;
  isDemo?: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[]; // e.g. ['name', 'city', 'business', 'product']
  createdAt: string;
  lastUsed?: string;
}

export interface Campaign {
  id: string;
  name: string;
  targetGroupIds: string[];
  targetContactIds: string[];
  templateId?: string;
  customMessage: string;
  scheduledAt?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  isDemo?: boolean;
  stats: {
    totalTargeted: number;
    eligibleOptedIn: number;
    pendingConsentBlocked: number;
    optedOutBlocked: number;
    invalidOrDuplicateBlocked: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export interface AutoReplyRule {
  id: string;
  title: string;
  triggerKeyword: string;
  matchType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH';
  response: string;
  priority: number;
  isAwayOnly: boolean;
  enabled: boolean;
}

export interface KeywordAutomation {
  id: string;
  title: string;
  keyword: string;
  matchType: 'EXACT' | 'PARTIAL' | 'CASE_INSENSITIVE';
  actions: {
    sendReply?: string;
    addTag?: string;
    addToGroup?: string;
    assignTo?: string;
    notifyAdmin?: boolean;
    createFollowUpTask?: string;
  };
  enabled: boolean;
  triggerCount: number;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  targetCategory: CustomerCategory | 'All';
  enabled: boolean;
  steps: {
    stepNumber: number;
    delayDays: number;
    delayHours: number;
    title: string;
    templateId?: string;
    messageText: string;
  }[];
}

export type PacingMode = 'AUTO' | 'MANUAL' | 'PAUSED';

export interface SmartPacingConfig {
  mode: PacingMode;
  minIntervalSeconds: number; // e.g. 10
  batchSize: number; // e.g. 15
  pauseBetweenBatchesMinutes: number; // e.g. 5
  dailyCampaignCap: number; // e.g. 200
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "20:00"
  autoCalculatedInterval: number; // dynamically computed
  reasonForAdjustment?: string;
}

export type RetryErrorCategory =
  | 'TEMPORARY_NETWORK'
  | 'WHATSAPP_DISCONNECTED'
  | 'INVALID_RECIPIENT'
  | 'CONSENT_WITHDRAWN'
  | 'RATE_LIMIT_RESTRICTION'
  | 'UNKNOWN';

export interface MessageQueueItem {
  id: string;
  contactId: string;
  phone: string;
  customerName: string;
  campaignId?: string;
  category: 'promotional' | 'transactional' | 'support' | 'auto_reply';
  content: string;
  scheduledAt: string;
  status: MessageStatus;
  retryCount: number;
  maxRetries?: number;
  nextRetryAt?: string;
  errorCategory?: RetryErrorCategory;
  idempotencyKey?: string;
  transactionReference?: string;
  connectionResponse?: string;
  failureReason?: string;
  claimedBy?: string;
  claimedAt?: string;
}

export type ConnectionState =
  | 'DISCONNECTED'
  | 'INITIALIZING'
  | 'WAITING_FOR_QR'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'AUTH_EXPIRED'
  | 'CONNECTION_ERROR';

export type WhatsAppAdapterMode = 'LIVE_WHATSAPP_SOCKET' | 'DEMO_SIMULATION' | 'LOCAL_BRIDGE';

export interface WhatsAppConnectionInfo {
  state: ConnectionState;
  qrCodeDataUrl: string | null;
  linkedNumber: string | null;
  linkedName: string | null;
  lastConnectedTime: string | null;
  lastSyncTime: string | null;
  errorMessage: string | null;
  adapterMode: WhatsAppAdapterMode;
  disclaimerAccepted: boolean;
  qrExpiresAt?: string | null;
  qrRefreshCount?: number;
}

export type HealthStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export interface AccountHealth {
  status: HealthStatus;
  connectionStatus: string;
  authenticationStatus: string;
  recentConnectionFailures: number;
  messageFailures: number;
  queueStatus: string;
  activeCampaigns: number;
  pausedCampaigns: number;
  lastSuccessfulMessage: string | null;
  warnings: string[];
  statusReason?: string;
  technicalDisclaimer?: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatarColor: string;
  active: boolean;
  passwordHash?: string;
}

export interface PersistentPacingState {
  lastMessageSentAt: string | null;
  batchStartedAt: string | null;
  batchCompletedAt: string | null;
  nextEligibleSendAt: string | null;
  dailyCount: number;
  dailyCounterDate: string; // YYYY-MM-DD
  currentBatchCount: number;
  consecutiveErrors?: number;
  lastError?: string | null;
  autoPausedAt?: string | null;
  autoPauseReason?: string | null;
  workerLock?: {
    lockedAt: string;
    workerId: string;
  } | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  filename: string;
  sizeBytes: number;
  recordCounts: {
    contacts: number;
    messages: number;
    campaigns: number;
    consentRecords: number;
  };
}

export interface BusinessSettings {
  businessName: string;
  businessType: string;
  location: string;
  contactNumber: string;
  gstin: string;
  address: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  optOutKeywords: string[];
  isDemoMode: boolean;
  environment: AppEnvironment;
}

