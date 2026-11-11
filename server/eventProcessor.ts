import { db, normalizePhoneDigits, arePhonesMatching, OPT_OUT_KEYWORDS } from './db';
import { sqliteManager, getBusinessDateString } from './sqliteDb';
import {
  Contact,
  Message,
  Conversation,
  MessageStatus,
  MessageCategory,
  WhatsAppConnectionInfo,
} from '../src/types/index';

export type WhatsAppEventType =
  | 'INCOMING_MESSAGE'
  | 'OUTGOING_MESSAGE'
  | 'RECEIPT'
  | 'DISCONNECT';

export interface BaseWhatsAppEvent {
  id?: string;
  type: WhatsAppEventType;
  timestamp?: string;
  source?: 'BAILEYS_SOCKET' | 'DISPATCHER' | 'SIMULATION' | 'API';
}

export interface IncomingMessageEvent extends BaseWhatsAppEvent {
  type: 'INCOMING_MESSAGE';
  whatsappMessageId?: string;
  phone: string;
  text: string;
  senderName?: string;
  mediaUrl?: string;
  isDemo?: boolean;
}

export interface OutgoingMessageEvent extends BaseWhatsAppEvent {
  type: 'OUTGOING_MESSAGE';
  whatsappMessageId?: string;
  phone: string;
  text: string;
  recipientName?: string;
  contactId?: string;
  category?: 'promotional' | 'transactional' | 'support' | 'auto_reply';
  campaignId?: string;
  conversationId?: string;
  idempotencyKey?: string;
  status?: MessageStatus;
  failureReason?: string;
  isDemo?: boolean;
}

export interface ReceiptEvent extends BaseWhatsAppEvent {
  type: 'RECEIPT';
  whatsappMessageId: string;
  phone?: string;
  receiptStatus: 'DELIVERED' | 'READ';
  timestamp?: string;
}

export interface DisconnectEvent extends BaseWhatsAppEvent {
  type: 'DISCONNECT';
  reason?: string;
  statusCode?: number;
  isLoggedOut?: boolean;
  timestamp?: string;
}

export type WhatsAppEvent =
  | IncomingMessageEvent
  | OutgoingMessageEvent
  | ReceiptEvent
  | DisconnectEvent;

export interface EventProcessorResult<T = any> {
  success: boolean;
  eventId: string;
  eventType: WhatsAppEventType;
  deduplicated?: boolean;
  contact?: Contact | null;
  message?: Message | null;
  conversation?: Conversation | null;
  replyAction?: {
    type: 'OPT_OUT' | 'AUTO_REPLY' | 'KEYWORD_MATCH' | 'NONE';
    replyText?: string;
    targetPhone?: string;
    outboundMessageId?: string;
    title?: string;
    rule?: string;
  };
  error?: string;
  details?: T;
}

/**
 * Checks if incoming text matches statutory opt-out keywords.
 * Recognizes at least: STOP, UNSUBSCRIBE, CANCEL, END, QUIT, REMOVE
 * with case-insensitivity, leading/trailing whitespace, and trailing punctuation.
 */
export function isOptOutMessage(text: string, customKeywords?: string[]): boolean {
  if (!text) return false;
  const clean = text
    .trim()
    .toUpperCase()
    .replace(/[.!?,;:\-_/\\]+$/, '')
    .trim();

  const keywords = customKeywords && customKeywords.length > 0 ? customKeywords : OPT_OUT_KEYWORDS;

  for (const kw of keywords) {
    const cleanKw = kw.trim().toUpperCase();
    if (clean === cleanKw) return true;
    if (clean === `PLEASE ${cleanKw}` || clean === `PLZ ${cleanKw}`) return true;
    if (clean.startsWith(`${cleanKw} `)) return true;
  }

  // Exact standalone regex match on standard keywords
  const standardRegex = /^(STOP|UNSUBSCRIBE|CANCEL|END|QUIT|REMOVE|STOPALL|OPTOUT|NOMORE)(\s+.*)?$/i;
  return standardRegex.test(clean);
}

/**
 * Central WhatsApp Event Processor
 *
 * Implements the core architecture:
 * Actual WhatsApp event -> Event processor (Validate • Identify • Deduplicate • Store)
 * -> Downstream Subsystems:
 *    - Inbox (Conversation history & customer replies)
 *    - Automation (Keyword rules & relevant replies)
 *    - Consent engine (STOP & suppression)
 *    - Analytics (Actual message events & failures)
 */
export class WhatsAppEventProcessor {
  // In-memory sliding-window cache for rapid deduplication
  private processedMessageIds = new Set<string>();
  private processedReceipts = new Map<string, 'DELIVERED' | 'READ'>();

  /**
   * Main entry point for all WhatsApp events (Validate • Identify • Deduplicate • Store)
   */
  public processEvent(event: WhatsAppEvent): EventProcessorResult {
    const eventId = event.id || 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    switch (event.type) {
      case 'INCOMING_MESSAGE':
        return this.processIncomingMessage(event as IncomingMessageEvent, eventId);
      case 'OUTGOING_MESSAGE':
        return this.processOutgoingMessage(event as OutgoingMessageEvent, eventId);
      case 'RECEIPT':
        return this.processReceipt(event as ReceiptEvent, eventId);
      case 'DISCONNECT':
        return this.processDisconnect(event as DisconnectEvent, eventId);
      default:
        return {
          success: false,
          eventId,
          eventType: (event as any).type,
          error: `Unknown event type: ${(event as any).type}`,
        };
    }
  }

  public async processEventAsync(event: WhatsAppEvent): Promise<EventProcessorResult> {
    return this.processEvent(event);
  }

  /**
   * INCOMING MESSAGE PIPELINE:
   * 1. Validate: format & text presence
   * 2. Identify: contact & conversation resolution
   * 3. Deduplicate: check whatsappMessageId
   * 4. Store: CRM message & conversation update
   * -> Subsystems: Consent Engine (STOP check), Automation (Keyword & Auto-reply), Inbox
   */
  private processIncomingMessage(event: IncomingMessageEvent, eventId: string): EventProcessorResult {
    // Stage 1: Validate
    const phone = (event.phone || '').trim();
    const text = (event.text || '').trim();

    if (!phone) {
      return {
        success: false,
        eventId,
        eventType: 'INCOMING_MESSAGE',
        error: 'Validation failed: phone number is required',
      };
    }
    if (!text) {
      return {
        success: false,
        eventId,
        eventType: 'INCOMING_MESSAGE',
        error: 'Validation failed: message text is required',
      };
    }

    const cleanDigits = normalizePhoneDigits(phone);
    if (cleanDigits.length < 10) {
      return {
        success: false,
        eventId,
        eventType: 'INCOMING_MESSAGE',
        error: `Validation failed: invalid phone digits (${cleanDigits})`,
      };
    }

    // Stage 2: Identify contact and conversation
    let contact = db.getContactByPhone(phone);
    const conversationId = 'conv-' + (contact?.id || cleanDigits);
    const customerDisplayName = contact?.name || event.senderName || 'Valued Customer';
    const isLive = db.getEnvironment() === 'LIVE';
    const isDemo = event.isDemo !== undefined ? event.isDemo : !isLive;

    // Stage 3: Deduplicate
    if (event.whatsappMessageId) {
      if (this.processedMessageIds.has(event.whatsappMessageId)) {
        return {
          success: true,
          eventId,
          eventType: 'INCOMING_MESSAGE',
          deduplicated: true,
          contact,
        };
      }
      // Check database messages
      const existing = db.getMessages().find((m) => m.whatsappMessageId === event.whatsappMessageId);
      if (existing) {
        this.processedMessageIds.add(event.whatsappMessageId);
        return {
          success: true,
          eventId,
          eventType: 'INCOMING_MESSAGE',
          deduplicated: true,
          contact,
          message: existing,
        };
      }
      this.processedMessageIds.add(event.whatsappMessageId);
      // Keep cache size bounded
      if (this.processedMessageIds.size > 2000) {
        const first = this.processedMessageIds.values().next().value;
        if (first) this.processedMessageIds.delete(first);
      }
    }

    // Stage 4: Store in Inbox (Message history & Conversation)
    const storedMessage = db.addMessage({
      whatsappMessageId: event.whatsappMessageId,
      conversationId,
      contactId: contact?.id || 'unregistered',
      customerName: customerDisplayName,
      phone,
      direction: 'inbound',
      type: 'text',
      content: text,
      status: 'DELIVERED',
      category: 'support',
      isDemo,
      mediaUrl: event.mediaUrl,
    });

    const conversation = db.getConversations().find((c) => c.id === conversationId) || null;

    // --- Subsystem: Consent Engine (STOP & Opt-out Check) ---
    const settings = db.getSettings();
    if (isOptOutMessage(text, settings?.optOutKeywords)) {
      // 1. Mark customer OPTED_OUT in CRM
      const optOutResult = db.handleCustomerOptOut(
        phone,
        `Inbound WhatsApp message: "${text}"`,
        customerDisplayName
      );

      // 2. Prepare official acknowledgement message
      const ackContent =
        'You have been successfully unsubscribed from promotional updates from Vikas Automobiles, Satna. You will not receive promotional messages. Reply START to resubscribe.';

      // Store outbound acknowledgement in CRM (Inbox)
      const ackMsg = db.addMessage({
        conversationId,
        contactId: contact?.id || 'unregistered',
        customerName: customerDisplayName,
        phone,
        direction: 'outbound',
        type: 'text',
        content: ackContent,
        status: 'SENT',
        category: 'transactional',
        isDemo,
      });

      return {
        success: true,
        eventId,
        eventType: 'INCOMING_MESSAGE',
        contact: optOutResult.contact || contact,
        message: storedMessage,
        conversation,
        replyAction: {
          type: 'OPT_OUT',
          replyText: ackContent,
          targetPhone: phone,
          outboundMessageId: ackMsg.id,
        },
        details: {
          cancelledQueueItems: optOutResult.cancelledCount,
          optOutTimestamp: optOutResult.timestamp,
        },
      };
    }

    // --- Subsystem: Automation (Keyword rules, Auto-replies, Follow-up sequence cancellation) ---
    const normalizedText = text.trim().toUpperCase();

    // 1. Keyword Automations
    const keywordRules = db.getKeywordAutomations().filter((k) => k.enabled);
    for (const rule of keywordRules) {
      let matched = false;
      const kw = rule.keyword.toUpperCase();

      if (rule.matchType === 'EXACT') matched = normalizedText === kw;
      else if (rule.matchType === 'PARTIAL') matched = normalizedText.includes(kw);
      else if (rule.matchType === 'CASE_INSENSITIVE') matched = normalizedText === kw;

      if (matched) {
        rule.triggerCount = (rule.triggerCount || 0) + 1;
        db.saveDatabase();

        let replyText = rule.actions.sendReply;
        let outboundMsgId: string | undefined;

        if (replyText) {
          const outMsg = db.addMessage({
            conversationId,
            contactId: contact?.id || 'unregistered',
            customerName: customerDisplayName,
            phone,
            direction: 'outbound',
            type: 'text',
            content: replyText,
            status: 'SENT',
            category: 'auto_reply',
            isDemo,
          });
          outboundMsgId = outMsg.id;
        }

        // Apply automation side-effects (tagging, group assignment)
        if (contact && rule.actions.addTag) {
          const tag = rule.actions.addTag.trim();
          if (!contact.tags.includes(tag)) {
            contact.tags.push(tag);
            db.updateContact(contact.id, { tags: contact.tags });
          }
        }

        return {
          success: true,
          eventId,
          eventType: 'INCOMING_MESSAGE',
          contact,
          message: storedMessage,
          conversation,
          replyAction: {
            type: 'KEYWORD_MATCH',
            replyText,
            targetPhone: phone,
            outboundMessageId: outboundMsgId,
            rule: rule.title,
          },
        };
      }
    }

    // 2. Auto-Replies
    const autoReplies = db.getAutoReplies().filter((a) => a.enabled);
    for (const ar of autoReplies) {
      const trigger = ar.triggerKeyword.toUpperCase();
      let matched = false;
      if (ar.matchType === 'EXACT') matched = normalizedText === trigger;
      else if (ar.matchType === 'CONTAINS') matched = normalizedText.includes(trigger);
      else if (ar.matchType === 'STARTS_WITH') matched = normalizedText.startsWith(trigger);

      if (matched) {
        const outMsg = db.addMessage({
          conversationId,
          contactId: contact?.id || 'unregistered',
          customerName: customerDisplayName,
          phone,
          direction: 'outbound',
          type: 'text',
          content: ar.response,
          status: 'SENT',
          category: 'auto_reply',
          isDemo,
        });

        return {
          success: true,
          eventId,
          eventType: 'INCOMING_MESSAGE',
          contact,
          message: storedMessage,
          conversation,
          replyAction: {
            type: 'AUTO_REPLY',
            replyText: ar.response,
            targetPhone: phone,
            outboundMessageId: outMsg.id,
            title: ar.title,
          },
        };
      }
    }

    // Standard incoming message without automation trigger
    return {
      success: true,
      eventId,
      eventType: 'INCOMING_MESSAGE',
      contact,
      message: storedMessage,
      conversation,
      replyAction: {
        type: 'NONE',
      },
    };
  }

  /**
   * OUTGOING MESSAGE PIPELINE:
   * 1. Validate: phone, text, recipient
   * 2. Identify: contact & conversation resolution
   * 3. Deduplicate: idempotencyKey verification
   * 4. Store: message & update conversation
   * -> Subsystems: Analytics (Daily counter & campaign metrics), Inbox
   */
  private processOutgoingMessage(event: OutgoingMessageEvent, eventId: string): EventProcessorResult {
    // Stage 1: Validate
    const phone = (event.phone || '').trim();
    const text = (event.text || '').trim();

    if (!phone) {
      return {
        success: false,
        eventId,
        eventType: 'OUTGOING_MESSAGE',
        error: 'Validation failed: recipient phone number is required',
      };
    }
    if (!text) {
      return {
        success: false,
        eventId,
        eventType: 'OUTGOING_MESSAGE',
        error: 'Validation failed: outbound text content is required',
      };
    }

    const cleanDigits = normalizePhoneDigits(phone);
    if (cleanDigits.length < 10) {
      return {
        success: false,
        eventId,
        eventType: 'OUTGOING_MESSAGE',
        error: `Validation failed: invalid phone digits (${cleanDigits})`,
      };
    }

    // Stage 2: Identify contact and conversation
    const contact = event.contactId
      ? db.getContactById(event.contactId) || db.getContactByPhone(phone)
      : db.getContactByPhone(phone);

    const conversationId = event.conversationId || 'conv-' + (contact?.id || cleanDigits);
    const recipientDisplayName = event.recipientName || contact?.name || 'Customer';
    const isLive = db.getEnvironment() === 'LIVE';
    const isDemo = event.isDemo !== undefined ? event.isDemo : !isLive;

    // Stage 3: Deduplicate (Idempotency Key & Message ID)
    if (event.idempotencyKey) {
      const isAlreadySent = sqliteManager.isIdempotencyKeyClaimed(event.idempotencyKey);
      if (isAlreadySent) {
        return {
          success: true,
          eventId,
          eventType: 'OUTGOING_MESSAGE',
          deduplicated: true,
          contact,
        };
      }
    }

    if (event.whatsappMessageId) {
      const existing = db.getMessages().find((m) => m.whatsappMessageId === event.whatsappMessageId);
      if (existing) {
        return {
          success: true,
          eventId,
          eventType: 'OUTGOING_MESSAGE',
          deduplicated: true,
          contact,
          message: existing,
        };
      }
    }

    // Stage 4: Store in Inbox (Message history & Conversation)
    const storedStatus = event.status || 'SENT';
    const storedMessage = db.addMessage({
      whatsappMessageId: event.whatsappMessageId,
      conversationId,
      contactId: contact?.id || 'unregistered',
      customerName: recipientDisplayName,
      phone,
      direction: 'outbound',
      type: 'text',
      content: text,
      status: storedStatus,
      category: event.category || 'promotional',
      campaignId: event.campaignId,
      idempotencyKey: event.idempotencyKey,
      failureReason: event.failureReason,
      isDemo,
    });

    const conversation = db.getConversations().find((c) => c.id === conversationId) || null;

    // --- Subsystem: Analytics & Persistent Counters ---
    const todayStr = getBusinessDateString();
    if (storedStatus === 'SENT') {
      sqliteManager.incrementDailySent(todayStr);

      // Record idempotency key if present
      if (event.idempotencyKey) {
        sqliteManager.recordIdempotencyKey(
          event.idempotencyKey,
          storedMessage.id,
          phone,
          event.whatsappMessageId
        );
      }

      // Update campaign stats if sent as part of a campaign
      if (event.campaignId) {
        const campaign = db.getCampaigns().find((c) => c.id === event.campaignId);
        if (campaign) {
          campaign.stats.sent = (campaign.stats.sent || 0) + 1;
          db.saveDatabase();
        }
      }
    } else if (storedStatus === 'FAILED') {
      sqliteManager.incrementDailyFailed(todayStr);

      if (event.campaignId) {
        const campaign = db.getCampaigns().find((c) => c.id === event.campaignId);
        if (campaign) {
          campaign.stats.failed = (campaign.stats.failed || 0) + 1;
          db.saveDatabase();
        }
      }
    }

    return {
      success: true,
      eventId,
      eventType: 'OUTGOING_MESSAGE',
      contact,
      message: storedMessage,
      conversation,
    };
  }

  /**
   * RECEIPT PIPELINE:
   * 1. Validate: whatsappMessageId & receiptStatus
   * 2. Identify: locate outbound message in CRM
   * 3. Deduplicate: ensure monotonic progression (SENT -> DELIVERED -> READ)
   * 4. Store: update message status in CRM
   * -> Subsystems: Analytics (Campaign delivered/read counts), Inbox
   */
  private processReceipt(event: ReceiptEvent, eventId: string): EventProcessorResult {
    // Stage 1: Validate
    const waId = (event.whatsappMessageId || '').trim();
    const receiptStatus = event.receiptStatus;

    if (!waId) {
      return {
        success: false,
        eventId,
        eventType: 'RECEIPT',
        error: 'Validation failed: whatsappMessageId is required for delivery receipt',
      };
    }
    if (receiptStatus !== 'DELIVERED' && receiptStatus !== 'READ') {
      return {
        success: false,
        eventId,
        eventType: 'RECEIPT',
        error: `Validation failed: invalid receiptStatus "${receiptStatus}"`,
      };
    }

    // Stage 2: Identify message in CRM
    const msg = db.getMessages().find(
      (m) => m.id === waId || (m.whatsappMessageId && m.whatsappMessageId === waId)
    );

    if (!msg) {
      return {
        success: false,
        eventId,
        eventType: 'RECEIPT',
        error: `Message with ID/WA-ID "${waId}" not found in CRM database`,
      };
    }

    // Stage 3: Deduplicate (Monotonic state machine: SENT -> DELIVERED -> READ)
    const prevStatus = msg.status;
    if (prevStatus === 'READ') {
      // Already read, duplicate receipt ignored
      return {
        success: true,
        eventId,
        eventType: 'RECEIPT',
        deduplicated: true,
        message: msg,
      };
    }
    if (prevStatus === 'DELIVERED' && receiptStatus === 'DELIVERED') {
      // Duplicate delivery receipt ignored
      return {
        success: true,
        eventId,
        eventType: 'RECEIPT',
        deduplicated: true,
        message: msg,
      };
    }

    // Stage 4: Store advancement in CRM
    const updated = db.updateMessageDeliveryReceipt(waId, receiptStatus);

    return {
      success: updated,
      eventId,
      eventType: 'RECEIPT',
      message: msg,
      details: {
        previousStatus: prevStatus,
        newStatus: receiptStatus,
        campaignId: msg.campaignId,
      },
    };
  }

  /**
   * DISCONNECT PIPELINE:
   * 1. Validate: disconnect reason & status code
   * 2. Identify: active connection state
   * 3. Deduplicate: prevent flapping duplicate disconnect side-effects
   * 4. Store: update connection info in database
   * -> Subsystems: Queue Safety (auto-pause active queue to protect account), Health Monitor
   */
  private processDisconnect(event: DisconnectEvent, eventId: string): EventProcessorResult {
    const currentConn = db.getConnectionInfo();

    // Stage 3: Deduplicate (if already disconnected and logged out)
    if (currentConn.state === 'DISCONNECTED' && event.isLoggedOut) {
      return {
        success: true,
        eventId,
        eventType: 'DISCONNECT',
        deduplicated: true,
      };
    }

    // Stage 4: Store in connection state
    const newState = event.isLoggedOut ? 'DISCONNECTED' : 'CONNECTION_ERROR';
    const errorMsg = event.reason || `Socket disconnected (code ${event.statusCode || 'unknown'})`;

    db.updateConnectionInfo({
      state: newState,
      errorMessage: errorMsg,
      qrCodeDataUrl: null,
    });

    // Subsystem: Queue Safety & Smart Pacing Auto-Pause
    // When WhatsApp disconnects, immediately pause pacing queue to prevent message loss
    const pacingState = db.getPacingState();
    pacingState.autoPausedAt = new Date().toISOString();
    pacingState.autoPauseReason = `WhatsApp socket disconnected: ${errorMsg}`;
    db.updatePacingState(pacingState);

    db.addAuditLog(
      'SYSTEM_EVENT_PROCESSOR',
      'ADMIN',
      'WHATSAPP_DISCONNECTED',
      `Central Event Processor recorded socket disconnection: ${errorMsg}. Pacing queue paused for safety.`
    );

    return {
      success: true,
      eventId,
      eventType: 'DISCONNECT',
      details: {
        state: newState,
        errorMessage: errorMsg,
      },
    };
  }
}

export const eventProcessor = new WhatsAppEventProcessor();
