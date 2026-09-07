import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GlobeKind } from '@your-globe/core';
import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { pageHref } from '@/docs/manifest';
import { cn } from '@/lib/utils';

export type PillTone = 'neutral' | 'accent' | 'ember' | 'mint' | 'lavender' | 'gold';

export interface PillProps {
  readonly tone?: PillTone;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title?: string;
}

/** Small mono label: a version, a status, a kind. */
export function Pill({ tone = 'neutral', children, className, title }: PillProps) {
  return (
    <span className={cn('docs-pill', className)} data-tone={tone} title={title}>
      {children}
    </span>
  );
}

/** The kind's identifying swatch (its first theme's accent). */
export function KindDot({ kind, className }: { readonly kind: GlobeKind; readonly className?: string }) {
  const swatch = KIND_THEMES[kind][0]?.swatch ?? '#8a94a6';
  return <span aria-hidden="true" className={cn('docs-kind-dot', className)} style={{ background: swatch }} />;
}

export const kindLabel = (kind: GlobeKind): string => KIND_CHAPTERS.find((c) => c.kind === kind)?.title ?? kind;

export const ALL_KINDS: ReadonlyArray<GlobeKind> = KIND_CHAPTERS.map((c) => c.kind);

export interface KindBadgesProps {
  /** Which kinds support the feature; `'all'` renders one pill. */
  readonly kinds: ReadonlyArray<GlobeKind> | 'all';
  readonly className?: string;
}

/** "Works with" pills, each linking to the kind's page. */
export function KindBadges({ kinds, className }: KindBadgesProps) {
  if (kinds === 'all') {
    return (
      <span className={cn('docs-pill', className)} data-tone="neutral">
        all kinds
      </span>
    );
  }
  return (
    <span className={cn('inline-flex flex-wrap gap-1.5', className)}>
      {kinds.map((k) => (
        <Link key={k} to={pageHref(`kinds/${k}`)} className="docs-pill docs-pill-link" data-tone="neutral">
          <KindDot kind={k} />
          {kindLabel(k)}
        </Link>
      ))}
    </span>
  );
}
