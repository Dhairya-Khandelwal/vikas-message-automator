import { db } from './db';
import { WhatsAppConnectionInfo, AccountHealth, HealthStatus } from '../src/types/index';

/**
 * Requirement 33: Fix account health calculations
 *
 * The dashboard must NOT automatically display GREEN merely because the application has started.
 * Genuine indicators:
 * Condition                                Health
 * Not connected                            RED
 * Repeated connection failures             RED
 * Sending paused for investigation         YELLOW
 * Connection established, no errors        GREEN
 * Insufficient information                 UNKNOWN
 *
 * Crucial rule:
 * "Even GREEN must mean only that the monitored technical checks are healthy.
 * It must never imply that WhatsApp guarantees unrestricted sending."
 */
export function calculateAccountHealth(params?: {
  connectionInfo?: WhatsAppConnectionInfo;
  queue?: any[];
  pacingConfig?: any;
  pacingState?: any;
}): AccountHealth {
  const conn = params && 'connectionInfo' in params ? params.connectionInfo : db.getConnectionInfo();
  const queue = params?.queue || db.getQueue();
  const pacingConfig = params?.pacingConfig || db.getPacingConfig();
  const pacingState = params?.pacingState || db.getPacingState();
  const campaigns = db.getCampaigns();

  const failedQueue = queue.filter((q: any) => q.status === 'FAILED').length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'RUNNING').length;
  const pausedCampaigns = campaigns.filter((c) => c.status === 'PAUSED').length;

  const warnings: string[] = [];

  // 1. Condition: Insufficient information -> UNKNOWN
  if (!conn || !conn.state || (conn.state as string) === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      connectionStatus: 'UNKNOWN',
      authenticationStatus: 'Insufficient Telemetry',
      recentConnectionFailures: 0,
      messageFailures: failedQueue,
      queueStatus: `${queue.filter((q: any) => q.status === 'PENDING').length} pending, ${queue.filter((q: any) => q.status === 'SENT').length} completed`,
      activeCampaigns,
      pausedCampaigns,
      lastSuccessfulMessage: null,
      warnings: ['Insufficient information: WhatsApp connection state is uninitialized.'],
      statusReason: 'Insufficient telemetry to determine account status.',
      technicalDisclaimer:
        'Health status evaluates local operational telemetry only. It does not imply WhatsApp server guarantees.',
    };
  }

  // 2. Condition: Repeated connection failures -> RED
  const hasRepeatedFailures =
    conn.state === 'CONNECTION_ERROR' ||
    conn.state === 'AUTH_EXPIRED' ||
    (conn.errorMessage && /disconnect|error|failed|closed|unlinked|auth_expired/i.test(conn.errorMessage) && conn.state !== 'CONNECTED');

  if (hasRepeatedFailures) {
    const errorDetail =
      conn.errorMessage ||
      (conn.state === 'AUTH_EXPIRED'
        ? 'WhatsApp session expired or unlinked from phone'
        : 'Socket connection failed or dropped repeatedly');

    warnings.push(`Connection failure alert: ${errorDetail}`);

    return {
      status: 'RED',
      connectionStatus: conn.state,
      authenticationStatus: conn.state === 'AUTH_EXPIRED' ? 'Session Expired' : 'Authentication / Socket Error',
      recentConnectionFailures: 1,
      messageFailures: failedQueue,
      queueStatus: `${queue.filter((q: any) => q.status === 'PENDING').length} pending, ${queue.filter((q: any) => q.status === 'SENT').length} completed`,
      activeCampaigns,
      pausedCampaigns,
      lastSuccessfulMessage: conn.lastSyncTime,
      warnings,
      statusReason: `Repeated connection failures: ${errorDetail}`,
      technicalDisclaimer:
        'Dispatches halted due to connection failure. Reconnect your WhatsApp device via QR code to resume operations.',
    };
  }

  // 3. Condition: Not connected -> RED
  // Note: The dashboard must not display GREEN merely because the app started!
  if (conn.state !== 'CONNECTED') {
    const notConnectedDetail =
      conn.state === 'WAITING_FOR_QR'
        ? 'Awaiting QR scan from WhatsApp Linked Devices on mobile.'
        : conn.state === 'CONNECTING' || conn.state === 'INITIALIZING'
        ? 'Establishing connection to WhatsApp servers...'
        : 'WhatsApp device is not currently linked. Pair your device via QR code.';

    warnings.push(notConnectedDetail);

    return {
      status: 'RED',
      connectionStatus: conn.state || 'DISCONNECTED',
      authenticationStatus: 'Unauthenticated / Not Linked',
      recentConnectionFailures: 0,
      messageFailures: failedQueue,
      queueStatus: `${queue.filter((q: any) => q.status === 'PENDING').length} pending, ${queue.filter((q: any) => q.status === 'SENT').length} completed`,
      activeCampaigns,
      pausedCampaigns,
      lastSuccessfulMessage: conn.lastSyncTime,
      warnings,
      statusReason: `Not connected: ${notConnectedDetail}`,
      technicalDisclaimer:
        'Application server is online, but WhatsApp dispatches are disabled until your WhatsApp Business device is linked.',
    };
  }

  // 4. Condition: Sending paused for investigation -> YELLOW
  const isPacingPaused = pacingConfig?.mode === 'PAUSED';
  const isAutoPaused = Boolean(pacingState?.autoPausedAt);
  const hasHighBlockRate = failedQueue > 5;

  if (isPacingPaused || isAutoPaused || hasHighBlockRate) {
    if (isAutoPaused) {
      warnings.push(`Automatic safety pause: ${pacingState?.autoPauseReason || 'Safety threshold reached'}.`);
    } else if (isPacingPaused) {
      warnings.push(`Pacing paused by administrator: ${pacingConfig?.reasonForAdjustment || 'Sending paused for investigation'}.`);
    }

    if (hasHighBlockRate) {
      warnings.push(`High block rate: ${failedQueue} messages failed or blocked by consent rules.`);
    }

    const reason = isAutoPaused
      ? `Sending paused for investigation: ${pacingState?.autoPauseReason}`
      : isPacingPaused
      ? `Sending paused for investigation: ${pacingConfig?.reasonForAdjustment || 'Administrator paused pacing'}`
      : `High failure rate: ${failedQueue} messages failed. Sending reviewed for account protection.`;

    return {
      status: 'YELLOW',
      connectionStatus: conn.state,
      authenticationStatus: 'Active Session (Sending Paused)',
      recentConnectionFailures: 0,
      messageFailures: failedQueue,
      queueStatus: `PAUSED (${queue.filter((q: any) => q.status === 'PENDING').length} pending, ${queue.filter((q: any) => q.status === 'SENT').length} completed)`,
      activeCampaigns,
      pausedCampaigns,
      lastSuccessfulMessage: conn.lastSyncTime,
      warnings,
      statusReason: reason,
      technicalDisclaimer:
        'Caution: Sending is paused for investigation to protect account reputation. Verify queue items, consent records, and pacing settings before resuming.',
    };
  }

  // 5. Condition: Connection established, no errors -> GREEN
  // "Even GREEN must mean only that the monitored technical checks are healthy. It must never imply that WhatsApp guarantees unrestricted sending."
  return {
    status: 'GREEN',
    connectionStatus: conn.state,
    authenticationStatus: 'Active Local Session',
    recentConnectionFailures: 0,
    messageFailures: failedQueue,
    queueStatus: `${queue.filter((q: any) => q.status === 'PENDING').length} pending, ${queue.filter((q: any) => q.status === 'SENT').length} completed`,
    activeCampaigns,
    pausedCampaigns,
    lastSuccessfulMessage: conn.lastSyncTime,
    warnings: [],
    statusReason: 'Connection established, no monitored errors.',
    technicalDisclaimer:
      'Monitored technical checks are healthy (socket connected, authentication verified, local pacing active). Note: GREEN indicates nominal local technical checks only; it does NOT imply that WhatsApp guarantees unrestricted sending or immunity from spam heuristics.',
  };
}
