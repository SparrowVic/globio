import { OrbitRing } from '../atoms/OrbitRing';

export interface HeroOrbitRigProps {
  readonly accent: string;
}

/**
 * Two deliberate orbit rings + one trajectory arc — the entire orbit
 * scaffolding in the hero. Replaced the previous six-ellipse pile-up,
 * which had no compositional logic. The horizontal ring carries the
 * theme-bleed accent; the tilted ring is fixed cyan as a counterpoint;
 * the trajectory arc is dashed and subtle, suggesting "data on a route"
 * without committing to a real arc layer.
 */
export function HeroOrbitRig({ accent }: HeroOrbitRigProps) {
  return (
    <>
      <OrbitRing
        width={980}
        height={510}
        rotateDeg={-17}
        borderColor={`${accent}73`}
        glowColor={accent}
        opacity={0.85}
      />
      <OrbitRing
        width={1040}
        height={470}
        rotateDeg={20}
        borderColor="rgba(103, 232, 249, 0.34)"
        glowColor="rgba(103, 232, 249, 0.95)"
        opacity={0.7}
      />
      {/* Trajectory arc — dashed half-ellipse, hints at a route without owning a real arc layer */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[740px] w-[1080px] rounded-[50%] border-t border-dashed"
        style={{
          borderColor: `${accent}55`,
          transform: 'translate(-50%, -52%) rotate(-8deg)',
          transition: 'border-color 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </>
  );
}
