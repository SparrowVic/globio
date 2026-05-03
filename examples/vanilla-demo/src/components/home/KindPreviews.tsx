/**
 * Five tiny CSS-only animations, one per kind. Each fits the 128px card
 * preview slot and runs forever — they're pure decoration. Built with
 * SVG + CSS @keyframes so the cost is zero on idle frames.
 */

export function OutlinePreview() {
  return (
    <svg viewBox="0 0 200 128" className="size-full">
      <defs>
        <radialGradient id="op-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="64" r="44" fill="url(#op-glow)" opacity="0.6" />
      {/* Country-ish silhouette */}
      <path
        d="M82 38 L120 30 L138 58 L132 84 L106 96 L78 90 L66 70 L72 50 Z"
        stroke="#fde68a"
        strokeWidth="1.4"
        fill="none"
        opacity="0.7"
      />
      {/* Pulse rings — staggered */}
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="100"
          cy="64"
          r="20"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1.2"
          opacity="0"
          style={{
            animation: `op-pulse 2.4s ease-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes op-pulse {
          0% { r: 20; opacity: 0.8; }
          100% { r: 56; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

export function DottedPreview() {
  // 12×8 grid of dots, each with a randomized twinkle delay so the field
  // looks alive but never strobes in unison.
  const cols = 14;
  const rows = 9;
  const cells: Array<{ x: number; y: number; delay: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: 8 + c * 13,
        y: 8 + r * 13,
        // Deterministic pseudo-random so SSR matches client paint.
        delay: ((r * cols + c) * 137) % 100,
      });
    }
  }
  return (
    <svg viewBox="0 0 200 128" className="size-full">
      {cells.map((cell) => {
        // Form a rough sphere mask — fade dots near edges.
        const cx = 100;
        const cy = 64;
        const dist = Math.sqrt((cell.x - cx) ** 2 + (cell.y - cy) ** 2);
        const radius = 56;
        if (dist > radius) return null;
        const alpha = Math.max(0.15, 1 - dist / radius);
        return (
          <circle
            key={`${cell.x}-${cell.y}`}
            cx={cell.x}
            cy={cell.y}
            r="1.1"
            fill="#67e8f9"
            opacity={alpha}
            style={{
              animation: 'dp-twinkle 2.4s ease-in-out infinite',
              animationDelay: `${cell.delay * 0.01}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes dp-twinkle {
          0%, 100% { opacity: 0.18; }
          50%      { opacity: 0.9; }
        }
      `}</style>
    </svg>
  );
}

export function WireframePreview() {
  // Animated grid lines drawing left → right, top → bottom.
  const verticals = [40, 70, 100, 130, 160];
  const horizontals = [32, 50, 68, 86, 104];
  return (
    <svg viewBox="0 0 200 128" className="size-full">
      <defs>
        <linearGradient id="wp-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
          <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Static faint grid */}
      {verticals.map((x) => (
        <line key={`v-${x}`} x1={x} y1="20" x2={x} y2="108" stroke="#a78bfa" strokeWidth="0.4" opacity="0.18" />
      ))}
      {horizontals.map((y) => (
        <line key={`h-${y}`} x1="32" y1={y} x2="168" y2={y} stroke="#a78bfa" strokeWidth="0.4" opacity="0.18" />
      ))}
      {/* Animated scan line */}
      <line
        x1="32"
        x2="168"
        y1="0"
        y2="0"
        stroke="url(#wp-grad)"
        strokeWidth="1.6"
        style={{ animation: 'wp-scan 3.2s ease-in-out infinite' }}
      />
      {/* Diagonal accent */}
      <path
        d="M32 32 L168 96"
        stroke="#a78bfa"
        strokeWidth="0.8"
        strokeDasharray="2 4"
        opacity="0.35"
      />
      <style>{`
        @keyframes wp-scan {
          0%   { transform: translateY(20px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(108px); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

export function PaperPreview() {
  // Ink drop spreading across cream paper.
  return (
    <svg viewBox="0 0 200 128" className="size-full">
      <defs>
        <radialGradient id="pp-paper" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#f5e9c8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f5e9c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pp-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#92400e" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#451a03" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#451a03" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="128" fill="url(#pp-paper)" />
      {/* Compass rose */}
      <g opacity="0.45" stroke="#92400e" strokeWidth="0.8" fill="none">
        <circle cx="100" cy="64" r="22" />
        <line x1="100" y1="38" x2="100" y2="90" />
        <line x1="74" y1="64" x2="126" y2="64" />
      </g>
      {/* Spreading ink ring — pulses */}
      {[0, 1].map((i) => (
        <circle
          key={i}
          cx="100"
          cy="64"
          r="6"
          fill="url(#pp-ink)"
          style={{
            animation: 'pp-spread 4s ease-out infinite',
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes pp-spread {
          0%   { r: 6; opacity: 0.9; }
          100% { r: 60; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

export function HologramPreview() {
  // Rotating cyan rings + scanline.
  return (
    <svg viewBox="0 0 200 128" className="size-full">
      <defs>
        <linearGradient id="hp-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <g style={{ transformOrigin: '100px 64px', animation: 'hp-spin 6s linear infinite' }}>
        <ellipse cx="100" cy="64" rx="48" ry="20" fill="none" stroke="url(#hp-rim)" strokeWidth="1" />
        <ellipse cx="100" cy="64" rx="40" ry="14" fill="none" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="0.8" />
        <ellipse cx="100" cy="64" rx="30" ry="8" fill="none" stroke="#22d3ee" strokeOpacity="0.7" strokeWidth="0.6" />
      </g>
      <circle cx="100" cy="64" r="3" fill="#22d3ee" opacity="0.9" />
      {/* Scanline */}
      <rect
        x="32"
        y="60"
        width="136"
        height="1"
        fill="#22d3ee"
        opacity="0.65"
        style={{ animation: 'hp-scan 2s linear infinite' }}
      />
      <style>{`
        @keyframes hp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes hp-scan {
          0%   { transform: translateY(-30px); opacity: 0; }
          50%  { opacity: 0.85; }
          100% { transform: translateY(30px); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
