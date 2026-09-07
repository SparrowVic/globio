import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowUpRightFromSquare } from '@fortawesome/sharp-solid-svg-icons';
import { cn } from '@/lib/utils';

export interface LinkCardProps {
  readonly to: string;
  readonly title: string;
  readonly description?: ReactNode;
  /** Mono line above the title, e.g. a config path. */
  readonly eyebrow?: string;
  readonly icon?: IconDefinition;
  /** Custom leading visual (a kind dot, a swatch row). Wins over `icon`. */
  readonly leading?: ReactNode;
  readonly external?: boolean;
  /** `stack` puts the icon above the title — for three- and four-column grids. */
  readonly layout?: 'row' | 'stack';
  readonly className?: string;
}

/** A card that is entirely a link. Used for overviews and "next steps". */
export function LinkCard({ to, title, description, eyebrow, icon, leading, external, layout = 'row', className }: LinkCardProps) {
  const body = (
    <>
      {(leading || icon) && (
        <span className="docs-card-lead">{leading ?? (icon && <FontAwesomeIcon icon={icon} className="size-4" />)}</span>
      )}
      <span className="min-w-0 flex-1">
        {eyebrow && <span className="docs-card-eyebrow">{eyebrow}</span>}
        <span className="docs-card-title">{title}</span>
        {description && <span className="docs-card-desc">{description}</span>}
      </span>
      <FontAwesomeIcon icon={external ? faArrowUpRightFromSquare : faArrowRight} className="docs-card-arrow size-3" />
    </>
  );
  const cls = cn('docs-card', className);
  return external ? (
    <a href={to} target="_blank" rel="noreferrer" className={cls} data-layout={layout}>
      {body}
    </a>
  ) : (
    <Link to={to} className={cls} data-layout={layout}>
      {body}
    </Link>
  );
}

export interface CardGridProps {
  readonly columns?: 2 | 3 | 4;
  readonly children: ReactNode;
  readonly className?: string;
}

export function CardGrid({ columns = 2, children, className }: CardGridProps) {
  return (
    <div className={cn('docs-grid', className)} data-columns={columns}>
      {children}
    </div>
  );
}
