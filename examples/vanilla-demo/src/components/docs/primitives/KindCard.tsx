import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind } from '@your-globe/core';
import { pageHref } from '@/docs/manifest';
import { cn } from '@/lib/utils';
import { KindDot } from './Pill';

export interface KindCardProps {
  readonly kind: GlobeKind;
  readonly title: string;
  readonly description?: string;
  readonly className?: string;
}

/** Path of a kind's thumbnail, rendered by the snapshots page and saved under public/docs/kinds. */
export const kindThumbnail = (kind: GlobeKind): string => `/docs/kinds/${kind}.jpg`;

/**
 * A card with the kind's snapshot on top. The image is a build-time
 * capture, not a live globe, so a grid of six costs nothing to scroll.
 */
export function KindCard({ kind, title, description, className }: KindCardProps) {
  const [broken, setBroken] = useState(false);
  return (
    <Link to={pageHref(`kinds/${kind}`)} className={cn('docs-kind-card', className)}>
      <span className="docs-kind-card-media" aria-hidden="true">
        {!broken && <img src={kindThumbnail(kind)} alt="" loading="lazy" onError={() => setBroken(true)} />}
      </span>
      <span className="docs-kind-card-body">
        <span className="docs-card-eyebrow">
          <KindDot kind={kind} /> kind: '{kind}'
        </span>
        <span className="docs-card-title">{title}</span>
        {description && <span className="docs-card-desc">{description}</span>}
      </span>
      <FontAwesomeIcon icon={faArrowRight} className="docs-card-arrow size-3" />
    </Link>
  );
}
