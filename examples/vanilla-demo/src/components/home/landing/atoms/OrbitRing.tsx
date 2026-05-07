import { cn } from '@/lib/utils';

export interface OrbitRingProps {
  readonly className?: string;
  readonly width: number;
  readonly height: number;
  readonly rotateDeg?: number;
  readonly borderColor?: string;
  readonly glowColor?: string;
  readonly opacity?: number;
}

/**
 * A single elliptical orbit ring rendered as a `<div>` with a rounded
 * border. Cheap, no SVG, looks fine at hero scale. Glow is one box-shadow
 * spread; the wrapper transitions border-color and box-shadow so the
 * hero's theme-bleed feels continuous when the active kind changes.
 */
export function OrbitRing({
  className,
  width,
  height,
  rotateDeg = 0,
  borderColor = 'rgba(255, 200, 90, 0.4)',
  glowColor = 'rgba(251, 191, 36, 0.95)',
  opacity = 1,
}: OrbitRingProps) {
  return (
    <div
      className={cn(
        'absolute left-1/2 top-1/2 rounded-[50%] border',
        className,
      )}
      style={{
        width,
        height,
        transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
        borderColor,
        boxShadow: `0 0 36px -18px ${glowColor}`,
        opacity,
        transition:
          'border-color 280ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}
