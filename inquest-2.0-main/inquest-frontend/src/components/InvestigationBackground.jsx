export default function InvestigationBackground({ fixed = false, className = '' }) {
  const pos = fixed ? 'fixed inset-0' : 'absolute inset-0';
  return (
    <div className={`${pos} pointer-events-none select-none overflow-hidden z-0 ${className}`} aria-hidden="true">
      {/* Soft ivory / warm cream ambient base gradient */}
      <div className="absolute inset-0 bg-[#FAF8F5]" />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 90% 65% at 50% -10%, #FFFFFF 0%, #FAF7F2 45%, #F1EDE4 100%)',
          opacity: 0.95,
        }}
      />

      {/* Fine investigative dossier micro-dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(#2F6F68 0.75px, transparent 0.75px)',
          backgroundSize: '28px 28px',
          opacity: 0.045,
        }}
      />

      {/* Embedded subtle SVG illustration: evidence networks, document outlines, shield, magnifying lens */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 960"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            @keyframes inquest-node-pulse {
              0%, 100% { opacity: 0.35; transform: scale(1); }
              50% { opacity: 0.75; transform: scale(1.18); }
            }
            @media (prefers-reduced-motion: no-preference) {
              .inquest-pulse-node {
                animation: inquest-node-pulse 5s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .inquest-pulse-node {
                animation: none !important;
              }
            }
          `}</style>

          <radialGradient id="tealNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2F6F68" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2F6F68" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="amberNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C58B4B" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#C58B4B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Evidence Network Connecting Lines ── */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Upper spanning evidence spline */}
          <path
            d="M 180 290 C 380 170, 580 140, 720 150 C 860 160, 1060 190, 1260 220"
            fill="none"
            stroke="#2F6F68"
            strokeWidth="1.25"
            strokeDasharray="5 5"
            strokeOpacity="0.22"
          />

          {/* Lower linking verification spline */}
          <path
            d="M 160 580 C 340 680, 520 710, 720 700 C 920 690, 1100 660, 1280 560"
            fill="none"
            stroke="#8EA89D"
            strokeWidth="1.25"
            strokeDasharray="4 4"
            strokeOpacity="0.2"
          />

          {/* Cross diagonal arbitration graph lines */}
          <path
            d="M 280 430 C 450 470, 580 450, 720 480 C 860 510, 1000 460, 1180 400"
            fill="none"
            stroke="#2F6F68"
            strokeWidth="1"
            strokeOpacity="0.14"
          />

          {/* Branch lines on left flank */}
          <line x1="150" y1="230" x2="250" y2="280" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 3" />
          <line x1="250" y1="280" x2="270" y2="440" stroke="#8EA89D" strokeWidth="1" strokeOpacity="0.22" strokeDasharray="4 4" />
          <line x1="270" y1="440" x2="160" y2="560" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.18" />

          {/* Branch lines on right flank */}
          <line x1="1260" y1="220" x2="1170" y2="300" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 3" />
          <line x1="1170" y1="300" x2="1240" y2="470" stroke="#8EA89D" strokeWidth="1" strokeOpacity="0.22" strokeDasharray="4 4" />
          <line x1="1240" y1="470" x2="1180" y2="610" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.18" />
        </g>

        {/* ── Left Flank: Abstract Itemized Receipt Outline ── */}
        <g transform="translate(85, 230) rotate(-4)">
          <rect
            x="0"
            y="0"
            width="135"
            height="180"
            rx="6"
            fill="#FFFFFF"
            fillOpacity="0.45"
            stroke="#8EA89D"
            strokeWidth="1.25"
            strokeOpacity="0.32"
          />
          {/* Header line */}
          <line x1="14" y1="26" x2="121" y2="26" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.25" />
          {/* Item entries */}
          <line x1="14" y1="42" x2="88" y2="42" stroke="#8EA89D" strokeWidth="1.5" strokeOpacity="0.24" strokeDasharray="3 3" />
          <line x1="98" y1="42" x2="121" y2="42" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.25" />
          <line x1="14" y1="58" x2="76" y2="58" stroke="#8EA89D" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 3" />
          <line x1="98" y1="58" x2="121" y2="58" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.25" />
          <line x1="14" y1="74" x2="84" y2="74" stroke="#8EA89D" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 3" />
          <line x1="98" y1="74" x2="121" y2="74" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.25" />
          <line x1="14" y1="92" x2="121" y2="92" stroke="#E2E8E4" strokeWidth="1" />
          <line x1="14" y1="104" x2="65" y2="104" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="90" y1="104" x2="121" y2="104" stroke="#C58B4B" strokeWidth="1.75" strokeOpacity="0.45" />

          {/* Barcode representation */}
          <line x1="18" y1="126" x2="18" y2="146" stroke="#2F6F68" strokeWidth="2.5" strokeOpacity="0.25" />
          <line x1="24" y1="126" x2="24" y2="146" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="28" y1="126" x2="28" y2="146" stroke="#2F6F68" strokeWidth="3" strokeOpacity="0.25" />
          <line x1="35" y1="126" x2="35" y2="146" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.2" />
          <line x1="40" y1="126" x2="40" y2="146" stroke="#2F6F68" strokeWidth="2" strokeOpacity="0.25" />
          <line x1="45" y1="126" x2="45" y2="146" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="50" y1="126" x2="50" y2="146" stroke="#2F6F68" strokeWidth="3.5" strokeOpacity="0.25" />
          <line x1="58" y1="126" x2="58" y2="146" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.2" />

          {/* Verification stamp seal on receipt */}
          <circle cx="98" cy="136" r="16" stroke="#2F6F68" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.28" fill="none" />
          <path d="M92 136 L96 140 L105 131" fill="none" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.35" />

          <text x="14" y="16" fill="#556F68" fontSize="8" fontFamily="monospace" letterSpacing="1" opacity="0.4">
            EVIDENCE_RECEIPT #0719
          </text>
        </g>

        {/* ── Left Flank: Verification Shield Motif ── */}
        <g transform="translate(110, 520)">
          {/* Outer heraldic shield */}
          <path
            d="M40 6 C62 6 76 19 76 38 C76 66 40 86 40 86 C40 86 4 66 4 38 C4 19 18 6 40 6 Z"
            fill="#FFFFFF"
            fillOpacity="0.45"
            stroke="#2F6F68"
            strokeWidth="1.5"
            strokeOpacity="0.32"
          />
          {/* Inner concentric contour */}
          <path
            d="M40 13 C57 13 68 23 68 38 C68 60 40 76 40 76 C40 76 12 60 12 38 C12 23 23 13 40 13 Z"
            fill="none"
            stroke="#8EA89D"
            strokeWidth="1"
            strokeOpacity="0.22"
            strokeDasharray="3 2"
          />
          {/* Distinct checkmark */}
          <path
            d="M26 39 L35 48 L54 27"
            fill="none"
            stroke="#2F6F68"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.4"
          />
          {/* Restrained warm orange highlight pip at apex matching logo */}
          <circle cx="40" cy="6" r="3" fill="#C58B4B" opacity="0.75" />

          <text x="40" y="102" textAnchor="middle" fill="#556F68" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.38">
            VERIFIED_INTEGRITY
          </text>
        </g>

        {/* ── Right Flank: Forensic Magnifying-Glass Motif ── */}
        <g transform="translate(1230, 160)">
          {/* Handle at 45 degree angle */}
          <path
            d="M68 68 L98 98 C101 101 106 101 109 98 C112 95 112 90 109 87 L79 57"
            fill="#FFFFFF"
            fillOpacity="0.4"
            stroke="#2F6F68"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            strokeLinecap="round"
          />
          {/* Outer lens rim */}
          <circle
            cx="42"
            cy="42"
            r="38"
            fill="#FFFFFF"
            fillOpacity="0.45"
            stroke="#2F6F68"
            strokeWidth="1.75"
            strokeOpacity="0.35"
          />
          {/* Inner lens bezel */}
          <circle
            cx="42"
            cy="42"
            r="32"
            fill="none"
            stroke="#8EA89D"
            strokeWidth="1"
            strokeOpacity="0.25"
            strokeDasharray="4 3"
          />
          {/* Precision reticle crosshairs */}
          <line x1="42" y1="12" x2="42" y2="24" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="42" y1="60" x2="42" y2="72" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="12" y1="42" x2="24" y2="42" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="60" y1="42" x2="72" y2="42" stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.3" />

          {/* Focal target reticle with restrained orange accent */}
          <circle cx="42" cy="42" r="2.5" fill="#C58B4B" opacity="0.8" />
          <circle cx="42" cy="42" r="8" fill="none" stroke="#C58B4B" strokeWidth="0.75" strokeOpacity="0.4" />

          {/* Concentric scan arc */}
          <path
            d="M12 42 A30 30 0 0 1 64 20"
            fill="none"
            stroke="#2F6F68"
            strokeWidth="1.25"
            strokeOpacity="0.25"
            strokeDasharray="2 3"
          />

          <text x="42" y="93" textAnchor="middle" fill="#556F68" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.38">
            EVIDENCE_INSPECTION
          </text>
        </g>

        {/* ── Right Flank: Abstract Document / Audit Dossier ── */}
        <g transform="translate(1210, 440) rotate(3)">
          <path
            d="M0 0 L110 0 L135 25 L135 180 L0 180 Z"
            fill="#FFFFFF"
            fillOpacity="0.45"
            stroke="#8EA89D"
            strokeWidth="1.25"
            strokeOpacity="0.32"
          />
          {/* Dog-ear corner fold */}
          <path d="M110 0 L110 25 L135 25" fill="#FAF8F5" stroke="#8EA89D" strokeWidth="1.25" strokeOpacity="0.32" />

          {/* Dossier header with orange badge point */}
          <rect x="15" y="18" width="55" height="10" rx="3" fill="#2F6F68" fillOpacity="0.12" />
          <circle cx="95" cy="23" r="5" fill="#C58B4B" fillOpacity="0.25" stroke="#C58B4B" strokeWidth="0.75" strokeOpacity="0.45" />

          {/* Data rows */}
          <line x1="15" y1="42" x2="115" y2="42" stroke="#8EA89D" strokeWidth="1.5" strokeOpacity="0.25" />
          <line x1="15" y1="56" x2="100" y2="56" stroke="#8EA89D" strokeWidth="1.5" strokeOpacity="0.2" />
          <line x1="15" y1="70" x2="110" y2="70" stroke="#8EA89D" strokeWidth="1.5" strokeOpacity="0.2" />
          <line x1="15" y1="88" x2="115" y2="88" stroke="#E2E8E4" strokeWidth="1" />

          {/* Structured evidence table preview */}
          <rect x="15" y="98" width="48" height="28" rx="3" fill="none" stroke="#2F6F68" strokeWidth="0.75" strokeOpacity="0.2" />
          <rect x="68" y="98" width="48" height="28" rx="3" fill="none" stroke="#2F6F68" strokeWidth="0.75" strokeOpacity="0.2" />
          <line x1="15" y1="108" x2="63" y2="108" stroke="#2F6F68" strokeWidth="0.75" strokeOpacity="0.15" />
          <line x1="68" y1="108" x2="116" y2="108" stroke="#2F6F68" strokeWidth="0.75" strokeOpacity="0.15" />

          {/* Audit seal stamp */}
          <circle cx="67" cy="152" r="14" stroke="#2F6F68" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.28" fill="none" />
          <text x="67" y="155" textAnchor="middle" fill="#2F6F68" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.4">
            CONFIRMED
          </text>
        </g>

        {/* ── Evidence Network Nodes (Teal and Restrained Orange Highlights) ── */}
        {/* Node A (Left upper: Order Record) */}
        <g transform="translate(250, 280)">
          <circle cx="0" cy="0" r="16" fill="url(#tealNodeGlow)" />
          <circle cx="0" cy="0" r="5" fill="#FAF8F5" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="0" cy="0" r="2" fill="#2F6F68" opacity="0.65" />
          <text x="12" y="-4" fill="#556F68" fontSize="8" fontFamily="monospace" opacity="0.4">
            DATA:ORDER_HASH
          </text>
        </g>

        {/* Node B (Left lower: Payment Ledger - Orange Accent matching INQUEST logo) */}
        <g transform="translate(270, 440)">
          <circle cx="0" cy="0" r="18" fill="url(#amberNodeGlow)" />
          <circle cx="0" cy="0" r="6" fill="#FAF8F5" stroke="#C58B4B" strokeWidth="1.5" strokeOpacity="0.55" />
          <circle cx="0" cy="0" r="2.5" fill="#C58B4B" className="inquest-pulse-node" opacity="0.85" />
          <text x="14" y="4" fill="#556F68" fontSize="8" fontFamily="monospace" opacity="0.4">
            PAYMENT_CHAIN // 0x48A...
          </text>
        </g>

        {/* Node C (Center Evidence Synthesis behind title) */}
        <g transform="translate(720, 150)">
          <circle cx="0" cy="0" r="32" fill="none" stroke="#2F6F68" strokeWidth="0.75" strokeOpacity="0.14" strokeDasharray="2 3" />
          <circle cx="0" cy="0" r="4.5" fill="#FAF8F5" stroke="#2F6F68" strokeWidth="1.25" strokeOpacity="0.45" />
          <circle cx="0" cy="0" r="1.75" fill="#2F6F68" opacity="0.6" />
          <text x="0" y="-18" textAnchor="middle" fill="#556F68" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.32">
            ARBITRATION_GRAPH // MATCH: 99.4%
          </text>
        </g>

        {/* Node D (Right upper: Forensic Extraction - Orange Accent matching INQUEST logo) */}
        <g transform="translate(1170, 300)">
          <circle cx="0" cy="0" r="18" fill="url(#amberNodeGlow)" />
          <circle cx="0" cy="0" r="6" fill="#FAF8F5" stroke="#C58B4B" strokeWidth="1.5" strokeOpacity="0.55" />
          <circle cx="0" cy="0" r="2.5" fill="#C58B4B" className="inquest-pulse-node" opacity="0.85" />
          <text x="14" y="-4" fill="#556F68" fontSize="8" fontFamily="monospace" opacity="0.4">
            EXIF_VERIFICATION
          </text>
        </g>

        {/* Node E (Right lower: Chain of Custody) */}
        <g transform="translate(1180, 610)">
          <circle cx="0" cy="0" r="16" fill="url(#tealNodeGlow)" />
          <circle cx="0" cy="0" r="5" fill="#FAF8F5" stroke="#2F6F68" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="0" cy="0" r="2" fill="#2F6F68" opacity="0.65" />
          <text x="12" y="4" fill="#556F68" fontSize="8" fontFamily="monospace" opacity="0.4">
            CHAIN_OF_CUSTODY // LOG_092
          </text>
        </g>

        {/* ── Strategic Grid Reticle Crosshairs (+) ── */}
        <g stroke="#2F6F68" strokeWidth="1" strokeOpacity="0.18">
          <path d="M 200 115 L 200 125 M 195 120 L 205 120" />
          <path d="M 480 215 L 480 225 M 475 220 L 485 220" />
          <path d="M 960 215 L 960 225 M 955 220 L 965 220" />
          <path d="M 1240 115 L 1240 125 M 1235 120 L 1245 120" />
          <path d="M 320 775 L 320 785 M 315 780 L 325 780" />
          <path d="M 720 815 L 720 825 M 715 820 L 725 820" />
          <path d="M 1120 775 L 1120 785 M 1115 780 L 1125 780" />
        </g>
      </svg>
    </div>
  );
}
