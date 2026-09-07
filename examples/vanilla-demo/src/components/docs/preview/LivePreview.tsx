import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared/components/DecorationGlobe';
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
  readonly className?: string;
}

/**
 * A real globe next to the code that produces it. Mounts when it comes near
 * the viewport, pauses when it leaves, renders at low resolution and 30 fps
 * so a page can hold several without hurting scroll.
 */
export function LivePreview({ kind = 'outline', theme, caption, aspect = 'square', interactive = false, speed = 0.03, className }: LivePreviewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const near = useInViewport(ref, { rootMargin: '200px' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);
  const preset = theme ?? defaultThemeFor(kind);

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
            starfield={false}
            atmosphere
            framingPadding={0.1}
            transparent
            interactive={interactive}
            resolution="low"
            maxFps={30}
            paused={!near}
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
