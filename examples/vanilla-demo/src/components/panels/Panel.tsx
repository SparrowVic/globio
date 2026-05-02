import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePanelState } from '@/hooks/usePanelState';

export type PanelPosition = 'left' | 'right' | 'top' | 'bottom' | 'bottom-right' | 'bottom-left';

/**
 * Floating glassmorphism container hosting one or more `<PanelSection>`s.
 *
 * Behaviours:
 *  - Title row with icon, title text, optional `badge` (small kicker),
 *    chevron toggle that collapses the panel to a 36×36 icon button at
 *    the same anchor — clicking it expands back.
 *  - Body scrolls when content exceeds `maxHeightFraction × viewport`.
 *  - Collapse state persists in localStorage via `usePanelState`.
 *  - Position-driven CSS class picks the floating anchor (top/left/etc.).
 *
 * Visual tokens come from the `.panel-surface` / `.panel-collapsed-icon`
 * classes in `index.css` so kind / theme variants can re-skin without
 * touching React.
 */
export interface PanelProps {
  readonly id: string;
  readonly position: PanelPosition;
  readonly title: string;
  readonly icon?: ReactNode;
  /** Small text (kind / status / count) shown right of the title. */
  readonly badge?: ReactNode;
  /** Initial expanded state. Default `true`. Persisted afterward. */
  readonly defaultCollapsed?: boolean;
  /** Width when expanded. Default `'auto'` — falls back to CSS class. */
  readonly width?: number | 'auto';
  /**
   * Cap body height as fraction of viewport (0..1). Omit to use the CSS
   * default (`100dvh - 116px` — full available space minus top bar +
   * status dock + gaps). Pass a smaller value to constrain a panel that
   * shouldn't dominate the viewport (e.g. on tall screens).
   */
  readonly maxHeightFraction?: number;
  readonly children: ReactNode;
  readonly className?: string;
}

const positionClass: Record<PanelPosition, string> = {
  left: 'panel-left',
  right: 'panel-right',
  top: 'panel-top',
  bottom: 'panel-bottom',
  'bottom-left': 'panel-bottom-left',
  'bottom-right': 'panel-bottom-right',
};

export function Panel({
  id,
  position,
  title,
  icon,
  badge,
  defaultCollapsed = false,
  width,
  maxHeightFraction,
  children,
  className,
}: PanelProps) {
  const [collapsed, setCollapsed] = usePanelState(`panel-${id}`, defaultCollapsed);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Expand ${title}`}
            onClick={() => setCollapsed(false)}
            className={cn('panel-collapsed-icon', positionClass[position], className)}
          >
            {icon ?? <ChevronRight className="size-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{title}</TooltipContent>
      </Tooltip>
    );
  }

  // Build inline style: width override (when given) + max-height override
  // (only when caller passed maxHeightFraction; otherwise CSS rule wins).
  const style: Record<string, string> = {};
  if (typeof width === 'number') style['width'] = `${width}px`;
  if (typeof maxHeightFraction === 'number') {
    style['maxHeight'] = `calc(${(maxHeightFraction * 100).toFixed(0)}dvh)`;
  }

  return (
    <aside
      className={cn('panel-surface', positionClass[position], className)}
      style={style}
      data-panel-id={id}
    >
      <header className="panel-header">
        <div className="panel-title-row">
          {icon ? <span className="panel-title-icon">{icon}</span> : null}
          <span className="panel-title-text">{title}</span>
          {badge ? <span className="panel-title-badge">{badge}</span> : null}
        </div>
        <button
          type="button"
          aria-label={`Collapse ${title}`}
          onClick={() => setCollapsed(true)}
          className="panel-collapse-btn"
        >
          {position === 'right' || position === 'bottom-right' ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </aside>
  );
}
