import { db, isContactPromotionalConsentVerified } from './db';
import { MessageQueueItem, SmartPacingConfig, Contact } from '../src/types/index';
import { whatsappAdapter } from './baileysAdapter';
import { eventProcessor } from './eventProcessor';

export const OPT_OUT_KEYWORDS = [
  'STOP',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'REMOVE',
];

/**
 * Recognizes opt-out intent with case-insensitivity, whitespace trimming,
 * trailing punctuation removal, and natural language variants (e.g. "please stop", "unsubscribe me", "stop all").
 */
export function isOptOutMessage(rawText: string, customKeywords: string[] = []): boolean {
  if (!rawText || typeof rawText !== 'string') return false;

  const trimmed = rawText.trim();
  if (!trimmed) return false;

  // Strip leading and trailing punctuation (e.g. "stop.", "!STOP!", "¿cancel?", "unsubscribe...")
  const clean = trimmed.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '').trim().toUpperCase();
  if (!clean) return false;

  const allKeywords = Array.from(
    new Set([
      ...OPT_OUT_KEYWORDS,
      ...customKeywords.map((k) => k.trim().toUpperCase()),
    ])
  );

  // 1. Direct exact match against any keyword (e.g., "STOP", "unsubscribe", "QUIT")
  if (allKeywords.includes(clean)) {
    return true;
  }

  // 2. Strict phrase matching for natural user variations:
  // e.g. "PLEASE STOP", "STOP PLEASE", "STOP ALL", "UNSUBSCRIBE ME", "REMOVE ME", "OPT OUT", "NO MORE"
  const phraseRegex = /^(?:PLEASE\s+)?(STOP|UNSUBSCRIBE|CANCEL|END|QUIT|REMOVE|OPT OUT|NO MORE)(?:\s+(?:ALL|ME|PLEASE|NOW|MY NUMBER|PROMOS?|UPDATES?|MESSAGES?|BROADCASTS?|SUBSCRIPTION))?$/i;
  if (phraseRegex.test(clean)) {
    return true;
  }

  // 3. Exact word boundary check for very short command messages (e.g., "STOP SENDING", "QUIT NOW")
  const tokens = clean.split(/\s+/);
  if (tokens.length <= 3 && tokens.some((t) => allKeywords.includes(t))) {
    if (tokens.some((t) => ['PLEASE', 'ALL', 'ME', 'NOW', 'STOP', 'UNSUBSCRIBE', 'REMOVE', 'CANCEL', 'END', 'QUIT'].includes(t))) {
      return true;
    }
  }

  return false;
}

export class SmartPacingEngine {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private workerId: string = 'worker-' + Math.random().toString(36).substring(2, 8);

  constructor() {
    this.startWorker();
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public startWorker() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    // Persistent scheduler tick runs every 1 second to evaluate timestamps and eligibility
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stopWorker() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Check 5: Working hours permit sending.
   * Evaluates if current local time is within configured working hours (e.g. 09:00 - 20:00).
   */
  public isWithinWorkingHours(config: SmartPacingConfig): boolean {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentMinsTotal = currentHours * 60 + currentMinutes;

    const [startH, startM] = config.workingHoursStart.split(':').map(Number);
    const [endH, endM] = config.workingHoursEnd.split(':').map(Number);

    const startTotal = startH * 60 + (startM || 0);
    const endTotal = endH * 60 + (endM || 0);

    return currentMinsTotal >= startTotal && currentMinsTotal <= endTotal;
  }

  /**
   * Evaluates the 8 mandatory sending checks:
   * 1. Campaign is RUNNING.
   * 2. Message is eligible.
   * 3. Customer has valid consent, where required.
   * 4. Customer is not suppressed.
   * 5. Working hours permit sending.
   * 6. Daily limits permit sending.
   * 7. The next scheduled action is due.
   * 8. No other worker has already claimed the message.
   */
  public evaluateSendingChecks(item: MessageQueueItem): {
    eligible: boolean;
    failingCondition?: number;
    reason?: string;
  } {
    const config = db.getPacingConfig();
    const pacingState = db.getPacingState();
    const now = Date.now();

    // Check 1: Campaign is RUNNING (if message is associated with a campaign)
    if (item.campaignId) {
      const campaign = db.getCampaigns().find((c) => c.id === item.campaignId);
      if (!campaign || campaign.status !== 'RUNNING') {
        return {
          eligible: false,
          failingCondition: 1,
          reason: `Check 1 Failed: Campaign "${campaign?.name || item.campaignId}" is not RUNNING (status: ${campaign?.status || 'NOT_FOUND'}).`,
        };
      }
    }

    // Check 2: Message is eligible (status must be PENDING/SCHEDULED, scheduled time arrived, and not in retry backoff)
    if (item.status !== 'PENDING' && item.status !== 'SCHEDULED') {
      return {
        eligible: false,
        failingCondition: 2,
        reason: `Check 2 Failed: Message status is ${item.status} (expected PENDING or SCHEDULED).`,
      };
    }
    if (item.scheduledAt && new Date(item.scheduledAt).getTime() > now) {
      return {
        eligible: false,
        failingCondition: 2,
        reason: `Check 2 Failed: Message scheduled time (${item.scheduledAt}) has not arrived yet.`,
      };
    }
    if (item.nextRetryAt && new Date(item.nextRetryAt).getTime() > now) {
      return {
        eligible: false,
        failingCondition: 2,
        reason: `Check 2 Failed: Message is in retry backoff until ${item.nextRetryAt}.`,
      };
    }

    // Check 3: Customer has valid consent, where required (promotional messages strictly require verified OPTED_IN)
    if (item.category === 'promotional') {
      const contact = item.contactId ? db.getContactById(item.contactId) : db.getContactByPhone(item.phone);
      const consentCheck = isContactPromotionalConsentVerified(contact);
      if (!consentCheck.verified) {
        return {
          eligible: false,
          failingCondition: 3,
          reason: `Check 3 Failed: Customer ${item.phone} does not have strictly verified promotional consent: ${consentCheck.reason}`,
        };
      }
    }

    // Check 4: Customer is not suppressed (opted out or blocked)
    if (db.isSuppressed(item.phone)) {
      return {
        eligible: false,
        failingCondition: 4,
        reason: `Check 4 Failed: Customer ${item.phone} is on suppression list or previously opted out.`,
      };
    }

    // Check 5: Working hours permit sending
    if (!this.isWithinWorkingHours(config)) {
      return {
        eligible: false,
        failingCondition: 5,
        reason: `Check 5 Failed: Outside configured operational hours (${config.workingHoursStart} - ${config.workingHoursEnd}).`,
      };
    }

    // Check 6: Daily limits permit sending (persistent dailyCount against dailyCampaignCap)
    if (pacingState.dailyCount >= config.dailyCampaignCap) {
      return {
        eligible: false,
        failingCondition: 6,
        reason: `Check 6 Failed: Daily campaign cap (${config.dailyCampaignCap}) reached for today (${pacingState.dailyCounterDate}).`,
      };
    }

    // Check 7: The next scheduled action is due (independent persistent timestamp nextEligibleSendAt)
    if (pacingState.nextEligibleSendAt) {
      const nextDue = new Date(pacingState.nextEligibleSendAt).getTime();
      if (now < nextDue) {
        const remainingSec = Math.ceil((nextDue - now) / 1000);
        return {
          eligible: false,
          failingCondition: 7,
          reason: `Check 7 Failed: Next scheduled send is not due yet (${remainingSec}s remaining until ${new Date(nextDue).toLocaleTimeString()}).`,
        };
      }
    }

    // Check 8: No other worker has already claimed the message (atomic claim check)
    if (item.claimedBy && item.claimedBy !== this.workerId) {
      return {
        eligible: false,
        failingCondition: 8,
        reason: `Check 8 Failed: Message is already claimed by another worker (${item.claimedBy}).`,
      };
    }

    return { eligible: true };
  }

  /**
   * Main persistent scheduler tick.
   * Evaluates persistent timestamps, checks WhatsApp socket health, and executes the 8 sending checks.
   */
  public async tick() {
    if (this.isProcessing) return;

    const config = db.getPacingConfig();
    if (config.mode === 'PAUSED') return;

    // Verify WhatsApp connection health - trigger automatic pausing on disconnection or errors
    if (!whatsappAdapter.isConnected()) {
      const conn = db.getConnectionInfo();
      // If WhatsApp is not connected, safely pause queue until connection is active
      if (conn.state === 'CONNECTION_ERROR' || conn.state === 'AUTH_EXPIRED') {
        this.triggerAutomaticPause(
          `WhatsApp connection error (${conn.state}: ${conn.errorMessage || 'unauthenticated'}). Pacing engine paused for account protection.`
        );
        return;
      }
    }

    // Retrieve persistent pacing timestamps from storage
    const pacingState = db.getPacingState();
    const now = Date.now();

    // System-level Check 5: Working hours
    if (!this.isWithinWorkingHours(config)) {
      db.updatePacingConfig({
        reasonForAdjustment: `Queue waiting: Outside operational business hours (${config.workingHoursStart} - ${config.workingHoursEnd}). Resumes automatically at ${config.workingHoursStart}.`,
      });
      return;
    }

    // System-level Check 6: Daily limits
    if (pacingState.dailyCount >= config.dailyCampaignCap) {
      db.updatePacingConfig({
        reasonForAdjustment: `Queue paused: Daily limit of ${config.dailyCampaignCap} messages reached for ${pacingState.dailyCounterDate}. Resets at midnight.`,
      });
      return;
    }

    // System-level Check 7: Next scheduled action due (persistent nextEligibleSendAt check)
    if (pacingState.nextEligibleSendAt) {
      const nextDue = new Date(pacingState.nextEligibleSendAt).getTime();
      if (now < nextDue) {
        const remainingSec = Math.ceil((nextDue - now) / 1000);
        const isBatchPause = pacingState.batchCompletedAt && (!pacingState.lastMessageSentAt || new Date(pacingState.batchCompletedAt) >= new Date(pacingState.lastMessageSentAt));
        const pauseType = isBatchPause ? 'Batch Pause' : 'Inter-Message Pacing';
        db.updatePacingConfig({
          reasonForAdjustment: `${pauseType}: Next send eligible in ${remainingSec}s (${new Date(nextDue).toLocaleTimeString()}).`,
        });
        return;
      }
    }

    // Find first candidate in the persistent queue
    const queue = db.getQueue();
    const candidate = queue.find((q) => q.status === 'PENDING' || q.status === 'SCHEDULED');
    if (!candidate) {
      if (config.reasonForAdjustment?.startsWith('Pacing countdown') || config.reasonForAdjustment?.startsWith('Batch Pause')) {
        db.updatePacingConfig({
          reasonForAdjustment: 'Queue is idle. Waiting for new scheduled or campaign messages.',
        });
      }
      return;
    }

    // Run the 8-condition check on the candidate
    const evaluation = this.evaluateSendingChecks(candidate);
    if (!evaluation.eligible) {
      // If permanently non-compliant (e.g. suppressed or missing statutory consent), fail the queue item
      if (evaluation.failingCondition === 3 || evaluation.failingCondition === 4) {
        candidate.status = 'FAILED';
        candidate.failureReason = evaluation.reason;
        db.saveDatabase();
        db.addAuditLog(
          'PACING_ENGINE',
          'ADMIN',
          'MESSAGE_DISQUALIFIED',
          `Message ${candidate.id} to ${candidate.phone} permanently failed: ${evaluation.reason}`
        );
      }
      return;
    }

    // Check 8 & Atomic Claim: Exclusively claim candidate for this worker
    const claimedItem = db.claimNextQueueItem(this.workerId);
    if (!claimedItem) return;

    this.isProcessing = true;
    try {
      await this.processClaimedItem(claimedItem);
    } catch (err: any) {
      console.error('[PacingEngine] Error processing claimed queue item:', err);
      db.releaseQueueItem(claimedItem.id, 'FAILED', err?.message || 'Unexpected worker execution error');
      this.triggerAutomaticPause(`Execution failure during queue dispatch: ${err?.message || 'Unknown error'}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private cancelledWorkerItemIds: Set<string> = new Set();

  public cancelWorkerTask(itemId: string) {
    this.cancelledWorkerItemIds.add(itemId);
  }

  /**
   * Dispatches the claimed message and updates independent persistent timestamps.
   * Rebuilds batch pause calculation strictly from batchCompletedAt.
   * Adheres to conservative, configurable delays (no random delay safety guarantees).
   */
  private async processClaimedItem(item: MessageQueueItem) {
    const config = db.getPacingConfig();
    const pacingState = db.getPacingState();

    // Worker cancellation signal check
    if (this.cancelledWorkerItemIds.has(item.id)) {
      this.cancelledWorkerItemIds.delete(item.id);
      item.status = 'CANCELLED';
      item.failureReason = 'Worker cancellation signal received';
      db.saveDatabase();
      return;
    }

    // Requirement 8: Inside processQueueItem(), before dispatch
    const campaign = item.campaignId ? db.getCampaigns().find((c) => c.id === item.campaignId) : null;
    if (campaign && campaign.status !== 'RUNNING') {
      item.status = campaign.status === 'PAUSED' ? 'PAUSED' : 'CANCELLED';
      item.failureReason = `Campaign "${campaign.name}" is ${campaign.status}. Dispatch halted.`;
      db.saveDatabase();
      return;
    }

    const { messageDispatcher } = await import('./messageDispatcher');

    // Dispatch via real message dispatcher through connected WhatsApp session
    const result = await messageDispatcher.dispatchQueueItem(item);
    const sendTime = new Date();
    const sendTimeIso = sendTime.toISOString();

    if (result.success) {
      // Reset error counter on confirmed success
      const newDailyCount = pacingState.dailyCount + 1;
      const newBatchCount = (pacingState.currentBatchCount || 0) + 1;
      const batchStartedAt = pacingState.batchStartedAt || sendTimeIso;

      // Check if batch size is reached
      if (config.batchSize > 0 && newBatchCount >= config.batchSize) {
        // BATCH COMPLETED:
        // Problem solved: Batch pause is strictly calculated using batchCompletedAt!
        const batchCompletedAt = sendTimeIso;
        const pauseMs = config.pauseBetweenBatchesMinutes * 60 * 1000;
        const nextEligible = new Date(sendTime.getTime() + pauseMs).toISOString();

        db.updatePacingState({
          lastMessageSentAt: sendTimeIso,
          batchStartedAt: null,
          batchCompletedAt: batchCompletedAt,
          nextEligibleSendAt: nextEligible,
          dailyCount: newDailyCount,
          currentBatchCount: 0,
          consecutiveErrors: 0,
          lastError: null,
        });

        db.updatePacingConfig({
          reasonForAdjustment: `Batch completed (${config.batchSize} msgs). Persistent batch pause active until ${new Date(nextEligible).toLocaleTimeString()} (${config.pauseBetweenBatchesMinutes} min pause).`,
        });

        db.addAuditLog(
          'PACING_ENGINE',
          'ADMIN',
          'BATCH_PAUSE_INITIATED',
          `Completed batch of ${config.batchSize} messages. Next eligible send scheduled for ${new Date(nextEligible).toLocaleTimeString()} measured strictly from batchCompletedAt.`
        );
      } else {
        // INTER-MESSAGE DELAY:
        // Recommendation implemented: Conservative, configurable interval without random delay illusion.
        // No sending interval is guaranteed safe.
        const intervalSec = Math.max(10, config.minIntervalSeconds);
        const nextEligible = new Date(sendTime.getTime() + intervalSec * 1000).toISOString();

        db.updatePacingState({
          lastMessageSentAt: sendTimeIso,
          batchStartedAt: batchStartedAt,
          nextEligibleSendAt: nextEligible,
          dailyCount: newDailyCount,
          currentBatchCount: newBatchCount,
          consecutiveErrors: 0,
          lastError: null,
        });

        db.updatePacingConfig({
          autoCalculatedInterval: intervalSec,
          reasonForAdjustment: `Conservative pacing: Message dispatched (${newBatchCount}/${config.batchSize} in batch). Next message eligible in ${intervalSec}s at ${new Date(nextEligible).toLocaleTimeString()}.`,
        });
      }
    } else {
      // DISPATCH FAILED:
      // Automatic pausing on errors or restrictions
      const consecutive = (pacingState.consecutiveErrors || 0) + 1;
      const isRestrictionError =
        result.error?.toLowerCase().includes('rate') ||
        result.error?.toLowerCase().includes('restrict') ||
        result.error?.toLowerCase().includes('ban') ||
        result.error?.toLowerCase().includes('blocked') ||
        result.error?.toLowerCase().includes('disconnect') ||
        result.error?.toLowerCase().includes('socket') ||
        consecutive >= 2;

      db.updatePacingState({
        consecutiveErrors: consecutive,
        lastError: result.error || 'Dispatch failure',
      });

      if (isRestrictionError) {
        this.triggerAutomaticPause(
          `Automatic safety pause triggered by WhatsApp dispatch failure: "${result.error || 'Transport error'}". Pacing engine halted to protect WhatsApp account. No sending interval is guaranteed safe.`
        );
      } else {
        // For transient errors, apply conservative 30-second backoff
        const backoffMs = 30000;
        const nextEligible = new Date(sendTime.getTime() + backoffMs).toISOString();
        db.updatePacingState({
          nextEligibleSendAt: nextEligible,
        });
        db.updatePacingConfig({
          reasonForAdjustment: `Pacing engine in safety backoff (30s) following transient error: ${result.error}.`,
        });
      }
    }
  }

  /**
   * Automatic pausing mechanism on errors or restrictions.
   * Protects the WhatsApp business account by halting all outbound campaigns and queues immediately.
   */
  public triggerAutomaticPause(reason: string) {
    const config = db.getPacingConfig();
    db.updatePacingConfig({
      mode: 'PAUSED',
      reasonForAdjustment: reason,
    });

    const nowIso = new Date().toISOString();
    db.updatePacingState({
      autoPausedAt: nowIso,
      autoPauseReason: reason,
    });

    // Pause all RUNNING campaigns to prevent unmonitored dispatch
    const campaigns = db.getCampaigns();
    let pausedCampaignCount = 0;
    campaigns.forEach((camp) => {
      if (camp.status === 'RUNNING') {
        camp.status = 'PAUSED';
        pausedCampaignCount++;
      }
    });

    db.saveDatabase();

    db.addAuditLog(
      'PACING_ENGINE',
      'ADMIN',
      'AUTOMATIC_SAFETY_PAUSE',
      `Queue automatically paused to protect WhatsApp account. Reason: ${reason}. Paused ${pausedCampaignCount} active campaigns.`
    );

    console.warn(`[PacingEngine] AUTOMATIC PAUSE: ${reason}`);
  }

  /**
   * Handle incoming message from customer:
   * Delegated entirely to Central Event Processor (Validate • Identify • Deduplicate • Store)
   * to ensure single-source-of-truth across Live WhatsApp and simulated testing.
   */
  public handleIncomingMessage(phone: string, text: string, customerName?: string) {
    const outcome = eventProcessor.processEvent({
      type: 'INCOMING_MESSAGE',
      phone,
      text,
      senderName: customerName,
      source: 'SIMULATION',
    });

    if (outcome.replyAction && outcome.replyAction.type === 'OPT_OUT') {
      return {
        type: 'OPT_OUT',
        reply: outcome.replyAction.replyText,
        ackMessageId: outcome.replyAction.outboundMessageId,
        cancelledQueueItems: outcome.details?.cancelledQueueItems || 0,
        handled: true,
      };
    }

    if (outcome.replyAction && outcome.replyAction.type === 'KEYWORD_MATCH') {
      return {
        type: 'KEYWORD_MATCH',
        rule: outcome.replyAction.rule,
        reply: outcome.replyAction.replyText,
        action: 'AUTOMATION_TRIGGERED',
        handled: true,
      };
    }

    if (outcome.replyAction && outcome.replyAction.type === 'AUTO_REPLY') {
      return {
        type: 'AUTO_REPLY',
        title: outcome.replyAction.title,
        reply: outcome.replyAction.replyText,
        handled: true,
      };
    }

    return { type: 'NORMAL_INBOUND', handled: true };
  }
}

export const pacingEngine = new SmartPacingEngine();
