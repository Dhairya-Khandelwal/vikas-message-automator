import { db, isContactPromotionalConsentVerified } from './db';
import { whatsappAdapter } from './baileysAdapter';
import { MessageQueueItem, Contact, Message, MessageType, RetryErrorCategory } from '../src/types/index';
import { sqliteManager, getBusinessDateString } from './sqliteDb';
import { eventProcessor } from './eventProcessor';

/**
 * DEMO/LIVE transport separation (P0).
 * In DEMO mode we never touch the real WhatsApp socket.
 * Returns a simulated successful dispatch result.
 */
function isDemoEnvironment(): boolean {
  return db.getEnvironment() !== 'LIVE';
}

function simulateDemoDispatch(phone: string, content: string, idempotencyKey?: string): {
  success: true;
  messageId: string;
  status: 'SENT';
} {
  const fakeId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.log(`[DEMO] Simulated send to ${phone}: ${(content || '').slice(0, 80)}...`);
  return {
    success: true,
    messageId: fakeId,
    status: 'SENT',
  };
}

export interface DispatchValidationResult {
  valid: boolean;
  reason?: string;
  actionRequired?: 'PAUSE' | 'CANCEL' | 'FAIL';
  contact?: Contact;
}

export interface DispatchResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'FAILED';
  error?: string;
  errorCategory?: RetryErrorCategory;
  retrying?: boolean;
}

/**
 * Requirement 10: Error classification for reliable retry and safety handling.
 */
export function classifyDispatchError(errorMsg?: string): RetryErrorCategory {
  if (!errorMsg) return 'UNKNOWN';
  const msg = errorMsg.toLowerCase();

  if (
    msg.includes('disconnect') ||
    msg.includes('socket closed') ||
    msg.includes('auth_expired') ||
    msg.includes('logged out') ||
    msg.includes('unauthenticated') ||
    msg.includes('connection error')
  ) {
    return 'WHATSAPP_DISCONNECTED';
  }

  if (
    msg.includes('not on whatsapp') ||
    msg.includes('invalid') ||
    msg.includes('not registered') ||
    msg.includes('no whatsapp') ||
    msg.includes('jid') ||
    msg.includes('invalid recipient')
  ) {
    return 'INVALID_RECIPIENT';
  }

  if (
    msg.includes('opt-out') ||
    msg.includes('opted out') ||
    msg.includes('suppress') ||
    msg.includes('consent')
  ) {
    return 'CONSENT_WITHDRAWN';
  }

  if (
    msg.includes('rate') ||
    msg.includes('limit') ||
    msg.includes('429') ||
    msg.includes('restrict') ||
    msg.includes('banned') ||
    msg.includes('spam') ||
    msg.includes('blocked by whatsapp')
  ) {
    return 'RATE_LIMIT_RESTRICTION';
  }

  if (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('socket hang up') ||
    msg.includes('temporary') ||
    msg.includes('enotfound')
  ) {
    return 'TEMPORARY_NETWORK';
  }

  return 'UNKNOWN';
}

/**
 * Regex for promotional buzzwords to enforce anti-circumvention policy on transactional messages.
 */
export const PROMOTIONAL_CIRCUMVENTION_REGEX =
  /\b(sale|discount|deal|offer|special scheme|cashback|cash rebate|coupon|promo|limited time|buy now|\d+%\s*off)\b/i;

export class MessageDispatcher {
  /**
   * Comprehensive validation pipeline:
   * 1. Verify WhatsApp connection
   * 2. Verify recipient number formatting
   * 3. Verify suppression list (opted-out numbers)
   * 4. Verify recipient consent & category rules (promotional vs transactional separation)
   * 5. Verify campaign status (must not be PAUSED, CANCELLED, or COMPLETED)
   */
  public validateDispatch(params: {
    phone: string;
    contactId?: string;
    category?: string;
    campaignId?: string;
    content?: string;
    transactionReference?: string;
  }): DispatchValidationResult {
    const { phone, contactId, category, campaignId, content, transactionReference } = params;

    // 1. Verify recipient phone number format
    const cleanDigits = (phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      return {
        valid: false,
        actionRequired: 'FAIL',
        reason: `INVALID_PHONE_NUMBER: Phone number "${phone}" is invalid (must have at least 10 digits).`,
      };
    }

    // 2. Check suppression list (Opted-out or blocked numbers must never receive outbound campaigns)
    if (db.isSuppressed(phone)) {
      return {
        valid: false,
        actionRequired: 'CANCEL',
        reason: `SUPPRESSION_LIST_BLOCKED: Recipient ${phone} has opted out or is on the suppression list.`,
      };
    }

    const contact = contactId ? db.getContactById(contactId) : db.getContactByPhone(phone);

    // 3. Category policy checks (Requirement 7: Separate promotional and transactional rules)
    if (category === 'promotional') {
      // Requirement 6: Strict statutory consent verification
      const consentCheck = isContactPromotionalConsentVerified(contact);
      if (!consentCheck.verified) {
        const isOptedOut = contact?.consentStatus === 'OPTED_OUT';
        return {
          valid: false,
          actionRequired: isOptedOut ? 'CANCEL' : 'FAIL',
          reason: `CONSENT_BLOCKED: ${consentCheck.reason}`,
          contact,
        };
      }
    } else if (category === 'transactional') {
      // Requirement 7: Anti-circumvention check
      // "Never use the transactional category as a workaround for promotional restrictions."
      if (content && PROMOTIONAL_CIRCUMVENTION_REGEX.test(content)) {
        return {
          valid: false,
          actionRequired: 'FAIL',
          reason:
            'PROMOTIONAL_CIRCUMVENTION_DETECTED: Transactional messages cannot contain promotional marketing offers, discounts, or sales schemes. Use the promotional category with verified customer opt-in.',
          contact,
        };
      }
    }

    // 4. Verify campaign status (if attached to a campaign)
    if (campaignId) {
      const campaign = db.getCampaigns().find((c) => c.id === campaignId);
      if (!campaign) {
        return {
          valid: false,
          actionRequired: 'FAIL',
          reason: `CAMPAIGN_NOT_FOUND: Campaign ${campaignId} does not exist.`,
        };
      }

      if (campaign.status === 'PAUSED') {
        return {
          valid: false,
          actionRequired: 'PAUSE',
          reason: `CAMPAIGN_PAUSED: Campaign "${campaign.name}" is currently paused.`,
        };
      }

      if (campaign.status === 'CANCELLED') {
        return {
          valid: false,
          actionRequired: 'CANCEL',
          reason: `CAMPAIGN_CANCELLED: Campaign "${campaign.name}" has been cancelled.`,
        };
      }

      if (campaign.status === 'COMPLETED') {
        return {
          valid: false,
          actionRequired: 'CANCEL',
          reason: `CAMPAIGN_COMPLETED: Campaign "${campaign.name}" is already completed.`,
        };
      }
    }

    // 5. Verify WhatsApp connection — only required in LIVE mode.
    // DEMO mode must work offline / without a paired device.
    if (!isDemoEnvironment() && !whatsappAdapter.isConnected()) {
      return {
        valid: false,
        actionRequired: 'PAUSE',
        reason: 'WhatsApp device is not currently connected via Linked Devices. LIVE mode requires an active session.',
        contact,
      };
    }

    return {
      valid: true,
      contact,
    };
  }

  /**
   * Dispatches a queued message item through the authentic WhatsApp session.
   * Includes idempotency protection, JIT pre-send checks, and categorized retry backoff.
   */
  public async dispatchQueueItem(item: MessageQueueItem): Promise<DispatchResult> {
    const todayStr = getBusinessDateString();

    // Idempotency check: Reconcile if message has already been sent
    const idempotencyKey = item.idempotencyKey || `q-${item.id}`;
    item.idempotencyKey = idempotencyKey;

    if (sqliteManager.isIdempotencyKeyClaimed(idempotencyKey)) {
      item.status = 'SENT';
      item.connectionResponse = `Reconciled: Message was already dispatched (Idempotency key ${idempotencyKey})`;
      db.saveDatabase();
      return {
        success: true,
        messageId: idempotencyKey,
        status: 'SENT',
      };
    }

    // Run validation pipeline
    const validation = this.validateDispatch({
      phone: item.phone,
      contactId: item.contactId,
      category: item.category,
      campaignId: item.campaignId,
      content: item.content,
      transactionReference: item.transactionReference,
    });

    if (!validation.valid) {
      if (validation.actionRequired === 'PAUSE') {
        item.status = 'PAUSED';
        item.failureReason = validation.reason;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: validation.reason };
      }

      if (validation.actionRequired === 'CANCEL') {
        item.status = 'CANCELLED';
        item.failureReason = validation.reason;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: validation.reason };
      }

      // Mark as permanently failed
      item.status = 'FAILED';
      item.failureReason = validation.reason;
      sqliteManager.incrementDailyFailed(todayStr);

      // Update campaign stats only from confirmed events
      if (item.campaignId) {
        const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
        if (campaign) {
          campaign.stats.failed = (campaign.stats.failed || 0) + 1;
        }
      }

      db.saveDatabase();

      db.addAuditLog(
        'MESSAGE_DISPATCHER',
        'ADMIN',
        'DISPATCH_VALIDATION_BLOCKED',
        `Blocked queue dispatch to ${item.phone}: ${validation.reason}`
      );

      return { success: false, status: 'FAILED', error: validation.reason };
    }

    // Requirement 8: Check campaign status immediately before sending
    if (item.campaignId) {
      const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
      if (campaign && campaign.status !== 'RUNNING') {
        const haltStatus = campaign.status === 'PAUSED' ? 'PAUSED' : 'CANCELLED';
        item.status = haltStatus;
        item.failureReason = `Campaign "${campaign.name}" is ${campaign.status}. Dispatch halted immediately prior to sending.`;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: item.failureReason };
      }
    }

    // Mark as in-flight processing
    item.status = 'PROCESSING';
    db.saveDatabase();

    // CRUCIAL: Final just-in-time opt-out check immediately before actual transport call
    const isSuppressed = db.isSuppressed(item.phone);
    const latestContact = item.contactId ? db.getContactById(item.contactId) : db.getContactByPhone(item.phone);
    const isPromotional = item.category === 'promotional';

    if (isSuppressed || (isPromotional && latestContact && latestContact.consentStatus !== 'OPTED_IN')) {
      const abortReason = isSuppressed
        ? `Just-in-time opt-out check: Recipient ${item.phone} is on the global suppression list (opted out). Dispatch aborted immediately prior to socket transport.`
        : `Just-in-time opt-out check: Recipient ${item.phone} consent status is ${latestContact?.consentStatus || 'UNKNOWN'} (OPTED_IN required for promotional messages). Dispatch aborted immediately prior to socket transport.`;

      item.status = 'CANCELLED';
      item.failureReason = abortReason;
      db.saveDatabase();

      db.addAuditLog(
        'MESSAGE_DISPATCHER',
        'ADMIN',
        'JUST_IN_TIME_OPT_OUT_ABORT',
        `Aborted socket dispatch for queue item ${item.id} to ${item.phone} immediately prior to send: ${abortReason}`
      );

      return {
        success: false,
        status: 'FAILED',
        error: abortReason,
      };
    }

    // DEMO/LIVE separation: never call real WhatsApp socket in DEMO
    const demoMode = isDemoEnvironment();
    const result = demoMode
      ? simulateDemoDispatch(item.phone, item.content, idempotencyKey)
      : await whatsappAdapter.sendTextMessage(item.phone, item.content);

    if (result.success) {
      // 1. Initial status MUST be SENT, never automatically DELIVERED
      item.status = 'SENT';
      item.connectionResponse = demoMode
        ? `DEMO mode – message simulated (ID: ${result.messageId})`
        : `Dispatched via WhatsApp socket (ID: ${result.messageId})`;
      item.failureReason = undefined;

      // 2. Central Event Processor: Validate • Identify • Deduplicate • Store
      // Updates Inbox, registers Idempotency key, increments persistent daily counter, and records campaign stats
      eventProcessor.processEvent({
        type: 'OUTGOING_MESSAGE',
        whatsappMessageId: result.messageId,
        phone: item.phone,
        text: item.content,
        recipientName: item.customerName,
        contactId: validation.contact?.id || item.contactId,
        category: item.category,
        campaignId: item.campaignId,
        idempotencyKey,
        status: 'SENT',
        source: 'DISPATCHER',
        isDemo: demoMode,
      });

      // 3. Update campaign completion state if all pending items are now processed
      if (item.campaignId) {
        const remaining = db
          .getQueue()
          .filter((q) => q.campaignId === item.campaignId && (q.status === 'PENDING' || q.status === 'PROCESSING'));
        if (remaining.length === 0) {
          const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
          if (campaign) {
            campaign.status = 'COMPLETED';
          }
        }
      }

      db.saveDatabase();

      return {
        success: true,
        messageId: result.messageId,
        status: 'SENT',
      };
    } else {
      // Requirement 10: Categorize error and execute policy-driven retry/pause
      const category = classifyDispatchError(result.error);
      item.errorCategory = category;

      const maxRetries = item.maxRetries || 3;
      const currentRetry = item.retryCount || 0;

      if (category === 'TEMPORARY_NETWORK' && currentRetry < maxRetries) {
        // Exponential backoff: 30s * 2^retryCount
        const backoffSeconds = 30 * Math.pow(2, currentRetry);
        const nextRetryDate = new Date(Date.now() + backoffSeconds * 1000).toISOString();

        item.retryCount = currentRetry + 1;
        item.nextRetryAt = nextRetryDate;
        item.status = 'PENDING'; // Kept in queue for backoff retry
        item.failureReason = `Temporary network failure: ${result.error}. Backoff retry #${item.retryCount} scheduled at ${nextRetryDate}.`;

        db.saveDatabase();
        db.addAuditLog(
          'MESSAGE_DISPATCHER',
          'ADMIN',
          'DISPATCH_RETRY_SCHEDULED',
          `Queue item ${item.id} to ${item.phone} failed temporarily (${result.error}). Backoff retry #${item.retryCount} scheduled for ${nextRetryDate}.`
        );

        return {
          success: false,
          status: 'FAILED',
          error: item.failureReason,
          errorCategory: category,
          retrying: true,
        };
      } else if (category === 'WHATSAPP_DISCONNECTED') {
        item.status = 'PAUSED';
        item.failureReason = `WhatsApp socket disconnected: ${result.error}. Queue paused until reconnection.`;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: item.failureReason, errorCategory: category };
      } else if (category === 'INVALID_RECIPIENT') {
        item.status = 'FAILED';
        item.failureReason = `Permanent failure: Recipient ${item.phone} is invalid or not registered on WhatsApp.`;
        sqliteManager.incrementDailyFailed(todayStr);
        if (item.campaignId) {
          const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
          if (campaign) campaign.stats.failed = (campaign.stats.failed || 0) + 1;
        }
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: item.failureReason, errorCategory: category };
      } else if (category === 'CONSENT_WITHDRAWN') {
        item.status = 'CANCELLED';
        item.failureReason = `Cancelled: Customer opted out or revoked consent.`;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: item.failureReason, errorCategory: category };
      } else if (category === 'RATE_LIMIT_RESTRICTION') {
        item.status = 'PAUSED';
        item.failureReason = `Rate limit or restriction encountered: ${result.error}. Queue paused for account safety.`;
        db.saveDatabase();
        return { success: false, status: 'FAILED', error: item.failureReason, errorCategory: category };
      } else {
        // Unknown or max retries exceeded
        item.status = 'FAILED';
        item.failureReason = result.error || 'WhatsApp socket dispatch failed';
        sqliteManager.incrementDailyFailed(todayStr);

        if (item.campaignId) {
          const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
          if (campaign) campaign.stats.failed = (campaign.stats.failed || 0) + 1;
        }

        db.addAuditLog(
          'MESSAGE_DISPATCHER',
          'ADMIN',
          'DISPATCH_SOCKET_FAILURE',
          `Socket dispatch to ${item.phone} permanently failed: ${result.error}`
        );

        db.saveDatabase();

        return {
          success: false,
          status: 'FAILED',
          error: result.error,
          errorCategory: category,
        };
      }
    }
  }

  /**
   * Direct message dispatch (e.g. from 1-on-1 CRM chat or quick send)
   */
  public async dispatchDirectMessage(params: {
    phone: string;
    contactId?: string;
    content: string;
    category?: 'promotional' | 'transactional' | 'support' | 'auto_reply';
    type?: MessageType;
    transactionReference?: string;
  }): Promise<{ success: boolean; message?: Message; error?: string }> {
    const { phone, contactId, content, category, type, transactionReference } = params;

    const validation = this.validateDispatch({
      phone,
      contactId,
      category: category || 'support',
      content,
      transactionReference,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    // CRUCIAL: Final JIT check immediately before direct send
    if (category === 'promotional') {
      const isSuppressed = db.isSuppressed(phone);
      const currentContact = contactId ? db.getContactById(contactId) : db.getContactByPhone(phone);
      const consentCheck = isContactPromotionalConsentVerified(currentContact);
      if (isSuppressed || !consentCheck.verified) {
        const errorMsg = isSuppressed
          ? `Recipient ${phone} is on suppression list (opted out). Send aborted immediately before transport.`
          : `Recipient ${phone} promotional consent unverified: ${consentCheck.reason}. Send aborted.`;
        return {
          success: false,
          error: errorMsg,
        };
      }
    }

    // DEMO/LIVE separation: never call real WhatsApp socket in DEMO
    const demoMode = isDemoEnvironment();
    const transportResult = demoMode
      ? simulateDemoDispatch(phone, content)
      : await whatsappAdapter.sendTextMessage(phone, content);

    const contact = validation.contact || (contactId ? db.getContactById(contactId) : db.getContactByPhone(phone));
    const recipientPhone = contact?.phone || phone;

    // Route outbound event through central event processor (Validate • Identify • Deduplicate • Store)
    const eventOutcome = eventProcessor.processEvent({
      type: 'OUTGOING_MESSAGE',
      whatsappMessageId: transportResult.messageId,
      phone: recipientPhone,
      text: content,
      recipientName: contact?.name || 'Customer',
      contactId: contact?.id,
      category: category || 'support',
      status: transportResult.success ? 'SENT' : 'FAILED',
      failureReason: (transportResult as any).error,
      source: 'DISPATCHER',
      isDemo: demoMode,
    });

    return {
      success: transportResult.success,
      message: eventOutcome.message || undefined,
      error: transportResult.error,
    };
  }
}

export const messageDispatcher = new MessageDispatcher();
