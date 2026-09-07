import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeadingProps {
  /** The config path or API call this section demonstrates, e.g. `kind: 'dotted'`. */
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly lead?: ReactNode;
  readonly className?: string;
  readonly titleClassName?: string;
  readonly leadClassName?: string;
}

/**
 * Eyebrow + display headline + optional lead, revealed on scroll in three
 * staggered steps. Every section opens with this so the rhythm stays the
 * same down the page.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
  titleClassName,
  leadClassName,
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <span className="eyebrow reveal">{eyebrow}</span>
      <h2 className={cn('t-h2 reveal reveal-d1 mt-5', titleClassName)}>{title}</h2>
      {lead !== undefined && (
        <p className={cn('t-lead reveal reveal-d2 mt-5', leadClassName)}>{lead}</p>
      )}
    </div>
  );
}
