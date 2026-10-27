/**
 * Decision Engine: Decides the resolution path based on verified evidence,
 * policies, confidence, and category safety — NEVER sentiment alone.
 *
 * Invariants:
 * 1. Claims vs Evidence: LLM output is claim; only dataStore is evidence.
 * 2. Customer Isolation: customerId is security boundary.
 * 3. Ownership check is deterministic and mandatory: If failed => HUMAN_ESCALATION, confidence 0.
 * 4. No Fabrication: Missing evidence => HUMAN_ESCALATION with clear statement.
 * 5. Security/Unauthorized Activity: NEVER AUTO_RESOLVE under any circumstance.
 * 6. High Confidence alone NEVER triggers AUTO_RESOLVE without satisfied evidence & policy.
 * 7. Verdict Independence: The numeric fraud score does NOT decide escalation.
 *    Escalation occurs only upon explicit confirmed signals (isolation failure, security intent,
 *    confirmed fraud record, image reuse collision, unverified evidence, or missing policy).
 */

const PHYSICAL_VERIFICATION_INTENTS = [
  'product_issue',
  'product_quality',
];

const PHOTO_VALUE_CAP = Number(process.env.PHOTO_VALUE_CAP) || 5000;
const PHOTO_MIN_CONFIDENCE = Number(process.env.PHOTO_MIN_CONFIDENCE) || 80;

function decide(complaintText, analysis, rootCause, investigation, risk, photo) {
  const { confidence, matchedPolicy } = rootCause;
  const intent = analysis.intent;
  const subIntent = analysis.subIntent;

  function buildEscalation({
    policyReasoning = null,
    policyShortReason = null,
    escalationType = 'POLICY_EVIDENCE',
    reasonCode = null,
    forcedConfidence = null,
    sentimentNote = null,
  } = {}) {
    const finalConfidence = forcedConfidence !== null ? forcedConfidence : confidence;
    const defaultNote = sentimentNote || `Note: Decision based on ${policyShortReason || 'verified evidence'}, not sentiment (${analysis?.sentiment || 'Neutral'}).`;
    return {
      decision: 'HUMAN_ESCALATION',
      reasoning: policyReasoning,
      confidence: finalConfidence,
      sentimentNote: defaultNote,
      escalationType,
      escalationReason: policyShortReason || 'Human review required',
      escalationReasons: [policyReasoning],
      reasonCode: reasonCode || escalationType,
    };
  }

  // SAFETY GUARD 1: Order ownership check failed (Mandatory isolation boundary)
  if (investigation && investigation.orderMismatch) {
    return buildEscalation({
      policyReasoning: `Order #${investigation.orderHintDetected} could not be verified for customer ${investigation.customer.id}. Customer isolation boundary enforced; cross-customer access is prohibited.`,
      policyShortReason: 'Customer order ownership mismatch',
      escalationType: 'ISOLATION',
      reasonCode: 'CUSTOMER_ISOLATION_MISMATCH',
      forcedConfidence: 0,
      sentimentNote: `Note: Decision based strictly on customer order ownership verification, not sentiment (${analysis.sentiment}).`,
    });
  }

  // SAFETY GUARD 2: Explicit confirmed fraud history on file (Mandatory manual review)
  const confirmedFraudFactor = risk?.factors?.find((f) => f.id === 'confirmed_fraud_history' && f.state === 'confirmed');
  if (confirmedFraudFactor) {
    return buildEscalation({
      policyReasoning: `Customer account has confirmed fraud history on file (${confirmedFraudFactor.detail}). Mandatory manual review required before any action.`,
      policyShortReason: 'Confirmed fraud history on customer record',
      escalationType: 'CONFIRMED_FRAUD',
      reasonCode: 'CONFIRMED_FRAUD_HISTORY',
    });
  }

  // SAFETY GUARD 3: Security & unauthorized activity (Mandatory Escalation)
  const isSecurity =
    intent === 'security/unauthorized_activity' ||
    intent === 'account' ||
    subIntent === 'suspicious_activity' ||
    subIntent === 'account_security' ||
    subIntent === 'unauthorized_login_or_access' ||
    matchedPolicy === 'POLICY9';

  if (isSecurity) {
    return buildEscalation({
      policyReasoning: 'Security and unauthorized activity claims require mandatory manual review by Security Operations — never auto-resolved regardless of confidence score.',
      policyShortReason: 'Security / unauthorized activity review required (POLICY9)',
      escalationType: 'SECURITY',
      reasonCode: 'SECURITY_MANDATORY_REVIEW',
      sentimentNote: `Note: Escalated per security policy POLICY9, not sentiment (${analysis.sentiment}).`,
    });
  }

  // SAFETY GUARD 4 (2.0): Physical verification, evidence-based via the photo pipeline
  const isPhysicalVerification =
    PHYSICAL_VERIFICATION_INTENTS.includes(intent) ||
    ['POLICY6', 'POLICY8', 'POLICY10'].includes(matchedPolicy);

  if (isPhysicalVerification) {
    const note = `Note: Physical-verification decision based on evidence, not sentiment (${analysis.sentiment}).`;

    const isCarrierDispute = matchedPolicy === 'POLICY10' || subIntent === 'delivered_not_received';
    if (isCarrierDispute) {
      return buildEscalation({
        policyReasoning: 'Carrier tracking marks delivery but customer disputes receipt. Requires logistics proof-of-delivery (POD) verification before financial resolution.',
        policyShortReason: 'Carrier dispute — Proof of Delivery (POD) required',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'CARRIER_DISPUTE_POD_REQUIRED',
        sentimentNote: note,
      });
    }
    if (!photo || !photo.provided) {
      return buildEscalation({
        policyReasoning: 'Product condition claims rely on unverified customer words and require photo or reverse pickup verification prior to refund. No photo was provided.',
        policyShortReason: 'Missing photo evidence for physical claim',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'MISSING_PHOTO_EVIDENCE',
        sentimentNote: note,
      });
    }
    if (!matchedPolicy) {
      return buildEscalation({
        policyReasoning: 'Photo received, but no active policy matches this product complaint; requires human review.',
        policyShortReason: 'Missing policy coverage for product claim',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'MISSING_POLICY_COVERAGE',
        sentimentNote: note,
      });
    }
    const ord = investigation.focusOrder;
    if (!investigation.orderVerified || !ord || ord.customerId !== investigation.customer.id) {
      return buildEscalation({
        policyReasoning: 'Photo received, but no verified order for this customer; no automated action taken.',
        policyShortReason: 'Unverified order for product claim',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'UNVERIFIED_ORDER',
        sentimentNote: note,
      });
    }

    // Explicit confirmed signal: Reused image hash collision
    if (photo.reuse && photo.reuse.detected) {
      return buildEscalation({
        policyReasoning: `Photo evidence rejected: ${photo.reuse.detail}. Possible image reuse; manual fraud review required.`,
        policyShortReason: 'Image reuse detected — manual review required',
        escalationType: 'IMAGE_REUSE',
        reasonCode: 'IMAGE_REUSE_DETECTED',
        sentimentNote: note,
      });
    }
    if (!photo.analyzed || !photo.vision) {
      return buildEscalation({
        policyReasoning: 'Photo was received but could not be analysed automatically; manual review required.',
        policyShortReason: 'Photo analysis inconclusive — manual review required',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'PHOTO_ANALYSIS_INCONCLUSIVE',
        sentimentNote: note,
      });
    }

    const v = photo.vision;
    // Explicit confirmed signal: Suspected manipulated, stock, or AI generated image
    if (v.looksLikeStockOrScreenshot || v.looksEditedOrAiGenerated) {
      return buildEscalation({
        policyReasoning: 'Photo appears to be a stock image, screenshot, or edited/generated image; manual authenticity review required.',
        policyShortReason: 'Suspected stock / edited / AI image',
        escalationType: 'SUSPECTED_MANIPULATION',
        reasonCode: 'PHOTO_MANIPULATION_SUSPECTED',
        sentimentNote: note,
      });
    }
    if (matchedPolicy === 'POLICY8') {
      return buildEscalation({
        policyReasoning: 'Wrong-item claims must be compared against warehouse dispatch logs (POLICY8); a photo alone cannot prove what was shipped. Photo analysis attached for the agent.',
        policyShortReason: 'Wrong-item warehouse dispatch log check required (POLICY8)',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'WAREHOUSE_DISPATCH_LOG_CHECK',
        sentimentNote: note,
      });
    }
    if (v.productMatchesOrder === 'no') {
      return buildEscalation({
        policyReasoning: `Photo shows an item that does not match the ordered product (${ord.product}); manual review required.`,
        policyShortReason: 'Product mismatch in photo evidence',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'PRODUCT_MISMATCH',
        sentimentNote: note,
      });
    }
    if (ord.amount > PHOTO_VALUE_CAP) {
      return buildEscalation({
        policyReasoning: `Order value INR ${ord.amount} exceeds the photo auto-resolution cap of INR ${PHOTO_VALUE_CAP}; manual approval required.`,
        policyShortReason: 'Order value exceeds photo auto-resolution limit',
        escalationType: 'POLICY_EVIDENCE',
        reasonCode: 'PHOTO_VALUE_CAP_EXCEEDED',
        sentimentNote: note,
      });
    }

    const strong =
      v.productMatchesOrder === 'yes' &&
      v.damageVisible &&
      v.damageConsistentWithComplaint === 'yes' &&
      v.confidence >= PHOTO_MIN_CONFIDENCE &&
      confidence >= 70;

    if (strong && matchedPolicy === 'POLICY6') {
      return {
        decision: 'AUTO_RESOLVE',
        reasoning: `Photo evidence verified: product matches order ${ord.id}, damage visible and consistent with the complaint (vision confidence ${v.confidence}%), image never used before, order value within cap. Policy POLICY6 satisfied.`,
        confidence,
        sentimentNote: note,
      };
    }

    // Inconclusive photo evidence requires customer confirmation or manual review
    return {
      decision: 'CUSTOMER_CONFIRM',
      reasoning: `Photo evidence is only partially conclusive (product match: ${v.productMatchesOrder}, damage visible: ${v.damageVisible}, consistent with complaint: ${v.damageConsistentWithComplaint}, vision confidence ${v.confidence}%). A clearer photo or customer confirmation is needed.`,
      confidence,
      sentimentNote: note,
    };
  }

  // SAFETY GUARD 5: Policy coverage missing or ambiguous intent
  if (!matchedPolicy || intent === 'other/ambiguous') {
    return buildEscalation({
      policyReasoning: !matchedPolicy
        ? `No active policy matches intent "${intent}". Requires human support agent to review policy coverage.`
        : 'Complaint text is ambiguous or lacks verified transaction evidence; requires human review.',
      policyShortReason: !matchedPolicy
        ? 'Missing policy coverage — human review required'
        : 'Ambiguous complaint / insufficient transaction evidence',
      escalationType: 'POLICY_EVIDENCE',
      reasonCode: !matchedPolicy ? 'MISSING_POLICY_COVERAGE' : 'AMBIGUOUS_COMPLAINT_EVIDENCE',
      sentimentNote: `Note: Decision based on missing policy coverage/evidence, not sentiment (${analysis.sentiment}).`,
    });
  }

  // Check the AUTO_RESOLVE criteria against verified evidence:
  // 1. Customer verified (checked in investigation.found)
  // 2. Order verified for customer (if order-related intent)
  const orderRequired = ['payment/billing', 'payment', 'cancellation', 'refund/return', 'refund', 'order_status/delay'].includes(intent);
  const orderVerified = investigation.orderVerified && investigation.focusOrder?.customerId === investigation.customer.id;

  // 3. Matched policy exists (verified above)
  // 4. Policy conditions satisfied by verified evidence
  let evidenceSatisfied = true;
  let policyFailureReason = '';

  if (matchedPolicy === 'POLICY7') {
    // Duplicate payment: order verified, amount known, >= 2 successful payments
    const successfulPayments = (investigation.focusPayments || []).filter(
      (p) => (p.status === 'success' || p.gatewayStatus === 'success') && p.customerId === investigation.customer.id
    );
    if (!orderVerified) {
      evidenceSatisfied = false;
      policyFailureReason = 'Missing verified customer order.';
    } else if (successfulPayments.length < 2) {
      evidenceSatisfied = false;
      policyFailureReason = 'Payment gateway records do not confirm multiple successful charges for this order.';
    }
  } else if (matchedPolicy === 'POLICY1') {
    // Mismatched payment status
    const deductedFailed = (investigation.focusPayments || investigation.payments || []).filter(
      (p) => p.gatewayStatus === 'success' && p.localStatus === 'failed'
    );
    if (deductedFailed.length === 0) {
      evidenceSatisfied = false;
      policyFailureReason = 'No gateway deduction with failed local order found.';
    }
  } else if (matchedPolicy === 'POLICY2') {
    // Pending refund: refund record exists and status === 'pending'
    const pendingRefund = (investigation.focusRefunds || investigation.refunds || []).find(
      (r) => r.customerId === investigation.customer.id && r.status === 'pending'
    );
    if (!pendingRefund) {
      evidenceSatisfied = false;
      policyFailureReason = 'No pending refund record found in backend.';
    }
  } else if (matchedPolicy === 'POLICY4') {
    // Return received refund eligibility
    if (!investigation.focusOrder || (investigation.focusOrder.status !== 'returned' && investigation.focusOrder.returnStatus !== 'item_received_warehouse')) {
      evidenceSatisfied = false;
      policyFailureReason = 'Order is not verified as returned in logistics system.';
    }
  } else if (matchedPolicy === 'POLICY5') {
    // Cancelled order
    if (!investigation.focusOrder || investigation.focusOrder.status !== 'cancelled') {
      evidenceSatisfied = false;
      policyFailureReason = 'Order is not recorded as cancelled in backend.';
    }
  } else if (matchedPolicy === 'POLICY11') {
    // Order in-transit status
    if (!investigation.focusOrder || (investigation.focusOrder.status !== 'in_transit' && !investigation.focusOrder.courierTracking)) {
      evidenceSatisfied = false;
      policyFailureReason = 'Order is not in transit.';
    }
  } else if (matchedPolicy === 'POLICY3') {
    // Return window
    if (!investigation.focusOrder || investigation.focusOrder.status !== 'delivered') {
      evidenceSatisfied = false;
      policyFailureReason = 'Order is not delivered or return already requested.';
    }
  }

  // Delay compensation is an offer the customer must choose (credit vs expedite)
  if (matchedPolicy === 'POLICY11' && evidenceSatisfied && orderVerified && confidence >= 60) {
    const o = investigation.focusOrder;
    const today = new Date().toISOString().slice(0, 10);
    const delayed = o.courierStatus === 'delayed' || (o.estimatedDelivery && o.estimatedDelivery < today);
    if (delayed) {
      return {
        decision: 'CUSTOMER_CONFIRM',
        reasoning: `Order ${o.id} is past its expected delivery date (ETA ${o.estimatedDelivery || 'unknown'}, courier status: ${o.courierStatus || 'in transit'}). Eligible under POLICY11 for a shipping credit or expedited redelivery; the customer chooses the remedy.`,
        confidence,
        sentimentNote: `Note: Decision based on verified delivery records, not sentiment (${analysis.sentiment}).`,
      };
    }
  }

  // High confidence (>= 85) + verified evidence satisfies policy -> AUTO_RESOLVE
  if (confidence >= 85 && evidenceSatisfied && (orderVerified || !orderRequired)) {
    return {
      decision: 'AUTO_RESOLVE',
      reasoning: `High confidence (${confidence}%) and verified evidence satisfies policy ${matchedPolicy} conditions for customer ${investigation.customer.id}. Safe for automated resolution.`,
      confidence,
      sentimentNote: `Note: Decision based strictly on verified records and policy criteria, not sentiment (${analysis.sentiment}).`,
    };
  }

  // Medium confidence or needs customer confirmation
  if (confidence >= 60 && evidenceSatisfied) {
    return {
      decision: 'CUSTOMER_CONFIRM',
      reasoning: `Verified records match policy ${matchedPolicy} with ${confidence}% confidence, but customer confirmation is recommended before finalizing.`,
      confidence,
      sentimentNote: `Note: Decision based on policy requirements, not sentiment (${analysis.sentiment}).`,
    };
  }

  // Otherwise, escalate due to insufficient evidence or confidence below threshold
  return buildEscalation({
    policyReasoning: policyFailureReason
      ? `${policyFailureReason} Insufficient verified evidence to auto-resolve.`
      : `Confidence score (${confidence}%) below automation threshold or evidence incomplete. Requires human investigation.`,
    policyShortReason: policyFailureReason
      ? `Insufficient verified evidence (${policyFailureReason.replace(/\.$/, '')})`
      : `Confidence score (${confidence}%) below automation threshold`,
    escalationType: 'POLICY_EVIDENCE',
    reasonCode: policyFailureReason ? 'INSUFFICIENT_EVIDENCE' : 'LOW_CONFIDENCE',
    sentimentNote: `Note: Decision based on verified evidence completeness, not sentiment (${analysis.sentiment}).`,
  });
}

module.exports = { decide };
