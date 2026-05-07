import type { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleSmall } from '@fortawesome/sharp-duotone-solid-svg-icons';

import type { ConfiguratorState } from '@/configurator/types';
import { cn } from '@/lib/utils';

import {
  studioNavGroups,
  type StudioInspectorId,
  type StudioNavItem,
} from './studio-inspector-model';

export interface StagePanelProps {
  readonly state: ConfiguratorState;
  readonly active: StudioInspectorId;
  readonly onSelect: (id: StudioInspectorId) => void;
}

export function StagePanel({ state, active, onSelect }: StagePanelProps) {
  return (
    <nav className="studio-rail" aria-label="Studio controls">
      {studioNavGroups.map((group) => (
        <div key={group.id} className="studio-rail-group">
          <div className="studio-rail-group-label">{group.label}</div>
          <div className="studio-rail-list">
            {group.items.map((item) => (
              <StudioRailItem
                key={item.id}
                item={item}
                active={active === item.id}
                status={item.status(state)}
                onSelect={() => onSelect(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function StudioRailItem({
  item,
  active,
  status,
  onSelect,
}: {
  readonly item: StudioNavItem;
  readonly active: boolean;
  readonly status: string;
  readonly onSelect: () => void;
}) {
  const style = {
    '--studio-accent': item.accent,
    ...(active
      ? {
          borderColor: `${item.accent}55`,
          background: `linear-gradient(135deg, ${item.accent}1f, rgba(255,255,255,0.045))`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -14px ${item.accent}`,
        }
      : undefined),
  } as CSSProperties;

  return (
    <button
      type="button"
      className={cn('studio-rail-item', active && 'is-active')}
      style={style}
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
    >
      <span className="studio-rail-icon">
        <FontAwesomeIcon icon={item.icon} className="size-3" />
      </span>
      <span className="studio-rail-copy">
        <span className="studio-rail-name">{item.label}</span>
        <span className="studio-rail-desc">{item.description}</span>
      </span>
      <span className="studio-rail-status">
        <FontAwesomeIcon icon={faCircleSmall} className="size-1.5" />
        <span>{status}</span>
      </span>
    </button>
  );
}
