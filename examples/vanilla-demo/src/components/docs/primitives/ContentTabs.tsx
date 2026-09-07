import { useState, type ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cn } from '@/lib/utils';

export interface ContentTab {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconDefinition;
  readonly content: ReactNode;
}

export interface ContentTabsProps {
  readonly tabs: ReadonlyArray<ContentTab>;
  readonly defaultId?: string;
  readonly label?: string;
  readonly className?: string;
}

/** Generic switchable content (package managers, before/after, variants). Code uses CodePanel instead. */
export function ContentTabs({ tabs, defaultId, label = 'Options', className }: ContentTabsProps) {
  const [activeId, setActiveId] = useState(defaultId ?? tabs[0]?.id ?? '');
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  if (!active) return null;
  return (
    <div className={cn('docs-tabs', className)}>
      <div role="tablist" aria-label={label} className="docs-seg docs-seg-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active.id}
            onClick={() => setActiveId(t.id)}
            className={cn('docs-seg-item', t.id === active.id && 'is-active')}
          >
            {t.icon && <FontAwesomeIcon icon={t.icon} className="size-3" />}
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="docs-tabs-panel">
        {active.content}
      </div>
    </div>
  );
}
