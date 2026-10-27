/**
 * Regression test suite: Fraud Risk Score & Escalation UI Consistency
 *
 * Validates that:
 * - Fraud score always reflects the real calculated risk (never fabricated)
 * - Verdict reflects the real investigation outcome
 * - Legitimate non-fraud escalations remain possible with low scores
 * - Verdict independence: numeric score alone does NOT force escalation
 * - Hard escalation guards trigger on explicit confirmed signals (security, image reuse, confirmed fraud history)
 * - escalationType and escalationReason are always set on HUMAN_ESCALATION
 * - Non-escalation decisions do NOT have escalationType/escalationReason
 */

const { decide } = require('../src/services/decisionEngine');
const { buildHandoff } = require('../src/services/handoffEngine');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}${detail ? '  → ' + detail : ''}`);
  }
}

function makeAnalysis(overrides = {}) {
  return { intent: 'payment/billing', subIntent: 'duplicate_charge', sentiment: 'negative', ...overrides };
}

function makeRootCause(overrides = {}) {
  return { confidence: 90, matchedPolicy: 'POLICY7', rootCause: 'Duplicate payment detected', evidenceUsed: ['payments'], ...overrides };
}

function makeInvestigation(overrides = {}) {
  return {
    found: true,
    customer: { id: 'CUST001', name: 'Test Customer', tier: 'gold' },
    orderVerified: true,
    focusOrder: { id: 'ORDER001', customerId: 'CUST001', amount: 1000, product: 'Phone' },
    focusPayments: [
      { id: 'PAY1', status: 'success', gatewayStatus: 'success', customerId: 'CUST001' },
      { id: 'PAY2', status: 'success', gatewayStatus: 'success', customerId: 'CUST001' },
    ],
    ...overrides,
  };
}

function makeRisk(overrides = {}) {
  return {
    score: 15,
    level: 'low',
    threshold: 50,
    highThreshold: 50,
    factors: [],
    signals: [{ name: 'tier_trust', points: 0, detail: 'gold tier' }],
    ...overrides,
  };
}

console.log('');
console.log('========================================================================');
console.log('  FRAUD RISK SCORE & ESCALATION CONSISTENCY — REGRESSION TESTS');
console.log('========================================================================');
console.log('');

// ── Test 1: Fraud score 15 + missing policy coverage → escalated for policy review; score remains 15 ──
console.log('Test 1: Low fraud score + missing policy → policy escalation');
{
  const d = decide('sponsor our college fest', makeAnalysis({ intent: 'other/ambiguous' }), makeRootCause({ matchedPolicy: null, confidence: 40 }), makeInvestigation({ orderVerified: false }), makeRisk({ score: 15 }), null);
  check('Decision is HUMAN_ESCALATION', d.decision === 'HUMAN_ESCALATION');
  check('escalationType is POLICY_EVIDENCE', d.escalationType === 'POLICY_EVIDENCE');
  check('escalationReason mentions missing policy', (d.escalationReason || '').toLowerCase().includes('missing policy') || (d.escalationReason || '').toLowerCase().includes('ambiguous'));
  check('Confidence preserved (40)', d.confidence === 40);
  check('Reasoning does NOT mention fraud threshold', !(d.reasoning || '').includes('fraud/abuse risk score'));
}
console.log('');

// ── Test 2: Fraud score 15 + valid evidence → AUTO_RESOLVE (no escalation) ──
console.log('Test 2: Low fraud score + valid evidence → AUTO_RESOLVE (no escalation)');
{
  const d = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), makeRisk({ score: 15 }), null);
  check('Decision is AUTO_RESOLVE', d.decision === 'AUTO_RESOLVE');
  check('No escalationType set', !d.escalationType);
  check('No escalationReason set', !d.escalationReason);
}
console.log('');

// ── Test 3: Verdict Independence: High fraud score (60) with valid evidence AUTO-RESOLVES ──
console.log('Test 3: Verdict Independence: High fraud score (60) alone does NOT force escalation on verified evidence');
{
  const d = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), makeRisk({ score: 60, level: 'high' }), null);
  check('Decision is AUTO_RESOLVE (score does not dictate verdict)', d.decision === 'AUTO_RESOLVE');
  check('No escalationType set on auto-resolve', !d.escalationType);
}
console.log('');

// ── Test 4: Explicit Confirmed Signal: Confirmed fraud history forces escalation ──
console.log('Test 4: Explicit Confirmed Signal: Confirmed fraud record triggers escalation');
{
  const confirmedFraudRisk = makeRisk({
    score: 65,
    level: 'high',
    factors: [{ id: 'confirmed_fraud_history', state: 'confirmed', points: 50, detail: 'Prior confirmed fraud on file' }],
  });
  const d = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), confirmedFraudRisk, null);
  check('Decision is HUMAN_ESCALATION on confirmed fraud record', d.decision === 'HUMAN_ESCALATION');
  check('escalationType is CONFIRMED_FRAUD', d.escalationType === 'CONFIRMED_FRAUD');
  check('Reason code is CONFIRMED_FRAUD_HISTORY', d.reasonCode === 'CONFIRMED_FRAUD_HISTORY');
}
console.log('');

// ── Test 5: Manual/policy escalation with low fraud score → score unchanged, correct reason shown ──
console.log('Test 5: Low fraud score + security intent → SECURITY escalation (not fraud)');
{
  const d = decide('someone logged into my account', makeAnalysis({ intent: 'security/unauthorized_activity', subIntent: 'suspicious_activity' }), makeRootCause({ matchedPolicy: 'POLICY9', confidence: 70 }), makeInvestigation({ orderVerified: false }), makeRisk({ score: 10 }), null);
  check('Decision is HUMAN_ESCALATION', d.decision === 'HUMAN_ESCALATION');
  check('escalationType is SECURITY', d.escalationType === 'SECURITY');
  check('escalationReason mentions security / POLICY9', (d.escalationReason || '').includes('POLICY9') || (d.escalationReason || '').toLowerCase().includes('security'));
  check('Reasoning does NOT mention fraud score', !(d.reasoning || '').includes('fraud/abuse risk score'));
  check('Confidence is 70', d.confidence === 70);
}
console.log('');

// ── Test 6: Security policy is evaluated strictly per security policy ──
console.log('Test 6: Security policy escalates as SECURITY');
{
  const d = decide('someone hacked my account', makeAnalysis({ intent: 'security/unauthorized_activity', subIntent: 'suspicious_activity' }), makeRootCause({ matchedPolicy: 'POLICY9', confidence: 70 }), makeInvestigation({ orderVerified: false }), makeRisk({ score: 80, level: 'high' }), null);
  check('Decision is HUMAN_ESCALATION', d.decision === 'HUMAN_ESCALATION');
  check('escalationType is SECURITY', d.escalationType === 'SECURITY');
  check('ReasonCode is SECURITY_MANDATORY_REVIEW', d.reasonCode === 'SECURITY_MANDATORY_REVIEW');
}
console.log('');

// ── Test 7: Handoff engine carries escalation metadata ──
console.log('Test 7: Handoff engine preserves escalationReason and escalationType');
{
  const analysis = makeAnalysis({ intent: 'other/ambiguous' });
  const rootCause = makeRootCause({ matchedPolicy: null, confidence: 40, rootCause: 'Unknown request — no policy coverage' });
  const investigation = makeInvestigation({ orderVerified: false });
  const d = decide('sponsor our college fest', analysis, rootCause, investigation, makeRisk({ score: 10 }), null);
  const handoff = buildHandoff(investigation, rootCause, d);
  check('Handoff type is HUMAN_ESCALATION', handoff.type === 'HUMAN_ESCALATION');
  check('agentSummary.escalationReason is set', !!handoff.agentSummary?.escalationReason);
  check('agentSummary.escalationType is POLICY_EVIDENCE', handoff.agentSummary?.escalationType === 'POLICY_EVIDENCE');
  check('agentSummary.recommendedAction is set', !!handoff.agentSummary?.recommendedAction);
}
console.log('');

// ── Test 7b: Handoff for confirmed fraud escalation ──
console.log('Test 7b: Handoff for confirmed fraud escalation has correct metadata');
{
  const analysis = makeAnalysis();
  const rootCause = makeRootCause();
  const investigation = makeInvestigation();
  const confirmedRisk = makeRisk({
    score: 75,
    level: 'high',
    factors: [{ id: 'confirmed_fraud_history', state: 'confirmed', points: 50, detail: 'Prior confirmed chargeback fraud' }],
  });
  const d = decide('payment issue', analysis, rootCause, investigation, confirmedRisk, null);
  const handoff = buildHandoff(investigation, rootCause, d);
  check('Handoff type is HUMAN_ESCALATION', handoff.type === 'HUMAN_ESCALATION');
  check('agentSummary.escalationType is CONFIRMED_FRAUD', handoff.agentSummary?.escalationType === 'CONFIRMED_FRAUD');
}
console.log('');

// ── Test 8: Missing or malformed score → safe fallback ──
console.log('Test 8: Missing/malformed risk score → safe fallback');
{
  // null risk
  const d1 = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), null, null);
  check('null risk → AUTO_RESOLVE (not crashed)', d1.decision === 'AUTO_RESOLVE');

  // undefined score
  const d2 = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), { score: undefined, level: 'low', threshold: 50, factors: [] }, null);
  check('undefined score → AUTO_RESOLVE (not falsely escalated)', d2.decision === 'AUTO_RESOLVE');

  // NaN score
  const d3 = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), { score: NaN, level: 'low', threshold: 50, factors: [] }, null);
  check('NaN score → AUTO_RESOLVE (not falsely escalated)', d3.decision === 'AUTO_RESOLVE');

  // Score as string
  const d4 = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), { score: 'high', level: 'low', threshold: 50, factors: [] }, null);
  check('String score → AUTO_RESOLVE (not falsely escalated)', d4.decision === 'AUTO_RESOLVE');
}
console.log('');

// ── Test 9: Verify Manually → existing behaviour preserved ──
console.log('Test 9: Verify Manually — existing behaviour and audit logging remain intact');
{
  const d = decide('someone logged into my account', makeAnalysis({ intent: 'security/unauthorized_activity' }), makeRootCause({ matchedPolicy: 'POLICY9', confidence: 70 }), makeInvestigation({ orderVerified: false }), makeRisk({ score: 10 }), null);
  check('decision has .decision field', typeof d.decision === 'string');
  check('decision has .reasoning field', typeof d.reasoning === 'string');
  check('decision has .confidence field', typeof d.confidence === 'number');
  check('decision has .sentimentNote field', typeof d.sentimentNote === 'string');
  check('decision has .escalationType (additive)', typeof d.escalationType === 'string');
  check('decision has .escalationReason (additive)', typeof d.escalationReason === 'string');
}
console.log('');

// ── Test 10: Non-escalation decisions have no escalation metadata ──
console.log('Test 10: Non-escalation decisions have no stale escalation metadata');
{
  const d1 = decide('payment 2 baar kat gyi ORDER001', makeAnalysis(), makeRootCause(), makeInvestigation(), makeRisk({ score: 5 }), null);
  check('AUTO_RESOLVE has no escalationType', !d1.escalationType);
  check('AUTO_RESOLVE has no escalationReason', !d1.escalationReason);

  const d2 = decide('cancel order', makeAnalysis({ intent: 'cancellation' }), makeRootCause({ matchedPolicy: 'POLICY5', confidence: 65 }), makeInvestigation({ focusOrder: { id: 'O1', customerId: 'CUST001', status: 'cancelled', amount: 1000 } }), makeRisk({ score: 5 }), null);
  check('CUSTOMER_CONFIRM has no escalationType', !d2.escalationType);
  check('CUSTOMER_CONFIRM has no escalationReason', !d2.escalationReason);
}
console.log('');

// ── Test 11: Physical verification with image reuse collision → IMAGE_REUSE escalation ──
console.log('Test 11: Physical verification + image reuse collision → IMAGE_REUSE escalation');
{
  const d = decide('my phone screen cracked', makeAnalysis({ intent: 'product_issue' }), makeRootCause({ matchedPolicy: 'POLICY6', confidence: 85 }), makeInvestigation({ focusOrder: { id: 'O1', customerId: 'CUST001', amount: 2000, product: 'Phone' } }), makeRisk({ score: 45 }), { provided: 1, analyzed: true, vision: { productMatchesOrder: 'yes', damageVisible: true, damageConsistentWithComplaint: 'yes', confidence: 90 }, reuse: { detected: true, detail: 'Exact hash collision' }, hashes: [] });
  check('Decision is HUMAN_ESCALATION (not AUTO_RESOLVE)', d.decision === 'HUMAN_ESCALATION');
  check('escalationType is IMAGE_REUSE', d.escalationType === 'IMAGE_REUSE');
  check('reasonCode is IMAGE_REUSE_DETECTED', d.reasonCode === 'IMAGE_REUSE_DETECTED');
}
console.log('');

// ── Summary ──
console.log('========================================================================');
console.log(`  Summary: ${passed} PASSED, ${failed} FAILED across ${passed + failed} assertions`);
console.log('========================================================================');
console.log('');

process.exit(failed > 0 ? 1 : 0);
