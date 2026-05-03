import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { usePanelState } from '@/hooks/usePanelState';

/**
 * One accordion item inside a `<Panel>`. Header is always visible (icon +
 * title + optional `meta` hint + chevron); body collapses with a CSS
 * `grid-template-rows` trick so the height transition is smooth without
 * us having to measure content height in JS.
 *
 * Use `hidden` (not collapsed) when the section as a whole is irrelevant
 * to the current state (e.g. dome controls when surfaceMode !== 'country').
 * `hidden` removes from the DOM; `defaultOpen=false` just collapses.
 */
export interface PanelSectionProps {
  readonly id: string;
  readonly title: string;
  readonly icon?: ReactNode;
  readonly meta?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly hidden?: boolean;
  readonly children: ReactNode;
}

export function PanelSection({
  id,
  title,
  icon,
  meta,
  defaultOpen = false,
  hidden = false,
  children,
}: PanelSectionProps) {
  // Collapsed=false means OPEN; we invert so localStorage stores the
  // user-meaningful state (true = open).
  const [open, setOpen] = usePanelState(`section-${id}`, defaultOpen);
  if (hidden) return null;
  return (
    <section className="panel-section" data-section-id={id} data-open={open}>
      <button
        type="button"
        className="panel-section-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {icon ? <span className="panel-section-icon">{icon}</span> : null}
        <span className="panel-section-title">{title}</span>
        {meta ? <span className="panel-section-meta">{meta}</span> : null}
        <ChevronDown
          className={cn('panel-section-chevron size-3.5', open ? '' : '-rotate-90')}
        />
      </button>
      <div className="panel-section-body" aria-hidden={!open}>
        <div className="panel-section-body-inner">{children}</div>
      </div>
    </section>
  );
}
