import type { ConfiguratorId } from './configurators';

/**
 * Per-configurator card preview animations. Each is a tiny SVG / CSS
 * loop showing what the configurator does — way more communicative
 * than a static icon. Keep these small and pure CSS so the picker stays
 * GPU-cheap even with eight cards animating at once.
 */
export function CardPreview({
  id,
  accent,
}: {
  readonly id: ConfiguratorId;
  readonly accent: string;
}) {
  switch (id) {
    case 'labels':
      return <LabelsPreview accent={accent} />;
    case 'pulse':
      return <PulsePreview accent={accent} />;
    case 'stars':
      return <StarsPreview accent={accent} />;
    case 'selection':
      return <HoverPreview accent={accent} />;
    case 'country-fill':
      return <CountryFillPreview accent={accent} />;
    case 'arcs':
      return <ArcsPreview accent={accent} />;
    case 'markers':
      return <MarkersPreview accent={accent} />;
    case 'atmosphere':
      return <AtmospherePreview accent={accent} />;
    case 'crosshair':
      return <CrosshairPreview accent={accent} />;
  }
}

/* ───────────────────── LABELS ───────────────────── */

function LabelsPreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      {/* Country silhouettes */}
      <g stroke={`${accent}66`} strokeWidth="1" fill="none" opacity="0.6">
        <path d="M50 60 L80 50 L100 70 L90 95 L60 90 Z" />
        <path d="M130 40 L170 35 L185 60 L165 85 L135 80 L125 60 Z" />
        <path d="M40 100 L75 100 L70 125 L45 125 Z" />
      </g>
      {/* Animated label — letters fade-in/out then shift */}
      <g
        style={{ animation: 'labels-cycle 5s ease-in-out infinite' }}
      >
        <rect x="63" y="68" width="36" height="12" rx="3" fill={`${accent}18`} stroke={`${accent}55`} strokeWidth="0.5" />
        <text x="81" y="77" fontSize="7" fill="white" textAnchor="middle" fontFamily="system-ui">
          PARIS
        </text>
      </g>
      <g
        style={{ animation: 'labels-cycle 5s ease-in-out infinite 1.6s' }}
      >
        <rect x="142" y="55" width="36" height="12" rx="3" fill={`${accent}18`} stroke={`${accent}55`} strokeWidth="0.5" />
        <text x="160" y="64" fontSize="7" fill="white" textAnchor="middle" fontFamily="system-ui">
          BERLIN
        </text>
      </g>
      <g
        style={{ animation: 'labels-cycle 5s ease-in-out infinite 3.2s' }}
      >
        <rect x="44" y="108" width="32" height="12" rx="3" fill={`${accent}18`} stroke={`${accent}55`} strokeWidth="0.5" />
        <text x="60" y="117" fontSize="7" fill="white" textAnchor="middle" fontFamily="system-ui">
          ROMA
        </text>
      </g>
      <style>{`
        @keyframes labels-cycle {
          0%, 100% { opacity: 0; transform: translateY(2px); }
          15%, 80% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── PULSE ───────────────────── */

function PulsePreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      <defs>
        <radialGradient id={`pulseGrad-${accent}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Centre origin marker */}
      <circle cx="120" cy="72" r="3" fill={accent} />
      <circle cx="120" cy="72" r="50" fill={`url(#pulseGrad-${accent})`} opacity="0.4" />
      {/* Three sonar rings, staggered */}
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="120"
          cy="72"
          r="14"
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          style={{
            animation: 'pulse-ring 2.5s ease-out infinite',
            animationDelay: `${i * 0.85}s`,
            transformOrigin: '120px 72px',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse-ring {
          0%   { r: 14; opacity: 0.85; }
          100% { r: 60; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── STARS ───────────────────── */

function StarsPreview({ accent }: { readonly accent: string }) {
  // 28 deterministically-pseudo-random stars across the frame.
  const stars = Array.from({ length: 28 }, (_, i) => ({
    x: ((i * 137.5) % 220) + 10,
    y: ((i * 61.7) % 124) + 10,
    r: 0.5 + ((i * 23) % 100) / 100,
    delay: ((i * 13) % 100) / 100,
  }));
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      {stars.map((star, i) => (
        <circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill={i % 4 === 0 ? '#fff4d6' : i % 4 === 1 ? '#cfdcff' : '#ffffff'}
          style={{
            animation: 'star-twinkle 3.5s ease-in-out infinite',
            animationDelay: `${star.delay * 3.5}s`,
          }}
        />
      ))}
      {/* Subtle nebula glow in accent */}
      <circle cx="80" cy="60" r="40" fill={accent} opacity="0.05" />
      <circle cx="170" cy="90" r="30" fill={accent} opacity="0.04" />
      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── HOVER ───────────────────── */

function HoverPreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      {/* Three country shapes; the middle one cycles to "hovered" state */}
      <g stroke="#475569" strokeWidth="1" fill="none">
        <path d="M30 50 L70 45 L80 75 L60 95 L35 90 Z" />
        <path d="M170 40 L210 50 L205 90 L175 95 L165 70 Z" />
      </g>
      <g
        style={{ animation: 'hover-cycle 3s ease-in-out infinite' }}
      >
        <path
          d="M95 35 L150 40 L155 80 L130 105 L100 95 L90 65 Z"
          fill={`${accent}18`}
          stroke={accent}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 6px ${accent}aa)` }}
        />
      </g>
      <style>{`
        @keyframes hover-cycle {
          0%, 100% { opacity: 0.4; }
          40%, 70% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── COUNTRY FILL ───────────────────── */

function CountryFillPreview({ accent }: { readonly accent: string }) {
  // Three country shapes filled with different palette entries; the
  // middle one swaps to a hover-fill colour on a slow cycle so the
  // user reads "stateful per-country fills" at a glance.
  const palette = [`${accent}cc`, '#67e8f9cc', '#a78bfacc'];
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      <g stroke="#475569" strokeWidth="1">
        <path d="M30 50 L70 45 L80 75 L60 95 L35 90 Z" fill={palette[1]} />
        <path d="M170 40 L210 50 L205 90 L175 95 L165 70 Z" fill={palette[2]} />
      </g>
      <g style={{ animation: 'fill-cycle 3.2s ease-in-out infinite' }}>
        <path
          d="M95 35 L150 40 L155 80 L130 105 L100 95 L90 65 Z"
          fill={palette[0]}
          stroke={accent}
          strokeWidth="1.2"
        />
      </g>
      <style>{`
        @keyframes fill-cycle {
          0%, 100% { opacity: 0.65; }
          40%, 70% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── ARCS ───────────────────── */

function ArcsPreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      {/* Endpoint markers */}
      {[
        { x: 50, y: 100 },
        { x: 200, y: 50 },
        { x: 120, y: 30 },
        { x: 180, y: 110 },
      ].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="3" fill={accent} />
      ))}
      {/* Animated arcs */}
      <path
        d="M50 100 Q120 0 200 50"
        stroke={accent}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 6"
        style={{ animation: 'arc-flow 3s linear infinite' }}
      />
      <path
        d="M120 30 Q180 80 180 110"
        stroke={`${accent}aa`}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 6"
        style={{ animation: 'arc-flow 3s linear infinite 1s' }}
      />
      <style>{`
        @keyframes arc-flow {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -20; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── MARKERS ───────────────────── */

function MarkersPreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      {[
        { x: 60, y: 50 },
        { x: 130, y: 80 },
        { x: 190, y: 40 },
        { x: 90, y: 110 },
      ].map((pt, i) => (
        <g key={i}>
          <circle
            cx={pt.x}
            cy={pt.y}
            r="3"
            fill={accent}
            style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
          />
          {/* Pulse ring on the second marker */}
          {i === 1 && (
            <circle
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="none"
              stroke={accent}
              strokeWidth="1.5"
              style={{ animation: 'marker-pulse 2s ease-out infinite' }}
            />
          )}
        </g>
      ))}
      <style>{`
        @keyframes marker-pulse {
          0%   { r: 3; opacity: 1; }
          100% { r: 16; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── ATMOSPHERE ───────────────────── */

function AtmospherePreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      <defs>
        <radialGradient id={`atmGlow-${accent}`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="80%" stopColor={accent} stopOpacity="0.1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="72" r="44" fill={`url(#atmGlow-${accent})`} />
      <circle cx="120" cy="72" r="36" fill="#0a0d18" stroke={`${accent}aa`} strokeWidth="0.8" />
      {/* Slow breathing pulse */}
      <circle
        cx="120"
        cy="72"
        r="36"
        fill="none"
        stroke={accent}
        strokeWidth="1"
        opacity="0.6"
        style={{ animation: 'atm-breathe 3s ease-in-out infinite' }}
      />
      <style>{`
        @keyframes atm-breathe {
          0%, 100% { r: 36; opacity: 0.6; }
          50%      { r: 42; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

/* ───────────────────── CROSSHAIR ───────────────────── */

function CrosshairPreview({ accent }: { readonly accent: string }) {
  return (
    <svg viewBox="0 0 240 144" className="size-full">
      {/* Crosshair tracks a small loop */}
      <g style={{ animation: 'crosshair-track 4s ease-in-out infinite' }}>
        <circle cx="0" cy="0" r="14" fill="none" stroke={accent} strokeWidth="1" opacity="0.7" />
        <line x1="-22" y1="0" x2="-8" y2="0" stroke={accent} strokeWidth="1.2" />
        <line x1="8" y1="0" x2="22" y2="0" stroke={accent} strokeWidth="1.2" />
        <line x1="0" y1="-22" x2="0" y2="-8" stroke={accent} strokeWidth="1.2" />
        <line x1="0" y1="8" x2="0" y2="22" stroke={accent} strokeWidth="1.2" />
        <circle cx="0" cy="0" r="1.5" fill={accent} />
      </g>
      <style>{`
        @keyframes crosshair-track {
          0%   { transform: translate(60px, 50px); }
          25%  { transform: translate(170px, 60px); }
          50%  { transform: translate(180px, 100px); }
          75%  { transform: translate(80px, 95px); }
          100% { transform: translate(60px, 50px); }
        }
      `}</style>
    </svg>
  );
}
