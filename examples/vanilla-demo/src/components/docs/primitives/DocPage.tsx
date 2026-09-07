import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DocPageProps {
  readonly title: ReactNode;
  /** Config path or API call this page documents, e.g. `autoRotate`. */
  readonly eyebrow?: string;
  readonly lead?: ReactNode;
  /** Breadcrumb trail above the title: tab and group labels. */
  readonly crumbs?: ReadonlyArray<string>;
  /** Pills under the lead: kinds, version, status. */
  readonly meta?: ReactNode;
  /** Accent colour for the eyebrow and anchors — kind pages use their swatch. */
  readonly accent?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Root of every documentation page: breadcrumb, config-path eyebrow, a
 * display title, the lead paragraph and meta pills, then the prose body.
 */
export function DocPage({ title, eyebrow, lead, crumbs, meta, accent, children, className }: DocPageProps) {
  const style = accent ? ({ '--page-accent': accent } as CSSProperties) : undefined;
  return (
    <article className={cn('docs-article', className)} style={style}>
      <header className="docs-page-head">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="docs-crumbs">
            {crumbs.map((c, i) => (
              <span key={c}>
                {i > 0 && <span aria-hidden="true" className="docs-crumb-sep">/</span>}
                {c}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <span className="docs-eyebrow">{eyebrow}</span>}
        <h1 className="docs-title">{title}</h1>
        {lead && <p className="docs-lead">{lead}</p>}
        {meta && <div className="docs-meta">{meta}</div>}
      </header>
      <div className="docs-prose">{children}</div>
    </article>
  );
}
