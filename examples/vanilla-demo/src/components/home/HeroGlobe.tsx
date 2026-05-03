import { useEffect, useRef } from 'react';
import { createGlobe, type GlobeInstance, type GlobeKind, type ThemePresetName } from '@your-globe/core';

export interface HeroGlobeProps {
  readonly kind?: GlobeKind;
  readonly theme?: ThemePresetName;
  /**
   * Auto-rotate speed (revolutions / sec). Default 0.04 — a slow ambient
   * breath, *not* a turntable spin. Decoration globes that spin too fast
   * fight the rest of the page for attention.
   */
  readonly speed?: number;
  /** Initial camera latitude. Default 12. */
  readonly initialLat?: number;
  /** Initial camera longitude. Default -28 (centred on Atlantic — pretty silhouette). */
  readonly initialLng?: number;
  /** Tilt the rendered globe so the axis reads as "earth-like". Default 23.5. */
  readonly axisTilt?: number;
  readonly className?: string;
  /**
   * Render the starfield as part of the decoration. Costs a bit of
   * paint on slower laptops; default true because the page hero is the
   * highest-impact place for it.
   */
  readonly stars?: boolean;
  /** Show the soft rim atmosphere. Default true. */
  readonly atmosphere?: boolean;
}

/**
 * Decoration-mode wrapper around `createGlobe`. Stripped of country
 * interaction (no raycaster, no event listeners on canvas), no labels,
 * no data layers — just sphere + chosen kind + autorotate. Designed
 * for the homepage hero where the globe is purely atmospheric.
 *
 * Lives on its own `<canvas>` inside the wrapper element. `pointer-events:none`
 * is set at the host level so it never steals clicks from siblings (CTAs,
 * scroll, etc.).
 */
export function HeroGlobe({
  kind = 'dotted',
  theme = 'dotted-dark',
  speed = 0.04,
  initialLat = 12,
  initialLng = -28,
  axisTilt = 23.5,
  className,
  stars = true,
  atmosphere = true,
}: HeroGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const globe = createGlobe({
      container,
      kind,
      theme,
      // Transparent canvas — the homepage gradient + aurora bleed through
      // instead of being clipped by the theme's solid background colour.
      transparent: true,
      // Framing: pull the camera back so the atmosphere halo has room to
      // fade out before hitting the canvas edge (no more "globe in a
      // square" clipping). Lock zoom so this stays composed regardless
      // of accidental scroll-wheel input.
      framing: { padding: 0.18, lockZoom: true },
      countries: { hoverEnabled: false },
      autoRotate: { enabled: true, speed },
      atmosphere: { enabled: atmosphere },
      starfield: {
        enabled: stars,
        twinkle: { enabled: true, intensity: 0.5, speed: 0.5 },
        sizeVariety: 0.65,
        palette: ['#ffffff', '#ffe9c4', '#c4d8ff'],
      },
      focusPulse: { enabled: false },
      axisTilt,
      initialPosition: [initialLat, initialLng],
      performance: {
        antialias: true,
        adaptiveQuality: true,
        maxFps: 60,
      },
    });
    instanceRef.current = globe;
    globe.mount();

    return () => {
      globe.destroy();
      if (instanceRef.current === globe) instanceRef.current = null;
    };
  }, [kind, theme, speed, initialLat, initialLng, axisTilt, stars, atmosphere]);

  return (
    <div
      ref={containerRef}
      className={className}
      // Decoration only — never absorb pointer events meant for buttons.
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
}
