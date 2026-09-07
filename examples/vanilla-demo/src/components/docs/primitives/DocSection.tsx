import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTocEntry } from '../layout/toc-context';
import { AnchorLink } from './AnchorLink';
import { slugify } from './heading-utils';

export interface DocSectionProps {
  readonly title: string;
  /** Stable anchor id; derived from the title when omitted. */
  readonly id?: string;
  /** Config path shown in mono above the heading, e.g. `countries.resolution`. */
  readonly eyebrow?: string;
  readonly lead?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
}

/** A top-level section (h2). Registers itself in the page outline. */
export function DocSection({ title, id, eyebrow, lead, children, className }: DocSectionProps) {
  const sid = id ?? slugify(title);
  useTocEntry({ id: sid, title, level: 2 });
  return (
    <section id={sid} className={cn('docs-section', className)}>
      {eyebrow && <span className="docs-eyebrow docs-eyebrow-sm">{eyebrow}</span>}
      <h2 className="docs-h2">
        {title}
        <AnchorLink id={sid} title={title} />
      </h2>
      {lead && <p className="docs-section-lead">{lead}</p>}
      {children}
    </section>
  );
}

export interface DocSubsectionProps {
  readonly title: string;
  readonly id?: string;
  readonly children?: ReactNode;
  readonly className?: string;
}

/** A nested section (h3) inside a DocSection. Also appears in the outline, indented. */
export function DocSubsection({ title, id, children, className }: DocSubsectionProps) {
  const sid = id ?? slugify(title);
  useTocEntry({ id: sid, title, level: 3 });
  return (
    <section id={sid} className={cn('docs-subsection', className)}>
      <h3 className="docs-h3">
        {title}
        <AnchorLink id={sid} title={title} />
      </h3>
      {children}
    </section>
  );
}
