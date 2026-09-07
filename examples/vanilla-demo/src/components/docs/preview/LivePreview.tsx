import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/sharp-solid-svg-icons';
import type { ArcConfig, GlobeInstance, GlobeKind, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared/components/DecorationGlobe';
import { defaultThemeFor } from '@/components/home/landing/data/kind-themes';
import { useInViewport } from '@/components/home/landing/hooks/use-in-viewport';
import { cn } from '@/lib/utils';

export interface LivePreviewProps {
  readonly kind?: GlobeKind;
  readonly theme?: ThemePresetName;
  readonly caption?: string;
  readonly aspect?: 'square' | 'wide' | 'tall';
  /** Let the reader hover and click countries. Off by default: previews should not fight the page. */
  readonly interactive?: boolean;
  readonly speed?: number;
  readonly initialLat?: number;
  readonly initialLng?: number;
  readonly arcs?: ReadonlyArray<ArcConfig>;
  readonly starfield?: boolean;
  /** Keep the camera at the framed distance. Default true; stories and flights need false. */
  readonly lockZoom?: boolean;
  /**
   * Runs once the globe is ready: load data, markers, a story. Return a
   * cleanup to undo it; it runs before the globe is rebuilt or unmounted.
   */
  readonly setup?: (globe: GlobeInstance) => void | (() => void);
  readonly className?: string;
}

/**
 * A real globe next to the code that produces it. Mounts when it comes near
 * the viewport, pauses when it leaves, renders at low resolution and 30 fps
 * so a page can hold several without hurting scroll.
 */
export function LivePreview({
  kind = 'outline',
  theme,
  caption,
  aspect = 'square',
  interactive = false,
  speed = 0.03,
  initialLat,
  initialLng,
  arcs,
  starfield = false,
  lockZoom = true,
  setup,
  className,
}: LivePreviewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const near = useInViewport(ref, { rootMargin: '200px' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);
  const preset = theme ?? defaultThemeFor(kind);

  const setupRef = useRef(setup);
  setupRef.current = setup;
  const cleanupRef = useRef<(() => void) | void>(undefined);
  const handleReady = useCallback((api: DecorationGlobeReadyApi) => {
    cleanupRef.current?.();
    cleanupRef.current = setupRef.current?.(api.instance);
  }, []);
  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    },
    [],
  );

  return (
    <figure ref={ref} className={cn('docs-preview', className)} data-aspect={aspect}>
      <div className="docs-preview-head">
        <span className="docs-preview-label">
          <span className="docs-live-dot" aria-hidden="true" />
          live · {kind} · {preset}
        </span>
        <Link to="/studio" className="docs-preview-studio">
          Open in Studio
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="size-2.5" />
        </Link>
      </div>
      <div className="docs-preview-stage">
        {mounted ? (
          <DecorationGlobe
            kind={kind}
            theme={preset}
            speed={speed}
            {...(initialLat !== undefined ? { initialLat } : {})}
            {...(initialLng !== undefined ? { initialLng } : {})}
            {...(arcs ? { arcs } : {})}
            starfield={starfield}
            atmosphere
            framingPadding={0.1}
            lockZoom={lockZoom}
            transparent
            interactive={interactive}
            resolution="low"
            maxFps={30}
            paused={!near}
            onReady={handleReady}
            className="absolute inset-0"
          />
        ) : (
          <span className="docs-preview-placeholder" aria-hidden="true" />
        )}
      </div>
      {caption && <figcaption className="docs-preview-caption">{caption}</figcaption>}
    </figure>
  );
}
