import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faFlask, faGaugeHigh, faLightbulb, faTriangleExclamation } from '@fortawesome/sharp-solid-svg-icons';
import { cn } from '@/lib/utils';

export type CalloutTone = 'note' | 'tip' | 'warning' | 'perf' | 'experimental';

const ICON = {
  note: faCircleInfo,
  tip: faLightbulb,
  warning: faTriangleExclamation,
  perf: faGaugeHigh,
  experimental: faFlask,
} as const;

const LABEL: Readonly<Record<CalloutTone, string>> = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Watch out',
  perf: 'Performance',
  experimental: 'Experimental',
};

export interface CalloutProps {
  readonly tone?: CalloutTone;
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** An aside that interrupts the prose on purpose: a caveat, a shortcut, a cost. */
export function Callout({ tone = 'note', title, children, className }: CalloutProps) {
  return (
    <aside className={cn('docs-callout', className)} data-tone={tone} role={tone === 'warning' ? 'alert' : undefined}>
      <FontAwesomeIcon icon={ICON[tone]} className="docs-callout-icon size-3.5" />
      <div>
        <strong className="docs-callout-title">{title ?? LABEL[tone]}</strong>
        <div className="docs-callout-body">{children}</div>
      </div>
    </aside>
  );
}
