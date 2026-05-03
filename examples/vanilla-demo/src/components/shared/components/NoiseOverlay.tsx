/**
 * Inline-SVG turbulence overlay. Hard to notice on its own — that's the
 * point. Breaks up flat colour fields just enough that pages don't read
 * as "another dark Tailwind site". Pinned with `mix-blend-overlay` so it
 * tints rather than dimming.
 *
 * Use sparingly — one per route at most, never inside scrollable
 * containers (it's `fixed`).
 */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
