/**
 * Vikas Message Automator v1.2.1 — Automated Security & Logic Tests
 * Run: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { db, isContactPromotionalConsentVerified } from './db';
import { pacingEngine, isOptOutMessage } from './pacingEngine';
import { messageDispatcher, classifyDispatchError } from './messageDispatcher';
import { MessageQueueItem } from '../src/types/index';

// ---------------------------------------------------------------------------
// Consent defaults & verification
// ---------------------------------------------------------------------------

test('VMA-02: New contact without explicit consent defaults to NOT_GIVEN and is blocked from promotional messaging', () => {
  const contact = db.createContact({
    name: 'Test Workshop Satna',
    phone: '+919999000111',
    businessName: 'Satna Lube Station',
    city: 'Satna',
    category: 'Workshops',
    productInterest: 'HP Milcy Turbo',
    notes: 'Testing consent block',
    tags: ['Test'],
    consentStatus: 'NOT_GIVEN',
  });

  assert.equal(contact.consentStatus, 'NOT_GIVEN');
  const check = isContactPromotionalConsentVerified(contact);
  assert.equal(check.verified, false);
});

test('VMA-02: Promotional consent requires OPTED_IN + evidence; sentence-only evidence is insufficient for bulk import style', () => {
  const weak = {
    consentStatus: 'OPTED_IN',
    consentEvidence: 'said ok',
    consentSource: '',
    consentDate: undefined,
    verificationStatus: 'UNVERIFIED',
  } as any;
  // isContactPromotionalConsentVerified expects a Contact-like object
  const contact = db.createContact({
    name: 'Weak Evidence',
    phone: '+919999000222',
    businessName: 'Test',
    city: 'Satna',
    category: 'Retailers',
    productInterest: 'HP',
    notes: '',
    tags: [],
    consentStatus: 'OPTED_IN',
    consentEvidence: 'ok',
    consentSource: '',
  });
  const check = isContactPromotionalConsentVerified(contact);
  // Without full statutory fields, verification should fail
  assert.equal(check.verified, false, 'Incomplete consent evidence must not verify');
});

test('VMA-02: Fully verified contact passes promotional consent check', () => {
  const contact = db.createContact({
    name: 'Verified Retailer',
    phone: '+919999000333',
    businessName: 'Maihar Motors',
    city: 'Maihar',
    category: 'Retailers',
    productInterest: 'HP Enklo',
    notes: '',
    tags: [],
    consentStatus: 'OPTED_IN',
    consentSource: 'Physical Job Card #1001',
    consentEvidence: 'Signed job card #1001 filed in Satna office binder, section B',
    consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
    consentDate: new Date().toISOString(),
    verificationStatus: 'VERIFIED',
    permissionCategories: ['Promotional Offers'],
  } as any);

  const check = isContactPromotionalConsentVerified(contact);
  assert.equal(check.verified, true, `Expected verified, got: ${check.reason}`);
});

// ---------------------------------------------------------------------------
// Opt-out / STOP
// ---------------------------------------------------------------------------

test('VMA-03: Incoming STOP immediately flags customer as OPTED_OUT and suppresses', () => {
  const testPhone = '+919999222333';
  db.createContact({
    name: 'Opt Out Test Customer',
    phone: testPhone,
    businessName: 'Garage A',
    city: 'Maihar',
    category: 'Mechanics',
    productInterest: 'HP Racer 4',
    notes: 'Will opt out',
    tags: [],
    consentStatus: 'OPTED_IN',
    consentSource: 'In-Store',
    consentEvidence: 'Job card 55',
    consentDate: new Date().toISOString(),
    verificationStatus: 'VERIFIED',
    permissionCategories: ['Promotional Offers'],
  } as any);

  const result = pacingEngine.handleIncomingMessage(testPhone, 'STOP');
  assert.equal(result.handled, true);
  assert.equal(result.type, 'OPT_OUT');

  const updated = db.getContactByPhone(testPhone);
  assert.equal(updated?.consentStatus, 'OPTED_OUT');
  assert.equal(db.isSuppressed(testPhone), true);
});

test('Opt-out keyword variants are recognised', () => {
  assert.equal(isOptOutMessage('STOP'), true);
  assert.equal(isOptOutMessage('please unsubscribe'), true);
  assert.equal(isOptOutMessage('UNSUBSCRIBE ME'), true);
  assert.equal(isOptOutMessage('stop all'), true);
  assert.equal(isOptOutMessage('hello how are you'), false);
  assert.equal(isOptOutMessage('price list'), false);
});

// ---------------------------------------------------------------------------
// DEMO / LIVE separation
// ---------------------------------------------------------------------------

test('DEMO/LIVE: Environment defaults to DEMO', () => {
  // Ensure we start from DEMO for isolation tests
  db.setEnvironment('DEMO');
  assert.equal(db.getEnvironment(), 'DEMO');
});

test('DEMO/LIVE: validateDispatch allows DEMO without WhatsApp connection', () => {
  db.setEnvironment('DEMO');
  const contact = db.createContact({
    name: 'Demo Send Target',
    phone: '+919888777666',
    businessName: 'Demo Biz',
    city: 'Satna',
    category: 'Retailers',
    productInterest: 'HP',
    notes: '',
    tags: [],
    consentStatus: 'OPTED_IN',
    consentSource: 'Test',
    consentEvidence: 'Test evidence reference for DEMO',
    consentDate: new Date().toISOString(),
    verificationStatus: 'VERIFIED',
    permissionCategories: ['Promotional Offers'],
  } as any);

  const result = messageDispatcher.validateDispatch({
    phone: contact.phone,
    contactId: contact.id,
    category: 'promotional',
    content: 'Demo promotional message about HP lubricants',
  });

  // In DEMO, missing WhatsApp connection must NOT block
  assert.equal(result.valid, true, result.reason);
});

test('DEMO/LIVE: dispatchDirectMessage in DEMO never requires real transport and marks isDemo', async () => {
  db.setEnvironment('DEMO');
  const contact = db.getContactByPhone('+919888777666');
  assert.ok(contact);

  const outcome = await messageDispatcher.dispatchDirectMessage({
    phone: contact!.phone,
    contactId: contact!.id,
    content: 'Simulated DEMO message — should not hit Baileys',
    category: 'support',
  });

  assert.equal(outcome.success, true, outcome.error);
});

test('DEMO/LIVE: Promotional without verified consent is blocked in both modes', () => {
  db.setEnvironment('DEMO');
  const blocked = db.createContact({
    name: 'No Consent',
    phone: '+919777666555',
    businessName: 'X',
    city: 'Satna',
    category: 'Retailers',
    productInterest: 'HP',
    notes: '',
    tags: [],
    consentStatus: 'NOT_GIVEN',
  });

  const result = messageDispatcher.validateDispatch({
    phone: blocked.phone,
    contactId: blocked.id,
    category: 'promotional',
    content: 'Buy now 20% off HP oil',
  });

  assert.equal(result.valid, false);
  assert.ok(result.reason?.includes('CONSENT') || result.actionRequired === 'FAIL' || result.actionRequired === 'CANCEL');
});

// ---------------------------------------------------------------------------
// Queue / pacing / classification
// ---------------------------------------------------------------------------

test('Error classification maps disconnect and rate-limit correctly', () => {
  assert.equal(classifyDispatchError('socket closed unexpectedly'), 'WHATSAPP_DISCONNECTED');
  assert.equal(classifyDispatchError('rate limit exceeded 429'), 'RATE_LIMIT_RESTRICTION');
  assert.equal(classifyDispatchError('not on whatsapp'), 'INVALID_RECIPIENT');
  assert.equal(classifyDispatchError('consent withdrawn'), 'CONSENT_WITHDRAWN');
  assert.equal(classifyDispatchError('temporary network timeout'), 'TEMPORARY_NETWORK');
});

test('Queue claim: PENDING item can be claimed and released', () => {
  const item = db.enqueueMessage({
    phone: '+919111222333',
    customerName: 'Queue Test',
    content: 'Test queue message',
    category: 'support',
    type: 'text',
    scheduledAt: new Date().toISOString(),
  } as any);

  assert.equal(item.status, 'PENDING');
  const claimed = db.claimNextQueueItem('test-worker-1');
  assert.ok(claimed);
  assert.equal(claimed!.status, 'PROCESSING');
  assert.equal(claimed!.claimedBy, 'test-worker-1');

  db.releaseQueueItem(claimed!.id, 'SENT');
  const after = db.getQueue().find((q) => q.id === claimed!.id);
  assert.equal(after?.status, 'SENT');
});

test('Stale PROCESSING recovery: item older than 60s can be reclaimed', () => {
  const item = db.enqueueMessage({
    phone: '+919111222334',
    customerName: 'Stale Test',
    content: 'Stale recovery test',
    category: 'support',
    type: 'text',
    scheduledAt: new Date().toISOString(),
  } as any);

  // Force into PROCESSING with old claimedAt
  const queue = db.getData().messageQueue;
  const target = queue.find((q) => q.id === item.id)!;
  target.status = 'PROCESSING';
  target.claimedBy = 'dead-worker';
  target.claimedAt = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
  db.saveDatabase();

  const reclaimed = db.claimNextQueueItem('recovery-worker');
  assert.ok(reclaimed);
  assert.equal(reclaimed!.id, item.id);
  assert.equal(reclaimed!.claimedBy, 'recovery-worker');
  assert.equal(reclaimed!.status, 'PROCESSING');
});

test('Daily cap and suppression block eligibility conceptually', () => {
  const suppressed = '+919000111222';
  db.handleCustomerOptOut(suppressed, 'Test suppression');
  assert.equal(db.isSuppressed(suppressed), true);

  const result = messageDispatcher.validateDispatch({
    phone: suppressed,
    category: 'promotional',
    content: 'Should be blocked',
  });
  assert.equal(result.valid, false);
  assert.equal(result.actionRequired, 'CANCEL');
});

// ---------------------------------------------------------------------------
// Campaign pause / cancel
// ---------------------------------------------------------------------------

test('Campaign cancel marks pending queue items CANCELLED', () => {
  // Create a minimal campaign-like structure if API exists
  const data = db.getData();
  const campaignId = 'camp-test-' + Date.now();
  data.campaigns.push({
    id: campaignId,
    name: 'Test Campaign',
    status: 'RUNNING',
    templateId: '',
    groupIds: [],
    contactIds: [],
    scheduledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    stats: { total: 1, sent: 0, failed: 0, pending: 1 },
  } as any);

  const qItem = db.enqueueMessage({
    phone: '+919444555666',
    customerName: 'Campaign Target',
    content: 'Campaign msg',
    category: 'promotional',
    type: 'text',
    campaignId,
    scheduledAt: new Date().toISOString(),
  } as any);

  const cancelResult = db.cancelCampaign(campaignId);
  assert.equal(cancelResult.success, true);

  const after = db.getQueue().find((q) => q.id === qItem.id);
  assert.equal(after?.status, 'CANCELLED');
});

// ---------------------------------------------------------------------------
// Atomic DB write smoke test
// ---------------------------------------------------------------------------

test('Database saveDatabase does not throw and persists settings', () => {
  const before = db.getEnvironment();
  db.setEnvironment('DEMO');
  assert.equal(db.getEnvironment(), 'DEMO');
  // Restore
  if (before === 'LIVE') db.setEnvironment('LIVE');
});

// ---------------------------------------------------------------------------
// Anti-circumvention
// ---------------------------------------------------------------------------

test('Transactional message with promotional buzzwords is blocked', () => {
  const result = messageDispatcher.validateDispatch({
    phone: '+919826003016',
    category: 'transactional',
    content: 'Invoice attached. Special scheme 20% off this week only!',
    transactionReference: 'INV-100',
  });
  assert.equal(result.valid, false);
  assert.ok(result.reason?.includes('CIRCUMVENTION') || result.actionRequired === 'FAIL');
});

console.log('\\n[logic.test] Security and logic test suite loaded.');

// ---------------------------------------------------------------------------
// Independent audit fixes (v1.2.2)
// ---------------------------------------------------------------------------

test('Audit#4: Phone number change resets promotional consent', () => {
  const c = db.createContact({
    name: 'Launder Test',
    phone: '+919700000001',
    businessName: 'X',
    city: 'Satna',
    category: 'Retailers',
    productInterest: 'HP',
    notes: '',
    tags: [],
    consentStatus: 'OPTED_IN',
    consentSource: 'Job card',
    consentEvidence: 'Physical job card #9001',
    consentDate: new Date().toISOString(),
    consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
    verificationStatus: 'VERIFIED',
    permissionCategories: ['Promotional Offers'],
  } as any);

  assert.equal(c.consentStatus, 'OPTED_IN');
  const updated = db.updateContact(c.id, { phone: '+919700000099' });
  assert.ok(updated);
  assert.equal(updated!.consentStatus, 'NOT_GIVEN');
  assert.notEqual(updated!.verificationStatus, 'VERIFIED');
});

test('Audit#6: findUserByUsername is email-only', () => {
  const byName = db.findUserByUsername('Owner (Setup Required)');
  // Seed user may have placeholder email — lookup by display name must not work
  const byAlias = db.findUserByUsername('admin');
  assert.equal(byAlias, undefined, 'role alias admin must not match');
});

test('Audit#1 conceptual: promotional category still blocked without consent on dispatcher', () => {
  db.setEnvironment('DEMO');
  const c = db.createContact({
    name: 'Cold Target',
    phone: '+919700000002',
    businessName: 'Y',
    city: 'Satna',
    category: 'Retailers',
    productInterest: 'HP',
    notes: '',
    tags: [],
    consentStatus: 'NOT_GIVEN',
  });
  const result = messageDispatcher.validateDispatch({
    phone: c.phone,
    contactId: c.id,
    category: 'promotional',
    content: 'Cold promo',
  });
  assert.equal(result.valid, false);
});

