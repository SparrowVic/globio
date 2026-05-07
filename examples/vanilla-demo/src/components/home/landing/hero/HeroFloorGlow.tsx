export interface HeroFloorGlowProps {
  readonly accent: string;
}

/**
 * Soft radial floor reflection underneath the hero globe. Replaces the
 * old `clip-path` mountain skyline that read as decorative noise. The
 * accent color tracks the active kind so the floor glow fits the
 * theme-bleed.
 */
export function HeroFloorGlow({ accent }: HeroFloorGlowProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
      style={{
        background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${accent}26 0%, transparent 70%)`,
        transition: 'background 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}
