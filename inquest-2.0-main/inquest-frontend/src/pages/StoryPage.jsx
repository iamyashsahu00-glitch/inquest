import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  Scale,
  Sparkles,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  Cpu,
  Share2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Zap,
  ShoppingBag,
  Ticket,
  BookOpen,
  Search,
  ScanLine,
  Lock,
  Download,
  Check,
  RotateCcw,
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  CornerDownRight,
  Camera,
  ShieldAlert,
  Sliders,
  Eye,
  RefreshCw,
  Layers,
  HelpCircle as QuestionIcon,
  Info,
  Clock,
  Send,
  Upload,
  CheckCircle,
  Server,
  Database,
  Fingerprint,
} from 'lucide-react';
import InvestigationBackground from '../components/InvestigationBackground';

// ── Sample Complaints for Step 1 ──────────────────────────────────────────────
const SAMPLE_COMPLAINTS = {
  hinglish: {
    label: 'Hinglish (Colloquial)',
    tag: 'Real User Sample',
    text: 'bhai payment 2 baar kat gyi order #456 ke liye, please refund karo urgently',
    customer: 'Ravi Sharma',
    customerId: 'CUST001',
    orderId: 'ORDER456',
    sentimentDetected: 'frustrated / urgent',
  },
  english: {
    label: 'English (Formal)',
    tag: 'Direct Ticket',
    text: 'I was charged twice on my card for order #456. One transaction failed on screen but amount was debited.',
    customer: 'Priya Mehta',
    customerId: 'CUST002',
    orderId: 'ORDER456',
    sentimentDetected: 'neutral / assertive',
  },
  hindi: {
    label: 'Hindi (Devanagari)',
    tag: 'Regional Language',
    text: 'ऑर्डर #456 के लिए मेरे खाते से दो बार पैसे कट गए हैं, कृपया तुरंत रिफंड करें',
    customer: 'Amit Patel',
    customerId: 'CUST003',
    orderId: 'ORDER456',
    sentimentDetected: 'distressed / polite',
  },
};

// ── Evidence Nodes for Step 3 ────────────────────────────────────────────────
const EVIDENCE_NODES = [
  {
    id: 'complaint',
    title: 'Customer Intake Complaint',
    type: 'Intake Payload',
    icon: FileText,
    status: 'Captured',
    color: 'teal',
    badge: 'Raw Text',
    summary: 'bhai payment 2 baar kat gyi order #456 ke liye, please refund karo urgently',
    details: {
      channel: 'Customer Live Chat Widget',
      timestamp: '14:22:10 IST',
      rawLength: '74 characters',
      codeSwitching: 'Hindi-English hybrid (Hinglish)',
      customerIsolationId: 'CUST001 (Verified Session)',
    },
  },
  {
    id: 'gateway',
    title: 'Payment Gateway Telemetry',
    type: 'Razorpay / Stripe API',
    icon: CreditCard,
    status: 'Discrepancy Flagged',
    color: 'amber',
    badge: 'Dual Capture Flag',
    summary: 'tx_9921: CAPTURED (₹2,499) vs tx_9920: CAPTURED (₹2,499) on same cart session',
    details: {
      gatewayStatus: 'Captured & Settled',
      localDBStatus: 'Local Webhook Timeout (408)',
      gatewayTxId: 'pay_rzp_9921b7a',
      amountDiscrepancy: '₹2,499 duplicate charge detected',
      bankRef: 'HDFC_NET_902194',
    },
  },
  {
    id: 'order',
    title: 'Internal Order Ledger',
    type: 'PostgreSQL Order Records',
    icon: ShoppingBag,
    status: 'Verified',
    color: 'verified',
    badge: 'DB Matched',
    summary: 'ORDER456 placed at 14:20:02 IST. Product: Noise Pulse Pro Smartwatch (₹2,499)',
    details: {
      orderId: 'ORDER456',
      customerId: 'CUST001 (Matches Token)',
      item: 'Noise Pulse Pro Smartwatch',
      fulfillmentStatus: 'DELIVERED',
      deliveryProof: 'Delivered 12 Oct, 11:30 AM via BlueDart (AWB #8892110)',
    },
  },
  {
    id: 'policy',
    title: 'Institutional SLA Policy',
    type: 'Rule Engine POL-PAY-01',
    icon: BookOpen,
    status: 'Policy Applicable',
    color: 'teal',
    badge: 'Automated Rule',
    summary: 'Duplicate Gateway Capture SLA: Autonomous reverse-refund authorized if captured > order total',
    details: {
      policyCode: 'POL-PAY-01',
      maxAutonomousRefund: '₹10,000 INR',
      requiresPhysicalReturn: 'NO (Pure Financial Discrepancy)',
      slaTimeout: 'Instantaneous (< 2.5s)',
    },
  },
  {
    id: 'refund_vault',
    title: 'Refund Vault Audit Ledger',
    type: 'Ledger Reconciliation',
    icon: ShieldCheck,
    status: 'Clear to Disburse',
    color: 'verified',
    badge: 'Zero Prior Refund',
    summary: 'Verified that ₹0 has been refunded for this transaction so far. No double-refund risk.',
    details: {
      priorRefundsCount: '0',
      activeRefundLocks: 'None',
      ledgerId: 'LEDGER_TX_4401',
      payoutGateway: 'Instant UPI / Source Card Reversal',
    },
  },
];

// ── Vision Forensics Scenarios for Step 5 ────────────────────────────────────
const VISION_SCENARIOS = {
  genuine: {
    id: 'genuine',
    title: 'Scenario A: Genuine Damage Proof',
    badge: 'Verified Genuine',
    color: 'verified',
    image: '/damaged-smartwatch.jpg',
    dHash: 'c4e0f070b4f0e0c0',
    matchStatus: 'Order Product Matched (Smartwatch)',
    damageAnalysis: 'Visible glass impact fracture and spiderweb screen crack across the display. Matches customer complaint of transit damage.',
    authenticity: 'VERIFIED (96% Gemini Vision Confidence)',
    reusedCheck: 'Passed — Unique image hash across entire repository',
    verdict: 'Safe for Replacement or Guided Warranty',
  },
  reused: {
    id: 'reused',
    title: 'Scenario B: Cross-Account Reused Image (Fraud)',
    badge: 'Perceptual Hash Collision',
    color: 'alert',
    image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=600&q=80',
    dHash: 'a1b2c3d4e5f60718',
    matchStatus: 'Visual Match with Past Claim #TICK-1092',
    damageAnalysis: 'Identical pixel gradient & fracture pattern matched to prior claim submitted by another customer (CUST992)',
    authenticity: 'REUSED_IMAGE_DETECTED (Hash Collision: 99.8%)',
    reusedCheck: 'COLLISION DETECTED with CUST992 / Ticket #TICK-1092 on 14 Aug 2026',
    verdict: 'MANDATORY ESCALATION — Flagged for Organized Return Fraud',
  },
  manipulated: {
    id: 'manipulated',
    title: 'Scenario C: Stock Photo / AI Generated',
    badge: 'Suspected Manipulation',
    color: 'amber',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    dHash: 'f0f0f00f0f0f0f0f',
    matchStatus: 'Product Type Matches Order Spec',
    damageAnalysis: 'Stock photo lighting with artificial blur overlay. Metadata lacks device camera EXIF header.',
    authenticity: 'SUSPECTED_MANIPULATED (Synthetic Artefacts Found)',
    reusedCheck: 'Found in Google Image Index / Catalog Stock',
    verdict: 'NEEDS_INFO or Human Agent Forensic Inspection',
  },
};

// ── 4-Way Decision Matrix for Step 6 ─────────────────────────────────────────
const DECISION_PATHS = [
  {
    id: 'AUTO_RESOLVE',
    title: 'AUTO_RESOLVE',
    badge: 'Autonomous Action (< 2.5s)',
    color: 'verified',
    border: 'border-verified',
    bg: 'bg-verified-dim',
    text: 'text-verified',
    icon: CheckCircle2,
    rule: 'High Confidence (≥85%) + Matching Institutional Policy + Zero Fraud Flags + Safe Category',
    example: 'Verified duplicate charge on Razorpay gateway (PAY123 captured, local DB timed out). Refund initiated in 1.4s with 0 human intervention.',
    resolution: 'Refund TXN_RF9921 initiated automatically. Customer notified instantly via WhatsApp & SMS.',
    gatingChecks: ['Identity Verified', 'Order DB Ownership 100%', 'Gateway Capture Confirmed', 'Zero Reused Photos'],
  },
  {
    id: 'CUSTOMER_CONFIRM',
    title: 'CUSTOMER_CONFIRM',
    badge: 'Customer Choice Election',
    color: 'teal',
    border: 'border-[#2F6F68]',
    bg: 'bg-[#2F6F68]/10',
    text: 'text-[#2F6F68]',
    icon: Scale,
    rule: 'Moderate Confidence (70–84%) OR Category with multiple customer resolution remedies',
    example: 'Return initiated for clothing size mismatch. Policy allows replacement OR store wallet credit with 10% bonus.',
    resolution: 'One-click interactive poll sent to customer in live chat widget before scheduling courier pickup.',
    gatingChecks: ['Policy permits Choice', 'Customer Verification Valid', 'Customer Choice Pending'],
  },
  {
    id: 'NEEDS_INFO',
    title: 'NEEDS_INFO',
    badge: 'Conversational Triage',
    color: 'amber',
    border: 'border-amber',
    bg: 'bg-amber-dim',
    text: 'text-amber',
    icon: QuestionIcon,
    rule: 'Ambiguous details, missing unboxing photo, or blurred evidence requiring clarification',
    example: 'Customer claims box was torn on delivery, but uploaded an out-of-focus photo where serial number is unreadable.',
    resolution: 'Autonomous follow-up message prompts customer for clear rear barcode photo before finalizing verdict.',
    gatingChecks: ['Uncertain Authenticity', 'Missing Barcode / IMEI', 'Clarification Request Dispatched'],
  },
  {
    id: 'HUMAN_ESCALATION',
    title: 'HUMAN_ESCALATION',
    badge: 'Privileged Supervisor Review',
    color: 'alert',
    border: 'border-alert',
    bg: 'bg-alert-dim',
    text: 'text-alert',
    icon: UserCheck,
    rule: 'Security/Account takeover claims, missing policies, isolation failure, or image reuse collision',
    example: 'Customer claims package arrived opened with gold jewelry missing, but courier weight scan matches dispatch.',
    resolution: 'Dispatched to Fraud Investigation Queue. Requires biometric & institutional ID-verified supervisor authorization.',
    gatingChecks: ['Tamper / Reuse Collision', 'Security Intent (POLICY9)', 'Isolation Mismatch', 'Requires ID Scan'],
  },
];

export default function StoryPage({ onNavigateHome }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Navigation sticky tabs
  const [activeStageNav, setActiveStageNav] = useState('stage-01');

  // Step 1: Typing state
  const [activeLang, setActiveLang] = useState('hinglish');
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Step 3: Selected Evidence Node
  const [selectedNode, setSelectedNode] = useState(EVIDENCE_NODES[1]); // Default to gateway mismatch

  // Step 5: Vision Forensics Active Scenario
  const [activeVisionScenario, setActiveVisionScenario] = useState('genuine');

  // Step 6: Active decision tab
  const [activeDecision, setActiveDecision] = useState('AUTO_RESOLVE');

  // Step 7: Customer Chat Widget Simulator
  const [chatStep, setChatStep] = useState(2); // 0: submitted, 1: gathering, 2: resolved

  // Step 8: Admin verification simulation
  const [scanState, setScanState] = useState('idle'); // idle | scanning | verified

  // Typing animation effect for Step 1
  useEffect(() => {
    setTypedText('');
    setIsTyping(true);
    const fullText = SAMPLE_COMPLAINTS[activeLang].text;
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [activeLang]);

  // Handle simulate scan in Step 8
  function handleSimulateScan() {
    setScanState('scanning');
    setTimeout(() => {
      setScanState('verified');
    }, 2000);
  }

  function handleResetScan() {
    setScanState('idle');
  }

  // Quick jump helper
  function scrollToSection(id) {
    setActiveStageNav(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#142123] selection:bg-amber/30 transition-colors duration-200 overflow-x-hidden font-sans relative">
      {/* Full-page AI-Investigation-Themed Ambient Background */}
      <InvestigationBackground fixed />

      {/* ── Scroll Progress Bar ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-amber z-50 origin-left"
        style={{ scaleX }}
      />

      {/* ── Top Navigation Bar ── */}
      <header
        className="sticky top-0 z-40 border-b border-[#E2E8E4] backdrop-blur-md transition-colors"
        style={{ background: 'rgba(250, 248, 245, 0.94)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-3.5 group cursor-pointer text-left"
            title="Return to INQUEST Live App"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FAF0E4] border border-[#C58B4B]/40 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden p-1.5">
              <img src="/favicon.png" alt="INQUEST Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#142123]">
                INQUEST
              </span>
              <span className="text-[#C2C9C3] text-base select-none">/</span>
              <span className="text-xs sm:text-sm text-[#475C59] font-semibold flex items-center gap-1.5">
                Architecture Explainer
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-verified animate-pulse" />
              </span>
            </div>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-[#203436] hover:bg-[#162527] text-white font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm active:scale-[0.98]"
            >
              <span>Launch Live App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Sticky Stage Navigation Bar ── */}
        <div className="border-t border-[#EAEFEA] bg-[#FAF8F5]/90 overflow-x-auto scrollbar-none py-2 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
            {[
              { id: 'stage-01', label: '01 Intake & NLP' },
              { id: 'stage-02', label: '02 Gemini Extraction' },
              { id: 'stage-03', label: '03 Evidence Graph' },
              { id: 'stage-04', label: '04 Root Cause' },
              { id: 'stage-05', label: '05 Vision Forensics' },
              { id: 'stage-06', label: '06 4-Way Decision Matrix' },
              { id: 'stage-07', label: '07 Customer Live Chat' },
              { id: 'stage-08', label: '08 ID Handoff Dossier' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeStageNav === tab.id
                    ? 'bg-[#2F6F68] text-white shadow-xs font-bold'
                    : 'text-[#475C59] hover:text-[#142123] hover:bg-[#EAEFEA]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative border-b border-[#E2E8E4] py-16 sm:py-24 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/2 right-10 w-72 h-72 bg-verified/10 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider mb-6 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber animate-spin-slow" />
            <span>INQUEST 2.0 • Autonomous Evidence & Investigation System</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl text-paper font-bold tracking-tight leading-[1.12] mb-6 max-w-4xl mx-auto"
          >
            Every customer complaint investigated with connected evidence{' '}
            <span className="text-amber">before a verdict.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-paper-dim max-w-3xl mx-auto leading-relaxed mb-10"
          >
            Most customer support bots guess based on customer emotion or stall with canned scripts.
            <strong className="text-paper"> INQUEST</strong> parses messy Hinglish text, cross-references
            payment gateways & warehouse scans, audits image authenticity via perceptual hashing,
            and checks multi-system institutional records to reach instantaneous, fraud-proof resolution.
          </motion.p>

          {/* Quick Metrics Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto mb-10"
          >
            <div className="p-3.5 rounded-xl bg-ink-light border border-border shadow-xs text-left">
              <div className="flex items-center gap-2 text-verified mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Proof First</span>
              </div>
              <p className="text-sm font-bold text-paper">100% Evidence-Driven</p>
              <p className="text-[11px] text-muted">0% Sentiment Influence</p>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-light border border-border shadow-xs text-left">
              <div className="flex items-center gap-2 text-amber mb-1">
                <Scale className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Decisions</span>
              </div>
              <p className="text-sm font-bold text-paper">4-Way Matrix</p>
              <p className="text-[11px] text-muted">Deterministic Outcomes</p>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-light border border-border shadow-xs text-left">
              <div className="flex items-center gap-2 text-info mb-1">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Vision</span>
              </div>
              <p className="text-sm font-bold text-paper">dHash Perceptual</p>
              <p className="text-[11px] text-muted">Detects Photo Reuse</p>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-light border border-border shadow-xs text-left">
              <div className="flex items-center gap-2 text-[#2F6F68] mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Speed</span>
              </div>
              <p className="text-sm font-bold text-paper">&lt; 2.5s Latency</p>
              <p className="text-[11px] text-muted">Autonomous Auto-Resolve</p>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted font-semibold">
            <span>Explore the end-to-end autonomous architecture below</span>
            <ChevronDown className="w-4 h-4 text-amber animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── STEP 1: Complaint Intake ── */}
      <section id="stage-01" className="py-20 sm:py-28 border-b border-border relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left description */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider">
                Step 01
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-paper">
                Multilingual & Colloquial Intake
              </h2>
              <p className="text-paper-dim text-sm sm:text-base leading-relaxed">
                Customers don't talk in dropdown menus. They speak naturally in Hindi, English, and code-switching slang like{' '}
                <span className="font-mono text-amber">"bhai payment 2 baar kat gyi"</span>.
              </p>
              <p className="text-muted text-xs sm:text-sm leading-relaxed">
                INQUEST ingests unstructured conversational text from chat widgets, WhatsApp, or email, preserving the original customer voice without forcing them through tedious IVR or dropdown trees.
              </p>

              {/* Language selection pills */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                  Try Sample Input Dialects:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SAMPLE_COMPLAINTS).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveLang(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        activeLang === key
                          ? 'bg-amber text-ink shadow-xs font-bold'
                          : 'bg-ink-light hover:bg-ink-lighter text-paper-dim border border-border'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right Mock UI */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              <div className="rounded-2xl border border-border bg-ink-light shadow-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border bg-ink-lighter flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-alert/80" />
                    <span className="w-3 h-3 rounded-full bg-amber/80" />
                    <span className="w-3 h-3 rounded-full bg-verified/80" />
                    <span className="text-muted font-mono ml-2">intake://session-8842</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-verified-dim text-verified font-bold text-[11px] border border-verified/30">
                    Active Intake Channel
                  </span>
                </div>

                <div className="p-5 border-b border-border bg-ink-inset flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center font-bold text-amber">
                      {SAMPLE_COMPLAINTS[activeLang].customer.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-paper">
                        {SAMPLE_COMPLAINTS[activeLang].customer}
                      </h4>
                      <p className="text-xs text-muted font-mono">
                        Customer ID: {SAMPLE_COMPLAINTS[activeLang].customerId} • Active Order: #
                        {SAMPLE_COMPLAINTS[activeLang].orderId.replace('ORDER', '')}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted font-medium bg-ink-light px-2.5 py-1 rounded-md border border-border">
                    {SAMPLE_COMPLAINTS[activeLang].tag}
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <label className="block text-xs font-semibold text-paper-dim">
                    Raw Customer Input Stream:
                  </label>
                  <div className="min-h-24 p-4 rounded-xl bg-ink-inset border border-border-strong font-mono text-sm sm:text-base text-paper leading-relaxed relative">
                    <span>{typedText}</span>
                    <span
                      className={`inline-block w-2 h-4 bg-amber ml-1 align-middle ${
                        isTyping ? 'animate-pulse' : 'opacity-0'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <MessageSquare className="w-3.5 h-3.5 text-amber" />
                      <span>Transcribing audio & text streams live</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber text-ink text-xs font-bold shadow-xs">
                      <span>Synthesizing Entities</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STEP 2: Semantic Understanding (Gemini) ── */}
      <section id="stage-02" className="py-20 sm:py-28 border-b border-[#E2E8E4] relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider mb-4"
            >
              Step 02
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-paper mb-4"
            >
              Semantic Entity & Intent Extraction
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-paper-dim text-sm sm:text-base leading-relaxed"
            >
              Gemini 2.0 parses the messy dialect, isolating entities, domain intent, and urgency metrics — while strictly isolating customer tone from the legal outcome.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Primary Intent Card */}
            <div className="p-5 rounded-2xl bg-ink-light border border-border-strong hover:border-amber/40 transition-all shadow-md relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Primary Intent
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-verified-dim text-verified border border-verified/30">
                  99.4% Match
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-dim border border-amber/30 flex items-center justify-center text-amber">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-paper">payment/billing</h3>
                  <p className="text-xs text-muted">Financial transaction category</p>
                </div>
              </div>
              <p className="text-xs text-paper-dim mt-3 pt-3 border-t border-border">
                Mapped from: <span className="font-mono text-amber">"payment 2 baar kat gyi"</span>
              </p>
            </div>

            {/* Sub-Intent Card */}
            <div className="p-5 rounded-2xl bg-ink-light border border-border-strong hover:border-amber/40 transition-all shadow-md relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Sub-Intent
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-verified-dim text-verified border border-verified/30">
                  Exact Match
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-dim border border-amber/30 flex items-center justify-center text-amber">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-paper font-mono">duplicate_payment</h3>
                  <p className="text-xs text-muted">Double charge pattern</p>
                </div>
              </div>
              <p className="text-xs text-paper-dim mt-3 pt-3 border-t border-border">
                Extracted: Multi-capture attempt on single cart checkout
              </p>
            </div>

            {/* Referenced Order ID */}
            <div className="p-5 rounded-2xl bg-ink-light border border-border-strong hover:border-amber/40 transition-all shadow-md relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Entity Extraction
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-info-dim text-info border border-info/30">
                  DB Linked
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-info-dim border border-info/30 flex items-center justify-center text-info">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-paper font-mono">ORDER456</h3>
                  <p className="text-xs text-muted">Normalized from "order #456"</p>
                </div>
              </div>
              <p className="text-xs text-paper-dim mt-3 pt-3 border-t border-border">
                Bound directly to verified Customer <span className="font-mono text-paper font-semibold">CUST001</span> session
              </p>
            </div>

            {/* Urgency Score */}
            <div className="p-5 rounded-2xl bg-ink-light border border-border-strong hover:border-amber/40 transition-all shadow-md relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Urgency Metric
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-dim text-amber border border-amber/30">
                  Priority High
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-dim border border-amber/30 flex items-center justify-center text-amber">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-paper">HIGH (Urgent)</h3>
                  <p className="text-xs text-muted">Customer indicated "urgently"</p>
                </div>
              </div>
              <p className="text-xs text-paper-dim mt-3 pt-3 border-t border-border">
                Target autonomous turnaround: &lt; 2.5 seconds
              </p>
            </div>

            {/* Sentiment (Explicitly not used for verdict) */}
            <div className="p-5 rounded-2xl bg-ink-light border border-border-strong hover:border-amber/40 transition-all shadow-md relative group md:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Customer Sentiment Analysis
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-alert-dim text-alert border border-alert/30">
                  frustrated / negative
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-alert-dim border border-alert/30 flex items-center justify-center text-alert shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-paper">Customer Tone: Frustrated / Distressed</h3>
                    <p className="text-xs text-muted">
                      Sentiment is recorded solely to adjust conversational empathy.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-ink-inset border border-amber/30 text-amber text-xs font-bold shrink-0">
                  ⚠️ 0% VERDICT WEIGHT
                </div>
              </div>
              <p className="text-xs text-muted mt-3 pt-3 border-t border-border leading-relaxed">
                <strong className="text-paper-dim">Fair-Play Architecture Guarantee:</strong> INQUEST completely decouples customer emotion from financial resolution. An aggressive complaint with zero evidence is never refunded, and a calm complaint with valid evidence is resolved immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP 3: Evidence Investigation ── */}
      <section id="stage-03" className="py-20 sm:py-28 border-b border-border relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider">
                Step 03
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-paper">
                Connected Evidence Graph
              </h2>
              <p className="text-paper-dim text-sm sm:text-base leading-relaxed">
                Rather than hallucinating an answer, INQUEST cross-audits 5 independent enterprise data stores simultaneously:
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-muted">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-verified" />
                  <span><strong>Payment Gateway Logs:</strong> Razorpay / Stripe capture confirmation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber" />
                  <span><strong>Local Order Ledger:</strong> Internal order state & webhook timeout history</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info" />
                  <span><strong>Logistics POD Scans:</strong> Carrier weight scans & physical signature</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2F6F68]" />
                  <span><strong>Institutional Policies:</strong> Corporate refund SLAs & product caps</span>
                </li>
              </ul>
              <div className="p-3.5 rounded-xl bg-ink-light border border-border text-xs text-paper-dim">
                <span className="font-bold text-amber">Interactive Tip:</span> Click any node on the right to inspect its live simulated JSON telemetry!
              </div>
            </motion.div>

            {/* Interactive Node Selector */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-4 min-w-0"
            >
              <div className="rounded-2xl border border-border bg-ink-light p-5 shadow-xl space-y-4 overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber" />
                    <span className="text-xs font-bold text-paper uppercase tracking-wider">
                      Interactive Evidence Graph Nodes
                    </span>
                  </div>
                  <span className="text-xs text-muted font-mono">5 Independent Data Stores</span>
                </div>

                {/* Node Buttons */}
                <div className="space-y-2.5">
                  {EVIDENCE_NODES.map((node) => {
                    const Icon = node.icon;
                    const isSelected = selectedNode.id === node.id;
                    const isDiscrepancy =
                      node.status.toLowerCase().includes('discrepancy') ||
                      node.status.toLowerCase().includes('flagged');

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 overflow-hidden ${
                          isSelected
                            ? 'bg-amber-dim/50 border-amber shadow-sm ring-1 ring-amber/50'
                            : 'bg-ink-inset border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              node.color === 'amber'
                                ? 'bg-amber-dim text-amber'
                                : node.color === 'verified'
                                ? 'bg-verified-dim text-verified'
                                : 'bg-info-dim text-info'
                            }`}
                          >
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-paper truncate">{node.title}</p>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-light text-muted border border-border shrink-0 hidden sm:inline-block">
                                {node.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-paper-dim truncate mt-0.5">
                              {node.summary}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ml-1 ${
                            isDiscrepancy
                              ? 'bg-amber text-ink'
                              : 'bg-verified-dim text-verified'
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Detail View of Selected Node */}
                <div className="p-4 rounded-xl bg-ink-inset border border-border-strong space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      <span>Telemetry Deep-Dive: {selectedNode.title}</span>
                    </span>
                    <span className="text-[11px] font-mono text-muted">ID: {selectedNode.id}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedNode.details).map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-ink-light border border-border flex flex-col">
                        <span className="text-[10px] text-muted font-mono uppercase">{k}</span>
                        <span className="text-paper font-semibold truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STEP 4: Root Cause + Confidence Score ── */}
      <section id="stage-04" className="py-20 sm:py-28 border-b border-[#E2E8E4] relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider mb-4"
            >
              Step 04
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-paper mb-4"
            >
              Root Cause & Confidence Synthesis
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-paper-dim text-sm sm:text-base leading-relaxed"
            >
              INQUEST synthesizes an audit-grade explanation with a mathematical confidence score based on corroborating vs contradicting records.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Confidence Meter Card */}
            <div className="lg:col-span-4 p-8 rounded-2xl bg-ink-light border border-border shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-36 h-36 rounded-full border-8 border-ink-lighter border-t-verified border-r-verified flex flex-col items-center justify-center relative mb-4 shadow-inner">
                <span className="text-4xl font-display font-extrabold text-verified">94%</span>
                <span className="text-[11px] text-muted font-bold tracking-wider">CONFIDENCE</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-verified-dim text-verified border border-verified/30 mb-2">
                Passed Auto-Resolve Gate (≥85%)
              </span>
              <p className="text-xs text-muted max-w-xs">
                Derived from 3 congruent database records, 0 contradictions, and exact payment hash match.
              </p>
            </div>

            {/* Synthesized Explanation Box */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-ink-light border border-border shadow-lg flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber uppercase tracking-wider mb-2">
                  <Search className="w-4 h-4" />
                  <span>Synthesized Institutional Finding</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-bold text-paper leading-snug mb-3">
                  "Payment PAY123 succeeded at Razorpay gateway but timed out locally, causing customer re-attempt and duplicate charge — 94% confidence."
                </h3>
                <p className="text-paper-dim text-xs sm:text-sm leading-relaxed">
                  Razorpay webhook encountered HTTP 408 timeout at 14:22:15 IST, leaving the order in 'PENDING_PAYMENT'. The customer re-submitted, creating second charge PAY124. Both amounts were captured by the acquiring bank.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
                <div className="p-3 rounded-xl bg-ink-inset border border-border text-center">
                  <p className="text-lg font-bold text-verified font-mono">3</p>
                  <p className="text-[11px] text-muted font-medium">Corroborating Records</p>
                </div>
                <div className="p-3 rounded-xl bg-ink-inset border border-border text-center">
                  <p className="text-lg font-bold text-verified font-mono">0</p>
                  <p className="text-[11px] text-muted font-medium">Contradicting Facts</p>
                </div>
                <div className="p-3 rounded-xl bg-ink-inset border border-border text-center">
                  <p className="text-lg font-bold text-amber font-mono">1.4s</p>
                  <p className="text-[11px] text-muted font-medium">Resolution Latency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP 5: Vision Forensics & Perceptual Hashing ── */}
      <section id="stage-05" className="py-20 sm:py-28 border-b border-border relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider mb-4"
            >
              Step 05 • Computer Vision Forensics
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-paper mb-4"
            >
              Image Authenticity & dHash Collision Detection
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-paper-dim text-sm sm:text-base leading-relaxed"
            >
              Fraud rings routinely submit Google stock images, AI-generated damage renders, or reuse photos from previous claims across burner accounts. INQUEST inspects optical evidence with Gemini Vision and a 64-bit perceptual hash (dHash).
            </motion.p>
          </div>

          {/* Scenario Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {Object.entries(VISION_SCENARIOS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveVisionScenario(key)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all ${
                  activeVisionScenario === key
                    ? 'bg-[#2F6F68] text-white shadow-md'
                    : 'bg-ink-light border border-border text-paper-dim hover:bg-ink-lighter'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* Vision Forensics Interactive Card */}
          {(() => {
            const scenario = VISION_SCENARIOS[activeVisionScenario];
            return (
              <div className="p-6 sm:p-8 rounded-2xl bg-ink-light border border-border shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Image & Perceptual Hash */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-border-strong aspect-video sm:aspect-square bg-ink-inset">
                    <img
                      src={scenario.image}
                      alt={scenario.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-ink/80 text-white font-mono text-[11px] backdrop-blur-xs border border-white/20">
                      dHash: {scenario.dHash}
                    </div>
                    <div
                      className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                        scenario.color === 'verified'
                          ? 'bg-verified-dim text-verified border-verified/40'
                          : scenario.color === 'alert'
                          ? 'bg-alert-dim text-alert border-alert/40'
                          : 'bg-amber-dim text-amber border-amber/40'
                      }`}
                    >
                      {scenario.badge}
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-muted font-mono">
                    Perceptual 64-bit difference hash computed in real-time
                  </p>
                </div>

                {/* Forensics Inspection Details */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Forensic Audit Results
                    </span>
                    <h3 className="text-xl font-bold text-paper mt-1">{scenario.title}</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-ink-inset border border-border">
                      <p className="font-bold text-paper mb-1">Catalog / Order Spec Check:</p>
                      <p className="text-paper-dim">{scenario.matchStatus}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-ink-inset border border-border">
                      <p className="font-bold text-paper mb-1">Gemini Vision Defect Analysis:</p>
                      <p className="text-paper-dim">{scenario.damageAnalysis}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-ink-inset border border-border">
                      <p className="font-bold text-paper mb-1">Cross-Claim Duplicate Registry (dHash):</p>
                      <p
                        className={`font-semibold ${
                          scenario.color === 'alert' ? 'text-alert' : 'text-verified'
                        }`}
                      >
                        {scenario.reusedCheck}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border flex items-center justify-between bg-ink-lighter border-border-strong">
                      <div>
                        <p className="text-[11px] text-muted font-bold uppercase tracking-wider">
                          Autonomous System Action
                        </p>
                        <p className="text-sm font-bold text-paper">{scenario.verdict}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          scenario.color === 'verified'
                            ? 'bg-verified text-white'
                            : scenario.color === 'alert'
                            ? 'bg-alert text-white'
                            : 'bg-amber text-ink'
                        }`}
                      >
                        {scenario.authenticity.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── STEP 6: Deterministic 4-Way Decision Matrix ── */}
      <section id="stage-06" className="py-20 sm:py-28 border-b border-border relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider mb-4"
            >
              Step 06 • Decision Engine
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-paper mb-4"
            >
              Deterministic 4-Way Decision Matrix
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-paper-dim text-sm sm:text-base leading-relaxed"
            >
              INQUEST maps verified evidence, policy coverage, and category bounds into exactly four transparent outcomes:
            </motion.p>
          </div>

          {/* 4 Decision Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {DECISION_PATHS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeDecision === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveDecision(item.id)}
                  className={`p-5 rounded-2xl bg-ink-light border-2 transition-all cursor-pointer shadow-md flex flex-col justify-between ${
                    isSelected
                      ? `${item.border} shadow-lg scale-102`
                      : 'border-border hover:border-border-strong opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center ${item.text}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.bg} ${item.text}`}>
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-paper mb-1">{item.title}</h3>
                    <p className="text-[11px] text-muted font-medium mb-3">{item.rule}</p>
                    <p className="text-xs text-paper-dim leading-relaxed p-3 rounded-lg bg-ink-inset border border-border">
                      {item.example}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
                      Automatic System Action:
                    </p>
                    <p className={`text-xs font-bold ${item.text}`}>{item.resolution}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.gatingChecks.map((chk, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ink-inset text-muted border border-border"
                        >
                          ✓ {chk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STEP 7: Real-Time Customer Chat & Self-Service Experience ── */}
      <section id="stage-07" className="py-20 sm:py-28 border-b border-border relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Narrative */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider">
                Step 07 • Customer Experience
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-paper">
                Interactive Customer Live Chat Widget
              </h2>
              <p className="text-paper-dim text-sm sm:text-base leading-relaxed">
                Rather than sending customers to an email black hole, INQUEST provides a live self-service tracking widget right on your e-commerce storefront.
              </p>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-verified" />
                  <span>Real-time milestone progress bar (Intake → Audit → Disbursed)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-verified" />
                  <span>One-click election for replacement vs wallet credit bonus</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-verified" />
                  <span>Dynamic document & camera upload for `NEEDS_INFO` cases</span>
                </li>
              </ul>

              <div className="pt-2 flex items-center gap-2">
                {[
                  { step: 0, label: '1. Intake' },
                  { step: 1, label: '2. Investigating' },
                  { step: 2, label: '3. Resolved' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setChatStep(s.step)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      chatStep === s.step
                        ? 'bg-[#2F6F68] text-white shadow-xs font-bold'
                        : 'bg-ink-light border border-border text-paper-dim'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Right Chat Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              <div className="rounded-2xl border border-border bg-ink-light shadow-2xl overflow-hidden max-w-md mx-auto">
                {/* Chat Header */}
                <div className="px-5 py-3.5 bg-[#203436] text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] p-1 flex items-center justify-center">
                      <img src="/favicon.png" alt="INQUEST" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">INQUEST Live Support</h4>
                      <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Automated Investigation Active
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80">
                    Order #456
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="p-4 bg-ink-inset space-y-3.5 min-h-[300px] text-xs">
                  {/* Customer message */}
                  <div className="flex justify-end">
                    <div className="p-3 rounded-2xl rounded-tr-none bg-[#2F6F68] text-white max-w-[80%] shadow-xs">
                      bhai payment 2 baar kat gyi order #456 ke liye, please refund karo urgently
                    </div>
                  </div>

                  {/* System Acknowledgment */}
                  <div className="flex justify-start">
                    <div className="p-3 rounded-2xl rounded-tl-none bg-ink-light border border-border max-w-[85%] space-y-1.5 shadow-xs">
                      <p className="font-bold text-paper flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber" />
                        <span>Autonomous Investigation Initiated</span>
                      </p>
                      <p className="text-paper-dim text-[11px]">
                        Cross-checking Razorpay gateway records against internal Order #456...
                      </p>
                    </div>
                  </div>

                  {/* Step 1: Investigating State */}
                  {chatStep >= 1 && (
                    <div className="p-3 rounded-xl bg-amber-dim/40 border border-amber/30 text-amber space-y-1">
                      <p className="font-bold text-[11px] flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Discrepancy Verified: Double Gateway Capture Found</span>
                      </p>
                      <p className="text-[10px] text-paper-dim">
                        Second transaction PAY_9921 was captured while internal state timed out.
                      </p>
                    </div>
                  )}

                  {/* Step 2: Resolved State */}
                  {chatStep >= 2 && (
                    <div className="p-3.5 rounded-2xl rounded-tl-none bg-verified-dim border border-verified/30 text-verified space-y-2 shadow-xs">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-verified">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Auto-Resolution Disbursed!</span>
                      </div>
                      <p className="text-[11px] text-paper-dim leading-relaxed">
                        Refund of <strong>₹2,499.00</strong> initiated to original payment method (HDFC Card **9012). Bank Ref: <code>TXN_RF9921</code>.
                      </p>
                      <div className="pt-1 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-verified text-white font-bold text-[10px]">
                          Completed in 1.4s
                        </span>
                        <span className="text-[10px] text-muted">0 Human Touches Needed</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <div className="p-3 border-t border-border bg-ink-light flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Case resolved automatically..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-ink-inset border border-border text-xs text-muted"
                  />
                  <button
                    type="button"
                    disabled
                    className="p-2 rounded-lg bg-[#2F6F68] text-white opacity-60 cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STEP 8: Privileged Admin Handoff & ID Biometrics ── */}
      <section id="stage-08" className="py-20 sm:py-28 border-b border-[#E2E8E4] relative scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Narrative */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-wider">
                Step 08 • Privileged Access
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-paper">
                Secure Handoff & Institutional ID OCR
              </h2>
              <p className="text-paper-dim text-sm sm:text-base leading-relaxed">
                When a claim involves suspected fraud or physical damage disputes, INQUEST generates an audit-grade executive dossier for the supervisor.
              </p>
              <p className="text-muted text-xs sm:text-sm leading-relaxed">
                To access privileged fraud dossiers and disburse manual high-value payouts, agents must verify their identity using a live institutional card scan (e.g. NIET ID card) authenticated via Gemini Vision OCR.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  disabled={scanState === 'scanning'}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber hover:bg-amber-light text-ink font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>
                    {scanState === 'verified'
                      ? 'Re-scan ID Simulation'
                      : 'Simulate Live ID Card Scan'}
                  </span>
                </button>
                {scanState === 'verified' && (
                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="text-xs text-muted hover:text-paper cursor-pointer text-left"
                  >
                    Reset simulation view
                  </button>
                )}
              </div>
            </motion.div>

            {/* Right Interactive ID Scanner Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              <div className="rounded-2xl border border-border bg-ink-light p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber" />
                    <span className="text-xs font-bold text-paper uppercase tracking-wider">
                      Privileged Supervisor Dossier Gate
                    </span>
                  </div>
                  <span className="text-xs text-muted font-mono">Fail-Closed Biometrics</span>
                </div>

                {/* Viewfinder Mockup */}
                <div className="relative rounded-xl overflow-hidden border border-border bg-ink-inset aspect-video flex items-center justify-center shadow-inner">
                  {scanState === 'idle' && (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-ink-lighter border border-border mx-auto flex items-center justify-center text-muted">
                        <Lock className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-paper">Privileged Dossier Locked</p>
                      <p className="text-xs text-muted max-w-xs mx-auto">
                        Click 'Simulate Live ID Card Scan' on the left to test optical card verification.
                      </p>
                    </div>
                  )}

                  {scanState === 'scanning' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-inset">
                      <div className="relative w-[75%] h-[70%] border border-amber/30 rounded-lg flex items-center justify-center">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber" />

                        <div className="absolute left-0 right-0 h-1 bg-amber shadow-[0_0_12px_2px_rgba(217,119,6,0.8)] scanline" />

                        <div className="text-center space-y-2">
                          <p className="text-xs font-bold text-amber tracking-wider uppercase animate-pulse">
                            Scanning Institutional ID...
                          </p>
                          <p className="text-[11px] text-muted">Evaluating NIET reference template</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanState === 'verified' && (
                    <div className="absolute inset-0 bg-[#152223] flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-verified-dim border border-verified flex items-center justify-center text-verified pop-in shadow-lg">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <h4 className="text-base font-bold text-white">
                        NIET Institutional ID Verified
                      </h4>
                      <p className="text-xs text-[#8B9C98] font-mono">
                        Supervisor: Yash Gautam (0251CSML079) • Access Granted
                      </p>

                      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                        <span className="px-3 py-1 rounded-md bg-white/10 text-xs text-white font-semibold border border-white/20 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber" /> Full Dossier Unlocked
                        </span>
                        <span className="px-3 py-1 rounded-md bg-white/10 text-xs text-white font-semibold border border-white/20 flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5 text-verified" /> Audit Log Ready
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                  <span>Protected by Gemini Vision AI OCR + Biometric Reference Match</span>
                  <span className="font-mono text-amber">SHA-256 Audit Trail</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Architectural Principles Deep-Dive ── */}
      <section className="py-20 sm:py-28 border-b border-border relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-paper mb-3">
              Core Architectural Invariants
            </h2>
            <p className="text-paper-dim text-sm sm:text-base leading-relaxed">
              Why enterprise fintech and e-commerce leaders trust INQUEST over conventional LLM bots:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-ink-light border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-verified-dim text-verified flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-paper">Evidence Is Ground Truth, Not Claims</h3>
              <p className="text-xs sm:text-sm text-paper-dim leading-relaxed">
                LLM text generations are treated as subjective customer claims. Only payment gateway logs, courier weight scans, and relational database records are treated as legal evidence.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-ink-light border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-dim text-amber flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-paper">Fail-Closed Isolation Boundaries</h3>
              <p className="text-xs sm:text-sm text-paper-dim leading-relaxed">
                If an order does not belong to the verified customer session token, the investigation halts with zero confidence and escalates for isolation breach investigation. Cross-account spoofing is mathematically impossible.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-ink-light border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#2F6F68]/15 text-[#2F6F68] flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-paper">Deterministic Outcomes, Zero Black-Box Bias</h3>
              <p className="text-xs sm:text-sm text-paper-dim leading-relaxed">
                Every decision maps directly to verified evidence and institutional SLA policies. Low-confidence claims or missing policies escalate with clear, auditable reasoning rather than arbitrary generative hallucinations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-ink-light border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-info-dim text-info flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-lg font-bold text-paper">Computer Vision with Perceptual Hash</h3>
              <p className="text-xs sm:text-sm text-paper-dim leading-relaxed">
                Combines Gemini Vision defect classification with 64-bit dHash collision scanning to detect reused unboxing photos across multi-accounting return fraud rings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing Summary & CTA Section ── */}
      <section className="py-24 sm:py-32 relative text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-verified-dim border border-verified/30 text-verified text-xs font-bold uppercase tracking-wider"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Operational & Ready for Demonstration</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-paper leading-tight"
          >
            Zero guesswork. Zero sentiment bias. <br className="hidden sm:inline" />
            <span className="text-amber">Connected, audit-grade evidence.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-paper-dim text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Test the live autonomous pipeline with duplicate charges, delivery queries,
            Hinglish slang, photo forensic uploads, or security escalation flows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber hover:bg-amber-light text-ink font-bold text-base transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Launch Live App</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-ink-light hover:bg-ink-lighter border border-border-strong text-paper font-semibold text-sm transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Back to Top
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E2E8E4] py-8 text-center text-xs text-[#556865] relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-[#142123]">
            <img src="/favicon.png" alt="INQUEST" className="w-4 h-4 object-contain" />
            <span>INQUEST 2.0 • Autonomous Investigation Engine</span>
          </div>
          <p>© 2026 INQUEST. All complaints investigated with verifiable database truth.</p>
        </div>
      </footer>
    </div>
  );
}
