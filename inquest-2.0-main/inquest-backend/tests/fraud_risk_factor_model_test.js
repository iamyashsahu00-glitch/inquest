/**
 * Fraud & Abuse Risk Scoring & Transparency Test Suite
 *
 * Covers:
 *  1. Low-risk escalated case: low score, HUMAN_ESCALATION, breakdown shows clear vs unknown
 *  2. Auto-resolved case: score computed from evidence, not forced low
 *  3. Repeated claims: score rises exactly by documented points
 *  4. Reused image: counted once, under reused_image only
 *  5. Missing data: unknown factors add 0 points; no data gives score null
 *  6. No hardcoding: identical evidence with different customer ID / verdict gives identical score;
 *     changing one input changes score by documented points
 *  7. Invariants: sum(factor points) === rawTotal; level matches threshold
 *  8. Uncertain authenticity plus low fraud risk gives manual review
 *  9. API contract: new fields present, old fields preserved
 *
 * Deterministic, in-memory fixtures only, NO network, NO Gemini, NO real inquest.db.
 */

const assert = require('assert');
const { computeRisk, determineAuthenticity, RISK_CONSTANTS } = require('../src/services/riskEngine');
const { decide } = require('../src/services/decisionEngine');
const { buildHandoff } = require('../src/services/handoffEngine');

let passedCount = 0;
let failedCount = 0;

function check(testName, condition, detail = '') {
  if (condition) {
    passedCount++;
    console.log(`  ✅ ${testName} ${detail ? '— ' + detail : ''}`);
  } else {
    failedCount++;
    console.error(`  ❌ ${testName} ${detail ? '— FAILED: ' + detail : ''}`);
  }
}

console.log('========================================================================');
console.log('  FRAUD RISK FACTOR MODEL & VERDICT INDEPENDENCE TEST SUITE');
console.log('========================================================================\n');

// --------------------------------------------------------------------------
// TEST 1: Low-risk escalated case
// --------------------------------------------------------------------------
console.log('Scenario 1: Low-risk escalated case (missing policy / ambiguous claim)');
{
  const fixture = {
    customer: { id: 'CUST_TEST_01', joinedOn: '2023-01-01', confirmedFraudHistory: false }, // Established account
    orders: [{ id: 'ORD1', amount: 1200 }],
    refunds: [],
    tickets: [], // 0 claims
    securityEvents: [], // 0 flagged
    photo: null, // No photo
  };

  const risk = computeRisk(fixture);
  check('Risk score is 0/100 (low risk)', risk.score === 0);
  check('Level is low', risk.level === 'low');
  check('Status is partial (5 of 6 evaluable, photo unknown)', risk.status === 'partial');

  const accountFactor = risk.factors.find((f) => f.id === 'account_age');
  const reusedImageFactor = risk.factors.find((f) => f.id === 'reused_image');
  check('Account age is clear', accountFactor.state === 'clear' && accountFactor.points === 0);
  check('Reused image is unknown (no photo submitted)', reusedImageFactor.state === 'unknown' && reusedImageFactor.points === 0);

  // Decision with ambiguous intent / no matched policy
  const analysis = { intent: 'other/ambiguous', sentiment: 'neutral' };
  const rootCause = { confidence: 35, matchedPolicy: null, rootCause: 'No active policy matches ambiguous complaint' };
  const investigation = { found: true, customer: fixture.customer, orderVerified: false };

  const decision = decide('please sponsor our annual college festival', analysis, rootCause, investigation, risk, null);
  check('Verdict is HUMAN_ESCALATION despite low risk score', decision.decision === 'HUMAN_ESCALATION');
  check('Escalation reason relates to policy coverage, not fraud', decision.reasonCode === 'MISSING_POLICY_COVERAGE');
}
console.log('');

// --------------------------------------------------------------------------
// TEST 2: Auto-resolved case (score computed from evidence, not forced low)
// --------------------------------------------------------------------------
console.log('Scenario 2: Auto-resolved case (score is computed from evidence, not forced low)');
{
  // Customer has a young account (30-89 days old = +5 pts) and 2 prior claims (+10 pts) -> score = 15
  const fixture = {
    customer: { id: 'CUST_TEST_02', joinedOn: new Date(Date.now() - 45 * 86400000).toISOString(), confirmedFraudHistory: false },
    orders: [{ id: 'ORD_DUP', customerId: 'CUST_TEST_02', amount: 1500 }],
    refunds: [],
    tickets: [
      { id: 'T1', date: new Date(Date.now() - 10 * 86400000).toISOString(), category: 'product', subject: 'damaged box' },
      { id: 'T2', date: new Date(Date.now() - 20 * 86400000).toISOString(), category: 'product', subject: 'item torn' },
    ],
    securityEvents: [],
    photo: null,
  };

  const risk = computeRisk(fixture);
  check('Score computed from evidence equals 15 (5 + 10)', risk.score === 15);
  check('Score is not forced to 0 or 10', risk.score === 15);

  // Decision is valid duplicate payment under POLICY7
  const analysis = { intent: 'payment/billing', subIntent: 'duplicate_charge', sentiment: 'neutral' };
  const rootCause = { confidence: 95, matchedPolicy: 'POLICY7', rootCause: 'Two successful gateway debits for one order' };
  const investigation = {
    found: true,
    customer: fixture.customer,
    orderVerified: true,
    focusOrder: fixture.orders[0],
    focusPayments: [
      { id: 'P1', customerId: 'CUST_TEST_02', status: 'success', gatewayStatus: 'success' },
      { id: 'P2', customerId: 'CUST_TEST_02', status: 'success', gatewayStatus: 'success' },
    ],
  };

  const decision = decide('two charges on my card for ORD_DUP', analysis, rootCause, investigation, risk, null);
  check('Verdict is AUTO_RESOLVE on verified evidence', decision.decision === 'AUTO_RESOLVE');
  // Auto-resolve did NOT lower or overwrite the risk score
  check('Risk score remains 15 after auto-resolve verdict', risk.score === 15);
}
console.log('');

// --------------------------------------------------------------------------
// TEST 3: Repeated claims (score rises exactly by documented points)
// --------------------------------------------------------------------------
console.log('Scenario 3: Repeated claims (score rises by exact documented points)');
{
  const baseFixture = {
    customer: { id: 'CUST_TEST_03', joinedOn: '2023-01-01', confirmedFraudHistory: false },
    orders: [{ id: 'ORD1', amount: 500 }],
    refunds: [],
    tickets: [], // 0 claims
    securityEvents: [],
  };

  const risk0 = computeRisk(baseFixture);
  check('Baseline 0 claims points = 0', risk0.factors.find((f) => f.id === 'repeated_claims').points === 0);
  check('Baseline total score = 0', risk0.score === 0);

  // 2 claims in 180 days -> suspected (+10 points)
  const fixture2 = {
    ...baseFixture,
    tickets: [
      { id: 'T1', date: new Date(Date.now() - 5 * 86400000).toISOString(), category: 'product', subject: 'item defect' },
      { id: 'T2', date: new Date(Date.now() - 15 * 86400000).toISOString(), category: 'product', subject: 'missing part' },
    ],
  };
  const risk2 = computeRisk(fixture2);
  const repeatedFactor2 = risk2.factors.find((f) => f.id === 'repeated_claims');
  check('2 claims state is suspected', repeatedFactor2.state === 'suspected');
  check('2 claims adds exactly +10 points', repeatedFactor2.points === 10);
  check('Total score increased by exactly 10', risk2.score === risk0.score + 10);

  // 3 claims in 180 days -> confirmed (+25 points)
  const fixture3 = {
    ...baseFixture,
    tickets: [
      { id: 'T1', date: new Date(Date.now() - 5 * 86400000).toISOString(), category: 'product', subject: 'item defect' },
      { id: 'T2', date: new Date(Date.now() - 15 * 86400000).toISOString(), category: 'product', subject: 'missing part' },
      { id: 'T3', date: new Date(Date.now() - 25 * 86400000).toISOString(), category: 'product', subject: 'damaged screen' },
    ],
  };
  const risk3 = computeRisk(fixture3);
  const repeatedFactor3 = risk3.factors.find((f) => f.id === 'repeated_claims');
  check('3 claims state is confirmed', repeatedFactor3.state === 'confirmed');
  check('3 claims adds exactly +25 points', repeatedFactor3.points === 25);
  check('Total score increased by exactly 25 over baseline', risk3.score === risk0.score + 25);
}
console.log('');

// --------------------------------------------------------------------------
// TEST 4: Reused image (counted once, under reused_image only)
// --------------------------------------------------------------------------
console.log('Scenario 4: Reused image (counted once under reused_image only)');
{
  const fixtureWithReuse = {
    customer: { id: 'CUST_TEST_04', joinedOn: '2023-01-01', confirmedFraudHistory: false },
    orders: [{ id: 'ORD1', amount: 2000 }],
    refunds: [],
    tickets: [],
    securityEvents: [],
    photo: {
      provided: 1,
      analyzed: true,
      hashes: [{ hash: 'abc123hash', reused: true }],
      reuse: { detected: true, detail: 'photo previously submitted by customer CUST999' },
      vision: { looksLikeStockOrScreenshot: false, looksEditedOrAiGenerated: false },
    },
  };

  const risk = computeRisk(fixtureWithReuse);
  const reusedFactor = risk.factors.find((f) => f.id === 'reused_image');
  check('Reused image state is confirmed', reusedFactor.state === 'confirmed');
  check('Reused image points is exactly +30', reusedFactor.points === 30);
  check('Total score is 30', risk.score === 30);

  // Verify NO other factor got points for this image
  const otherFactorsWithPoints = risk.factors.filter((f) => f.id !== 'reused_image' && f.points > 0);
  check('Zero other factors counted image reuse (no double counting)', otherFactorsWithPoints.length === 0);
}
console.log('');

// --------------------------------------------------------------------------
// TEST 5: Missing data (unknown factors add 0; no data gives score null)
// --------------------------------------------------------------------------
console.log('Scenario 5: Missing data (unknown factors add 0 pts; no data gives score null)');
{
  // Partial missing data: customer has joinedOn, but tickets and securityEvents are null (data unavailable)
  const partialFixture = {
    customer: { id: 'CUST_TEST_05', joinedOn: '2023-01-01' },
    orders: null, // unavailable
    refunds: null,
    tickets: null, // unavailable
    securityEvents: null, // unavailable
    photo: null, // unavailable
  };

  const partialRisk = computeRisk(partialFixture);
  check('Status is partial', partialRisk.status === 'partial');
  check('Coverage shows 2 of 6 factors evaluable', partialRisk.coverage === '2 of 6 factors evaluable');

  const unknownFactors = partialRisk.factors.filter((f) => f.state === 'unknown');
  check('4 factors are unknown', unknownFactors.length === 4);
  const unknownPointsSum = unknownFactors.reduce((s, f) => s + f.points, 0);
  check('Unknown factors contribute exactly 0 points', unknownPointsSum === 0);
  check('Score is 0 from evaluable clean factors', partialRisk.score === 0);

  // Complete missing data (no data at all)
  const emptyFixture = {
    customer: null,
    orders: null,
    refunds: null,
    tickets: null,
    securityEvents: null,
    photo: null,
  };
  const emptyRisk = computeRisk(emptyFixture);
  check('Status is insufficient_data when no factor is evaluable', emptyRisk.status === 'insufficient_data');
  check('Score is strictly null (not 0, not 10)', emptyRisk.score === null);
  check('RawTotal is null', emptyRisk.rawTotal === null);
}
console.log('');

// --------------------------------------------------------------------------
// TEST 6: No hardcoding (identical evidence with different customer ID / verdict)
// --------------------------------------------------------------------------
console.log('Scenario 6: No hardcoding (customer ID and verdict independence)');
{
  const makeCustEvidence = (id, tier = 'silver') => ({
    customer: { id, tier, joinedOn: '2023-01-01', confirmedFraudHistory: false },
    orders: [{ id: 'O1', amount: 1000 }],
    refunds: [],
    tickets: [{ id: 'T1', date: new Date(Date.now() - 10 * 86400000).toISOString(), category: 'product', subject: 'damaged' }],
    securityEvents: [{ id: 'S1', flagged: 1, alert: 'Foreign IP' }],
    photo: null,
  });

  const riskCUST1 = computeRisk(makeCustEvidence('CUST001', 'platinum'));
  const riskCUST2 = computeRisk(makeCustEvidence('CUST999', 'silver'));

  check('Identical evidence for CUST001 (platinum) and CUST999 (silver) gives identical score', riskCUST1.score === riskCUST2.score);
  check('Tier does NOT manipulate the score', riskCUST1.score === 10); // 1 flagged security event = 10 pts
  check('Identical factors returned for both customers', JSON.stringify(riskCUST1.factors.map(f => f.points)) === JSON.stringify(riskCUST2.factors.map(f => f.points)));

  // Changing one input changes score by exactly documented points
  // Add a 2nd flagged security event (+10 points more to reach 20 confirmed points)
  const evidence2Sec = makeCustEvidence('CUST001');
  evidence2Sec.securityEvents.push({ id: 'S2', flagged: 1, alert: 'Unrecognized device' });
  const risk2Sec = computeRisk(evidence2Sec);
  check('Adding 2nd flagged event changes suspicious_patterns from 10 to 20', risk2Sec.factors.find((f) => f.id === 'suspicious_patterns').points === 20);
  check('Score changed by exactly +10 points (from 10 to 20)', risk2Sec.score === riskCUST1.score + 10);
}
console.log('');

// --------------------------------------------------------------------------
// TEST 7: Invariants
// --------------------------------------------------------------------------
console.log('Scenario 7: Invariants (sum = rawTotal; level matches threshold)');
{
  const fixture = {
    customer: { id: 'CUST_INV', joinedOn: new Date(Date.now() - 15 * 86400000).toISOString(), confirmedFraudHistory: true }, // new account (15) + confirmed fraud (50) = 65
    orders: [{ id: 'O1', amount: 500 }],
    refunds: [],
    tickets: [
      { id: 'T1', date: new Date(Date.now() - 5 * 86400000).toISOString(), category: 'product', subject: 'broken' },
      { id: 'T2', date: new Date(Date.now() - 10 * 86400000).toISOString(), category: 'product', subject: 'broken' },
      { id: 'T3', date: new Date(Date.now() - 15 * 86400000).toISOString(), category: 'product', subject: 'broken' },
    ], // 3 claims (25) -> rawTotal = 15 + 50 + 25 = 90
    securityEvents: [{ id: 'S1', flagged: 1 }], // 10 -> rawTotal = 100
    photo: null,
  };

  const risk = computeRisk(fixture);
  const factorSum = risk.factors.reduce((s, f) => s + f.points, 0);
  check('Invariant: sum(factor.points) === rawTotal', factorSum === risk.rawTotal);
  check('Invariant: rawTotal === 100', risk.rawTotal === 100);
  check('Invariant: cappedTotal === 100', risk.cappedTotal === 100);
  check('Invariant: level is "high" when score >= threshold (60)', risk.level === 'high' && risk.score >= risk.threshold);

  // Invariant: Dynamic 0-29 (Low), 30-59 (Medium), 60-100 (High) boundary checks
  const lowBoundaryRisk = computeRisk({ customer: { id: 'C1', joinedOn: new Date(Date.now() - 15 * 86400000).toISOString() }, tickets: [], securityEvents: [] }); // 15 pts
  check('Boundary 15 pts (0-29) -> level is "low"', lowBoundaryRisk.score === 15 && lowBoundaryRisk.level === 'low');

  const medBoundaryRisk = computeRisk({
    customer: { id: 'C1', joinedOn: new Date(Date.now() - 15 * 86400000).toISOString() }, // 15
    tickets: [{ id: 'T1', date: new Date(Date.now() - 5 * 86400000).toISOString(), category: 'product', subject: 'defect' }, { id: 'T2', date: new Date(Date.now() - 6 * 86400000).toISOString(), category: 'product', subject: 'defect' }], // 10
    securityEvents: [{ id: 'S1', flagged: 1 }], // 10 -> total 35
  });
  check('Boundary 35 pts (30-59) -> level is "medium"', medBoundaryRisk.score === 35 && medBoundaryRisk.level === 'medium');

  const highBoundaryRisk = computeRisk({
    customer: { id: 'C1', joinedOn: '2022-01-01', confirmedFraudHistory: true }, // 50
    securityEvents: [{ id: 'S1', flagged: 1 }], // 10 -> total 60
  });
  check('Boundary 60 pts (60-100) -> level is "high"', highBoundaryRisk.score === 60 && highBoundaryRisk.level === 'high');

  // Invariant when exceeding 100
  const highReuseFixture = {
    ...fixture,
    photo: { provided: 1, hashes: [{ hash: 'h1', reused: true }], reuse: { detected: true } }, // +30 -> rawTotal = 130
  };
  const highRisk = computeRisk(highReuseFixture);
  const highFactorSum = highRisk.factors.reduce((s, f) => s + f.points, 0);
  check('Invariant: sum(factor.points) equals rawTotal (130)', highFactorSum === highRisk.rawTotal && highRisk.rawTotal === 130);
  check('Invariant: cappedTotal is capped at 100', highRisk.cappedTotal === 100);
  check('Invariant: score equals cappedTotal (100)', highRisk.score === 100);
}
console.log('');

// --------------------------------------------------------------------------
// TEST 8: Uncertain authenticity plus low fraud risk gives manual review
// --------------------------------------------------------------------------
console.log('Scenario 8: Uncertain authenticity + low fraud risk gives manual review');
{
  const fixture = {
    customer: { id: 'CUST_TEST_08', joinedOn: '2022-01-01', confirmedFraudHistory: false },
    orders: [{ id: 'ORD8', customerId: 'CUST_TEST_08', amount: 1200, product: 'Smart Watch' }],
    refunds: [],
    tickets: [],
    securityEvents: [],
  };

  // Photo is provided, but vision analysis is inconclusive (confidence = 65 < 80, product match is partial)
  const photo = {
    provided: 1,
    analyzed: true,
    reuse: { detected: false, detail: null },
    hashes: [{ hash: 'hash888', reused: false }],
    vision: {
      productMatchesOrder: 'partial',
      damageVisible: true,
      damageConsistentWithComplaint: 'partial',
      looksLikeStockOrScreenshot: false,
      looksEditedOrAiGenerated: false,
      confidence: 65,
    },
  };

  const risk = computeRisk(fixture, { photo });
  check('Fraud risk is 0/100 (clean history)', risk.score === 0);

  const authenticity = determineAuthenticity(photo);
  check('Evidence authenticity is "uncertain"', authenticity === 'uncertain');

  const analysis = { intent: 'product_issue', sentiment: 'neutral' };
  const rootCause = { confidence: 85, matchedPolicy: 'POLICY6', rootCause: 'Physical damage claim' };
  const investigation = {
    found: true,
    customer: fixture.customer,
    orderVerified: true,
    focusOrder: fixture.orders[0],
  };

  const decision = decide('watch screen is cracked', analysis, rootCause, investigation, risk, photo);
  check('Decision requires customer confirmation / manual review (not AUTO_RESOLVE)', decision.decision === 'CUSTOMER_CONFIRM');
  check('Reasoning explains inconclusive photo evidence', decision.reasoning.includes('partially conclusive'));
}
console.log('');

// --------------------------------------------------------------------------
// TEST 9: API Contract (new fields present, old fields preserved)
// --------------------------------------------------------------------------
console.log('Scenario 9: API Contract validation');
{
  const fixture = {
    customer: { id: 'CUST_TEST_09', joinedOn: '2023-01-01', confirmedFraudHistory: false },
    orders: [{ id: 'ORD9', amount: 800 }],
    refunds: [],
    tickets: [],
    securityEvents: [],
    photo: null,
  };

  const risk = computeRisk(fixture);

  // New fields present
  check('API contract: risk.factors array present', Array.isArray(risk.factors));
  check('API contract: risk.status present', typeof risk.status === 'string');
  check('API contract: risk.level present', typeof risk.level === 'string');
  check('API contract: risk.threshold present', typeof risk.threshold === 'number');
  check('API contract: risk.rawTotal present', typeof risk.rawTotal === 'number');
  check('API contract: risk.cappedTotal present', typeof risk.cappedTotal === 'number');
  check('API contract: risk.coverage present', typeof risk.coverage === 'string');
  check('API contract: risk.reasonCodes present', Array.isArray(risk.reasonCodes));

  // Each factor shape
  const sampleFactor = risk.factors[0];
  check('Factor shape: id, label, state, points, maxPoints, detail, evidenceRefs', (
    typeof sampleFactor.id === 'string' &&
    typeof sampleFactor.label === 'string' &&
    ['confirmed', 'suspected', 'unknown', 'clear'].includes(sampleFactor.state) &&
    typeof sampleFactor.points === 'number' &&
    typeof sampleFactor.maxPoints === 'number' &&
    typeof sampleFactor.detail === 'string' &&
    Array.isArray(sampleFactor.evidenceRefs)
  ));

  // Old fields preserved for backward compatibility
  check('Backward-compat: risk.score preserved', typeof risk.score === 'number');
  check('Backward-compat: risk.highThreshold preserved', typeof risk.highThreshold === 'number');
  check('Backward-compat: risk.signals array preserved', Array.isArray(risk.signals));
  check('Backward-compat: risk.customerId preserved', risk.customerId === 'CUST_TEST_09');

  // Authenticity states test
  check('Authenticity: no photo -> not_applicable', determineAuthenticity(null) === 'not_applicable');
  check('Authenticity: hash match -> suspected_manipulated', determineAuthenticity({ provided: 1, reuse: { detected: true } }) === 'suspected_manipulated');
  check('Authenticity: stock image -> suspected_manipulated', determineAuthenticity({ provided: 1, vision: { looksLikeStockOrScreenshot: true } }) === 'suspected_manipulated');
  check('Authenticity: verified photo -> verified', determineAuthenticity({ provided: 1, vision: { productMatchesOrder: 'yes', damageVisible: true, damageConsistentWithComplaint: 'yes', confidence: 90 } }) === 'verified');
}
console.log('');

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('========================================================================');
console.log(`  Summary: ${passedCount} PASSED, ${failedCount} FAILED across ${passedCount + failedCount} assertions`);
console.log('========================================================================\n');

process.exit(failedCount > 0 ? 1 : 0);
