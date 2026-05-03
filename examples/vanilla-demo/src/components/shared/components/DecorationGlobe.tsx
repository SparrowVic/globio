import { useEffect, useRef } from 'react';
import {
  createGlobe,
  type GlobeInstance,
  type GlobeKind,
  type StarfieldConfig,
  type ThemePresetName,
} from '@your-globe/core';

export interface DecorationGlobeProps {
  readonly kind?: GlobeKind;
  readonly theme?: ThemePresetName;
  /**
   * Auto-rotate speed (revolutions per second). Default 0.04 — a slow
   * ambient breath, *not* a turntable spin. Decoration globes that spin
   * too fast fight the rest of the page for attention.
   */
  readonly speed?: number;
  /** Initial camera latitude. Default 12. */
  readonly initialLat?: number;
  /** Initial camera longitude. Default -28 (Atlantic — pretty silhouette). */
  readonly initialLng?: number;
  /** Earth-like axis tilt in degrees. Default 23.5. */
  readonly axisTilt?: number;
  readonly className?: string;
  /**
   * Render the starfield. Default true. Pass an object instead of `true` to
   * fully customise (palette, twinkle, sizeVariety, density). When `false`,
   * the starfield layer isn't created at all.
   */
  readonly starfield?: boolean | StarfieldConfig;
  /** Show the soft rim atmosphere. Default true. */
  readonly atmosphere?: boolean;
  /**
   * Reserve a fraction of the viewport as margin around the globe so the
   * atmosphere halo has room to fade. 0..0.5. Default 0.18 — chosen for
   * decoration use; tighten for thumbnail use, loosen for hero.
   */
  readonly framingPadding?: number;
  /**
   * Lock zoom to the framed distance — user can't scroll-zoom past the
   * composition. Default true (decoration semantics).
   */
  readonly lockZoom?: boolean;
  /**
   * Transparent canvas. Default true so the host page background bleeds
   * through. Pass `false` if you want the theme's `background.color` to
   * fill the canvas (e.g. to mimic the studio look).
   */
  readonly transparent?: boolean;
  /**
   * When false (default), country hover and click are disabled — the
   * canvas explicitly opts out of pointer events so siblings (CTAs,
   * scroll, etc.) get them. Set `true` to make the decoration interactive
   * (still no data layers / focus pulse though — those stay off).
   */
  readonly interactive?: boolean;
}

const STARFIELD_DEFAULTS: StarfieldConfig = {
  enabled: true,
  twinkle: { enabled: true, intensity: 0.5, speed: 0.5 },
  sizeVariety: 0.65,
  palette: ['#ffffff', '#ffe9c4', '#c4d8ff'],
};

/**
 * Decoration-mode wrapper around `createGlobe`. Stripped of country
 * interaction (no raycaster, no event listeners on canvas), no labels,
 * no data layers — just sphere + chosen kind + autorotate. Designed
 * for hero areas, card thumbnails, and any future "globe-as-decoration"
 * use case.
 *
 * Re-creates the underlying globe whenever any prop in the deps array
 * below changes — most knobs are wired through the initial `createGlobe`
 * call rather than a runtime `update()`, so a fresh instance is the
 * cleanest way to apply them.
 */
export function DecorationGlobe({
  kind = 'dotted',
  theme = 'dotted-dark',
  speed = 0.04,
  initialLat = 12,
  initialLng = -28,
  axisTilt = 23.5,
  className,
  starfield = true,
  atmosphere = true,
  framingPadding = 0.18,
  lockZoom = true,
  transparent = true,
  interactive = false,
}: DecorationGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Resolve the starfield config — boolean shorthand maps to defaults.
    const resolvedStarfield: StarfieldConfig =
      starfield === false
        ? { enabled: false }
        : starfield === true
          ? STARFIELD_DEFAULTS
          : { ...STARFIELD_DEFAULTS, ...starfield };

    const globe = createGlobe({
      container,
      kind,
      theme,
      transparent,
      framing: { padding: framingPadding, lockZoom },
      countries: { hoverEnabled: interactive },
      autoRotate: { enabled: true, speed },
      atmosphere: { enabled: atmosphere },
      starfield: resolvedStarfield,
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
  }, [
    kind,
    theme,
    speed,
    initialLat,
    initialLng,
    axisTilt,
    starfield,
    atmosphere,
    framingPadding,
    lockZoom,
    transparent,
    interactive,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      // Decoration: never absorb pointer events meant for buttons / scroll
      // sitting visually on top. Caller can override by setting
      // `interactive: true` and styling the wrapper themselves.
      style={interactive ? undefined : { pointerEvents: 'none' }}
      aria-hidden={interactive ? undefined : 'true'}
    />
  );
}
