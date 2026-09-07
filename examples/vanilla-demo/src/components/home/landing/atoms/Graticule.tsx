/**
 * Orthographic graticule — the coordinate grid of a globe seen from the
 * equator, drawn as a plate the live globe sits in. Meridians are ellipses
 * whose horizontal radius follows cos(longitude); parallels are straight
 * lines at sin(latitude). An outer ring carries a tick every 10°.
 */
export function Graticule({ className }: { readonly className?: string }) {
  const r = 500;
  const meridians = [15, 30, 45, 60, 75].map((deg) => r * Math.cos((deg * Math.PI) / 180));
  const parallels = [15, 30, 45, 60, 75].map((deg) => r * Math.sin((deg * Math.PI) / 180));
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);

  return (
    <svg
      viewBox="-540 -540 1080 1080"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
    >
      <circle r={r} strokeOpacity="0.9" />
      <line x1="0" y1={-r} x2="0" y2={r} strokeOpacity="0.6" />
      {meridians.map((rx) => (
        <ellipse key={`m-${rx.toFixed(1)}`} rx={rx} ry={r} strokeOpacity="0.5" />
      ))}
      <line x1={-r} y1="0" x2={r} y2="0" strokeOpacity="0.6" />
      {parallels.map((y) => {
        const half = Math.sqrt(r * r - y * y);
        return (
          <g key={`p-${y.toFixed(1)}`} strokeOpacity="0.5">
            <line x1={-half} y1={y} x2={half} y2={y} />
            <line x1={-half} y1={-y} x2={half} y2={-y} />
          </g>
        );
      })}
      <circle r={528} strokeOpacity="0.35" />
      {ticks.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const major = deg % 30 === 0;
        const r0 = 528;
        const r1 = major ? 546 : 538;
        return (
          <line
            key={`t-${deg}`}
            x1={Math.cos(a) * r0}
            y1={Math.sin(a) * r0}
            x2={Math.cos(a) * r1}
            y2={Math.sin(a) * r1}
            strokeOpacity={major ? 0.7 : 0.4}
          />
        );
      })}
    </svg>
  );
}
