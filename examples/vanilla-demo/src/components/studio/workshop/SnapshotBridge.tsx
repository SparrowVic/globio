import { useEffect, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/utils';

export interface SnapshotBridgeProps {
  /** Data-URL captured from the main globe canvas. */
  readonly src: string;
  /** Where the snapshot starts (the main globe's bounding rect at capture time). */
  readonly fromRect: { left: number; top: number; width: number; height: number };
  /** Where the snapshot lands while Workshop is parked (the corner thumbnail). */
  readonly toRect: { left: number; top: number; width: number; height: number };
  /**
   * Lifecycle phase the parent owns:
   *   - `opening`: animate from fromRect → toRect (~700ms)
   *   - `parked`:  hold at toRect, no transition
   *   - `closing`: animate back to fromRect (~700ms)
   *   - `gone`:    component unmounts
   */
  readonly phase: 'opening' | 'parked' | 'closing';
  /** Fires when the opening or closing animation finishes. */
  readonly onPhaseEnd?: (phase: 'opening' | 'closing') => void;
}

/**
 * Cinematic bridge between the studio's main globe and the workshop's
 * corner thumbnail. Captures the main canvas as a static image and
 * animates it across the screen via a single GPU-accelerated transform
 * (translate + scale) — silky on every device, no canvas reflow, no
 * compositor surprises.
 *
 * Why a static image: animating a *live* globe between positions is
 * possible but expensive (renderer reflow, raycaster re-bind, two RAF
 * loops if the main globe stays alive). A frozen frame is identical in
 * appearance for the half-second the animation lasts and lets the main
 * globe instance pause its RAF while the workshop is up.
 */
export function SnapshotBridge({
  src,
  fromRect,
  toRect,
  phase,
  onPhaseEnd,
}: SnapshotBridgeProps) {
  // We render the image at `fromRect` coords + size and animate it to
  // toRect via a single transform. transformOrigin top-left so the
  // translation + scale compose cleanly without offset drift.
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;
  const sx = toRect.width / fromRect.width;
  const sy = toRect.height / fromRect.height;

  const [transform, setTransform] = useState(
    phase === 'parked'
      ? `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`
      : 'translate3d(0, 0, 0) scale(1, 1)',
  );

  // Drive the transform updates via state so the CSS transition has a
  // *change* to react to. Two-frame RAF is the canonical "let the
  // browser commit the initial layout, then animate" pattern.
  useEffect(() => {
    if (phase === 'opening') {
      setTransform('translate3d(0, 0, 0) scale(1, 1)');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransform(`translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`);
        });
      });
    } else if (phase === 'closing') {
      setTransform(`translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransform('translate3d(0, 0, 0) scale(1, 1)');
        });
      });
    } else {
      setTransform(`translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`);
    }
  }, [phase, dx, dy, sx, sy]);

  // Notify parent when the running animation completes — the parent
  // uses this to flip phase forward (`opening` → `parked`,
  // `closing` → unmount the bridge + reveal the live main globe again).
  const onTransitionEnd: React.TransitionEventHandler<HTMLImageElement> = (event) => {
    if (event.propertyName !== 'transform') return;
    if (phase === 'opening') onPhaseEnd?.('opening');
    if (phase === 'closing') onPhaseEnd?.('closing');
  };

  const style: CSSProperties = {
    position: 'fixed',
    left: fromRect.left,
    top: fromRect.top,
    width: fromRect.width,
    height: fromRect.height,
    transformOrigin: 'top left',
    transform,
    transition:
      phase === 'parked'
        ? 'none'
        : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), filter 700ms ease, box-shadow 700ms ease',
    // Subtle filter shift on the move so the snapshot reads as "frozen"
    // rather than "another live view" — slight desaturation while it's
    // in transit, restored at the corner thumbnail.
    filter: phase === 'opening' ? 'saturate(1)' : 'saturate(0.95)',
    boxShadow:
      phase === 'parked'
        ? '0 18px 40px -12px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.06)'
        : '0 0 0 0 rgba(0,0,0,0)',
    borderRadius: phase === 'parked' ? 16 : 0,
    zIndex: 70,
    pointerEvents: 'none',
    objectFit: 'cover',
  };

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onTransitionEnd={onTransitionEnd}
      className={cn('select-none', phase === 'parked' && 'border border-white/[0.08]')}
      style={style}
    />
  );
}

/* ───────────────────────── HELPERS ───────────────────────── */

/**
 * Capture the studio's main globe canvas as a PNG data URL. Returns
 * `null` if the canvas isn't found (e.g. workshop opened before globe
 * mounted). The host element gets a `data-studio-globe-host` attribute
 * via `GlobePreview.tsx` so we can find it without prop-drilling refs
 * through the whole tree.
 */
export function captureMainGlobe(): {
  readonly src: string;
  readonly rect: { left: number; top: number; width: number; height: number };
} | null {
  const host = document.querySelector<HTMLElement>('[data-studio-globe-host]');
  if (!host) return null;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return null;
  let dataURL: string;
  try {
    dataURL = canvas.toDataURL('image/png');
  } catch {
    // Tainted canvas (cross-origin texture) — bail silently. The
    // workshop still opens, just without the snapshot bridge.
    return null;
  }
  const rect = host.getBoundingClientRect();
  return {
    src: dataURL,
    rect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
  };
}

/**
 * The workshop "parked" thumbnail position — top-right corner with
 * 24px gutter. Sized at ~22% of the smaller viewport dimension so it
 * stays prominent on phones and proportional on desktop.
 */
export function workshopThumbnailRect(): {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
} {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = Math.min(220, Math.max(140, Math.min(vw, vh) * 0.18));
  const gutter = 24;
  return {
    left: vw - size - gutter,
    top: gutter + 56, // workshop header eats ~56px
    width: size,
    height: size,
  };
}
