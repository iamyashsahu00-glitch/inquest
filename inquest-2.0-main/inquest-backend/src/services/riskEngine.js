const db = require('../db/connection');

// ============================================================================
// DOCUMENTED RISK SCORING CONSTANTS (Single Source of Truth)
// ============================================================================
const RISK_CONSTANTS = {
  // Thresholds (0-29 Low Risk, 30-59 Medium Risk, 60-100 High Risk)
  HIGH_THRESHOLD: Number(process.env.RISK_HIGH_THRESHOLD) || 60,
  MEDIUM_THRESHOLD: 30,
  ELEVATED_THRESHOLD: 30,
  MAX_SCORE: 100,

  // Time windows (in milliseconds)
  DAY_MS: 86400000,
  CLAIMS_WINDOW_DAYS: 180,
  ACCOUNT_AGE_NEW_DAYS: 30,
  ACCOUNT_AGE_YOUNG_DAYS: 90,

  // Text matching rules
  CLAIM_SUBJECT: /not received|not arrived|damag|wrong item|missing|torn|broken|defect/i,

  // Factor definitions, max points, and point values
  FACTORS: {
    ACCOUNT_AGE: {
      id: 'account_age',
      label: 'Account Age',
      maxPoints: 15,
      points: {
        CONFIRMED: 15, // New account (< 30 days old)
        SUSPECTED: 5,  // Young account (30–89 days old, 1:3 ratio)
        CLEAR: 0,      // Mature account (>= 90 days old)
        UNKNOWN: 0,    // Account registration date unavailable
      },
    },
    REPEATED_CLAIMS: {
      id: 'repeated_claims',
      label: 'Repeated Claims',
      maxPoints: 25,
      points: {
        CONFIRMED: 25, // >= 3 damage/not-received claims in 180 days
        SUSPECTED: 10, // 2 claims in 180 days (1:2.5 ratio)
        CLEAR: 0,      // 0–1 claims
        UNKNOWN: 0,    // Claims data unavailable
      },
    },
    CONFIRMED_FRAUD_HISTORY: {
      id: 'confirmed_fraud_history',
      label: 'Confirmed Fraud History',
      maxPoints: 50, // Largest weight factor
      points: {
        CONFIRMED: 50, // Confirmed prior fraud incident on record
        SUSPECTED: 25, // Unresolved fraud inquiry (1:2 ratio)
        CLEAR: 0,      // Checked and clean
        UNKNOWN: 0,    // History unavailable
      },
    },
    REUSED_IMAGE: {
      id: 'reused_image',
      label: 'Reused Image',
      maxPoints: 30,
      points: {
        CONFIRMED: 30, // Exact hash match from another complaint/account
        SUSPECTED: 15, // Stock, screenshot, or edited image (1:2 ratio)
        CLEAR: 0,      // Photo verified unique
        UNKNOWN: 0,    // No photo submitted or analysis unavailable
      },
    },
    ORDER_PAYMENT_MISMATCH: {
      id: 'order_payment_mismatch',
      label: 'Order / Payment Mismatch',
      maxPoints: 15,
      points: {
        CONFIRMED: 15, // Payment customer or amount tampering detected
        SUSPECTED: 5,  // Unreconciled payment discrepancy (1:3 ratio)
        CLEAR: 0,      // All orders and payments consistent
        UNKNOWN: 0,    // Order/payment records unavailable
      },
    },
    SUSPICIOUS_PATTERNS: {
      id: 'suspicious_patterns',
      label: 'Suspicious Activity Patterns',
      maxPoints: 20,
      points: {
        CONFIRMED: 20, // >= 2 flagged security events (anomalous IP, device)
        SUSPECTED: 10, // 1 flagged security event (1:2 ratio)
        CLEAR: 0,      // 0 flagged security events
        UNKNOWN: 0,    // Security logs unavailable
      },
    },
  },
};

const daysAgo = (iso) => {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (Date.now() - t) / RISK_CONSTANTS.DAY_MS;
};

/**
 * Axis 3: Evidence Authenticity (derived from existing photo pipeline output)
 * verified | uncertain | suspected_manipulated | not_applicable
 */
function determineAuthenticity(photo) {
  if (!photo || !photo.provided || photo.provided === 0) {
    return 'not_applicable';
  }

  // Exact hash reuse is suspected manipulation
  if (photo.reuse && photo.reuse.detected) {
    return 'suspected_manipulated';
  }

  // Vision claims analysis
  if (photo.vision) {
    const v = photo.vision;
    if (v.looksLikeStockOrScreenshot || v.looksEditedOrAiGenerated) {
      return 'suspected_manipulated';
    }
    if (v.productMatchesOrder === 'no') {
      return 'suspected_manipulated';
    }
    if (
      v.productMatchesOrder === 'yes' &&
      v.damageVisible &&
      v.damageConsistentWithComplaint === 'yes' &&
      v.confidence >= 80
    ) {
      return 'verified';
    }
    // Partial, unclear, or low confidence
    return 'uncertain';
  }

  // Photo was provided but analysis is inconclusive or not run
  return 'uncertain';
}

/**
 * Compute the Risk Factor Model across the 6 candidate factors.
 * Accepts either customerId (queries DB) or direct fixture object { customer, orders, refunds, tickets, securityEvents, photo }.
 */
function computeRisk(target, context = {}) {
  let customer = null;
  let orders = null;
  let refunds = null;
  let tickets = null;
  let securityEvents = null;
  let photo = context.photo || null;
  let isDbQuery = false;

  if (typeof target === 'object' && target !== null) {
    // Direct fixture object invocation (deterministic, no DB)
    customer = target.customer || null;
    orders = target.orders !== undefined ? target.orders : null;
    refunds = target.refunds !== undefined ? target.refunds : null;
    tickets = target.tickets !== undefined ? target.tickets : null;
    securityEvents = target.securityEvents !== undefined ? target.securityEvents : null;
    if (target.photo !== undefined) photo = target.photo;
  } else if (typeof target === 'string') {
    isDbQuery = true;
    const customerId = target;
    try {
      customer = db.prepare('SELECT * FROM customers WHERE id=?').get(customerId) || null;
      if (customer) {
        orders = db.prepare('SELECT id, customerId, amount FROM orders WHERE customerId=?').all(customerId);
        refunds = db.prepare("SELECT id, orderId, customerId, amount, reason, initiatedAt FROM refunds WHERE customerId=? AND status != 'cancelled'").all(customerId);
        tickets = db.prepare('SELECT id, customerId, category, subject, status, date FROM tickets WHERE customerId=?').all(customerId);
        securityEvents = db.prepare('SELECT id, customerId, eventType, flagged, alert FROM security_events WHERE customerId=?').all(customerId);
      }
    } catch {
      // In-memory or headless environments without full tables
      customer = null;
    }
  }

  // If customer is strictly null (e.g. customer not found in DB) and was queried as string, return null
  if (isDbQuery && !customer) {
    return null;
  }

  const factors = [];
  const reasonCodes = [];

  // --------------------------------------------------------------------------
  // FACTOR 1: Account Age
  // --------------------------------------------------------------------------
  {
    const cfg = RISK_CONSTANTS.FACTORS.ACCOUNT_AGE;
    const joined = customer ? (customer.joinedDate || customer.joinedOn) : null;
    if (!customer || !joined) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'Account creation date unavailable',
        evidenceRefs: [],
      });
    } else {
      const ageDays = daysAgo(joined);
      if (ageDays < RISK_CONSTANTS.ACCOUNT_AGE_NEW_DAYS) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'confirmed',
          points: cfg.points.CONFIRMED,
          maxPoints: cfg.maxPoints,
          detail: `New account created ${Math.floor(ageDays)} day(s) ago (< ${RISK_CONSTANTS.ACCOUNT_AGE_NEW_DAYS}d)`,
          evidenceRefs: [customer.id],
        });
        reasonCodes.push('NEW_ACCOUNT');
      } else if (ageDays < RISK_CONSTANTS.ACCOUNT_AGE_YOUNG_DAYS) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'suspected',
          points: cfg.points.SUSPECTED,
          maxPoints: cfg.maxPoints,
          detail: `Young account created ${Math.floor(ageDays)} day(s) ago (< ${RISK_CONSTANTS.ACCOUNT_AGE_YOUNG_DAYS}d)`,
          evidenceRefs: [customer.id],
        });
        reasonCodes.push('YOUNG_ACCOUNT');
      } else {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'clear',
          points: cfg.points.CLEAR,
          maxPoints: cfg.maxPoints,
          detail: `Established account (${Math.floor(ageDays)} days old)`,
          evidenceRefs: [customer.id],
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // FACTOR 2: Repeated Claims
  // Evaluated ONLY from tickets/claims within 180 days (no double-counting refunds)
  // --------------------------------------------------------------------------
  {
    const cfg = RISK_CONSTANTS.FACTORS.REPEATED_CLAIMS;
    if (tickets === null || tickets === undefined) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'Ticket and claim history unavailable',
        evidenceRefs: [],
      });
    } else {
      const claimTickets = tickets.filter(
        (t) =>
          daysAgo(t.date) <= RISK_CONSTANTS.CLAIMS_WINDOW_DAYS &&
          (t.category === 'product' || RISK_CONSTANTS.CLAIM_SUBJECT.test(t.subject || ''))
      );
      const refs = claimTickets.map((t) => t.id);
      if (claimTickets.length >= 3) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'confirmed',
          points: cfg.points.CONFIRMED,
          maxPoints: cfg.maxPoints,
          detail: `${claimTickets.length} product/damage claims in last ${RISK_CONSTANTS.CLAIMS_WINDOW_DAYS} days`,
          evidenceRefs: refs,
        });
        reasonCodes.push('REPEATED_CLAIMS_HIGH');
      } else if (claimTickets.length === 2) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'suspected',
          points: cfg.points.SUSPECTED,
          maxPoints: cfg.maxPoints,
          detail: `2 product/damage claims in last ${RISK_CONSTANTS.CLAIMS_WINDOW_DAYS} days`,
          evidenceRefs: refs,
        });
        reasonCodes.push('REPEATED_CLAIMS_ELEVATED');
      } else {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'clear',
          points: cfg.points.CLEAR,
          maxPoints: cfg.maxPoints,
          detail: `${claimTickets.length} claim(s) in last ${RISK_CONSTANTS.CLAIMS_WINDOW_DAYS} days (normal history)`,
          evidenceRefs: refs,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // FACTOR 3: Confirmed Fraud History
  // Evaluates explicit confirmed fraud records or inquiries (largest weight)
  // --------------------------------------------------------------------------
  {
    const cfg = RISK_CONSTANTS.FACTORS.CONFIRMED_FRAUD_HISTORY;
    const fraudFlag = customer ? (customer.confirmedFraudHistory ?? customer.confirmed_fraud ?? customer.confirmedFraud) : undefined;
    if (fraudFlag === true) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'confirmed',
        points: cfg.points.CONFIRMED,
        maxPoints: cfg.maxPoints,
        detail: 'Confirmed prior fraud incident on customer profile',
        evidenceRefs: [customer.id],
      });
      reasonCodes.push('CONFIRMED_FRAUD_RECORD');
    } else if (fraudFlag === 'suspected') {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'suspected',
        points: cfg.points.SUSPECTED,
        maxPoints: cfg.maxPoints,
        detail: 'Unresolved fraud investigation flag on record',
        evidenceRefs: [customer.id],
      });
      reasonCodes.push('SUSPECTED_FRAUD_RECORD');
    } else if (fraudFlag === false || customer) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'clear',
        points: cfg.points.CLEAR,
        maxPoints: cfg.maxPoints,
        detail: 'No confirmed fraud records on customer file',
        evidenceRefs: customer ? [customer.id] : [],
      });
    } else {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'Customer fraud history records unavailable',
        evidenceRefs: [],
      });
    }
  }

  // --------------------------------------------------------------------------
  // FACTOR 4: Reused Image (Hash match)
  // Counted ONLY here (not double counted anywhere else)
  // --------------------------------------------------------------------------
  {
    const cfg = RISK_CONSTANTS.FACTORS.REUSED_IMAGE;
    if (!photo || !photo.provided || photo.provided === 0) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'No photo evidence submitted for this complaint',
        evidenceRefs: [],
      });
    } else if (photo.reuse && photo.reuse.detected) {
      const hashes = (photo.hashes || []).filter((h) => h.reused).map((h) => h.hash);
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'confirmed',
        points: cfg.points.CONFIRMED,
        maxPoints: cfg.maxPoints,
        detail: `Exact image hash match detected (${photo.reuse.detail || 'previously submitted image'})`,
        evidenceRefs: hashes.length ? hashes : ['hash_match'],
      });
      reasonCodes.push('IMAGE_REUSE_CONFIRMED');
    } else if (photo.vision && (photo.vision.looksLikeStockOrScreenshot || photo.vision.looksEditedOrAiGenerated)) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'suspected',
        points: cfg.points.SUSPECTED,
        maxPoints: cfg.maxPoints,
        detail: 'Photo flagged as stock image, screenshot, or edited media',
        evidenceRefs: [],
      });
      reasonCodes.push('IMAGE_MANIPULATION_SUSPECTED');
    } else if (photo.analyzed || (photo.hashes && photo.hashes.length > 0)) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'clear',
        points: cfg.points.CLEAR,
        maxPoints: cfg.maxPoints,
        detail: 'Submitted image verified as unique (no hash collision)',
        evidenceRefs: (photo.hashes || []).map((h) => h.hash),
      });
    } else {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'Photo hash analysis could not be completed',
        evidenceRefs: [],
      });
    }
  }

  // --------------------------------------------------------------------------
  // FACTOR 5: Order / Payment Mismatch
  // --------------------------------------------------------------------------
  {
    const cfg = RISK_CONSTANTS.FACTORS.ORDER_PAYMENT_MISMATCH;
    if (orders === null || orders === undefined) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'Order transaction records unavailable',
        evidenceRefs: [],
      });
    } else {
      const mismatchedOrders = orders.filter((o) => o.mismatch || o.orderPaymentMismatch);
      if (mismatchedOrders.length > 0) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'confirmed',
          points: cfg.points.CONFIRMED,
          maxPoints: cfg.maxPoints,
          detail: 'Payment amount or account mismatch detected on orders',
          evidenceRefs: mismatchedOrders.map((o) => o.id),
        });
        reasonCodes.push('PAYMENT_TAMPERING_MISMATCH');
      } else {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'clear',
          points: cfg.points.CLEAR,
          maxPoints: cfg.maxPoints,
          detail: 'All customer orders and payment balances match consistently',
          evidenceRefs: orders.map((o) => o.id),
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // FACTOR 6: Suspicious Patterns (Flagged Security Events)
  // --------------------------------------------------------------------------
  {
    const cfg = RISK_CONSTANTS.FACTORS.SUSPICIOUS_PATTERNS;
    if (securityEvents === null || securityEvents === undefined) {
      factors.push({
        id: cfg.id,
        label: cfg.label,
        state: 'unknown',
        points: cfg.points.UNKNOWN,
        maxPoints: cfg.maxPoints,
        detail: 'Security event logs unavailable',
        evidenceRefs: [],
      });
    } else {
      const flagged = securityEvents.filter((s) => s.flagged === 1 || s.flagged === true);
      const refs = flagged.map((s) => s.id);
      if (flagged.length >= 2) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'confirmed',
          points: cfg.points.CONFIRMED,
          maxPoints: cfg.maxPoints,
          detail: `${flagged.length} anomalous security events logged (foreign IP / unrecognized device)`,
          evidenceRefs: refs,
        });
        reasonCodes.push('SUSPICIOUS_SECURITY_EVENTS_HIGH');
      } else if (flagged.length === 1) {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'suspected',
          points: cfg.points.SUSPECTED,
          maxPoints: cfg.maxPoints,
          detail: `1 anomalous security event logged (${flagged[0].alert || flagged[0].eventType})`,
          evidenceRefs: refs,
        });
        reasonCodes.push('SUSPICIOUS_SECURITY_EVENT_ELEVATED');
      } else {
        factors.push({
          id: cfg.id,
          label: cfg.label,
          state: 'clear',
          points: cfg.points.CLEAR,
          maxPoints: cfg.maxPoints,
          detail: 'No anomalous security events detected',
          evidenceRefs: [],
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // DATA SUFFICIENCY & SCORE CALCULATION
  // --------------------------------------------------------------------------
  const evaluableFactors = factors.filter((f) => f.state !== 'unknown');
  const coverage = `${evaluableFactors.length} of ${factors.length} factors evaluable`;

  let status = 'scored';
  let score = null;
  let rawTotal = null;
  let cappedTotal = null;
  let level = 'low';

  if (evaluableFactors.length === 0) {
    status = 'insufficient_data';
    score = null;
    rawTotal = null;
    cappedTotal = null;
    level = 'unknown';
  } else {
    status = evaluableFactors.length === factors.length ? 'scored' : 'partial';
    rawTotal = factors.reduce((sum, f) => sum + f.points, 0);
    cappedTotal = Math.max(0, Math.min(RISK_CONSTANTS.MAX_SCORE, rawTotal));
    score = cappedTotal;
    level = score >= RISK_CONSTANTS.HIGH_THRESHOLD ? 'high' : score >= RISK_CONSTANTS.MEDIUM_THRESHOLD ? 'medium' : 'low';
  }

  // Legacy signal mapping for backward compatibility
  const legacySignals = factors
    .filter((f) => f.points > 0)
    .map((f) => ({
      name: f.id,
      points: f.points,
      detail: f.detail,
    }));

  return {
    customerId: customer ? customer.id : (typeof target === 'string' ? target : null),
    score,
    status,
    level,
    threshold: RISK_CONSTANTS.HIGH_THRESHOLD,
    mediumThreshold: RISK_CONSTANTS.MEDIUM_THRESHOLD,
    highThreshold: RISK_CONSTANTS.HIGH_THRESHOLD, // Backward-compat alias
    rawTotal,
    cappedTotal,
    total: rawTotal,
    coverage,
    factors,
    reasonCodes,
    signals: legacySignals, // Backward-compat alias
  };
}

function listRisk() {
  try {
    return db.prepare('SELECT id, name, tier FROM customers').all()
      .map((c) => {
        const r = computeRisk(c.id);
        return { name: c.name, tier: c.tier, ...r };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  } catch {
    return [];
  }
}

module.exports = {
  RISK_CONSTANTS,
  computeRisk,
  listRisk,
  determineAuthenticity,
};
