import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartArea,
  faRadar,
  faNewspaper,
  faBookOpen,
  faFilm,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';

const USE_CASES: ReadonlyArray<readonly [IconDefinition, string]> = [
  [faChartArea, 'Dashboards'],
  [faRadar, 'Command Centers'],
  [faNewspaper, 'Editorial'],
  [faBookOpen, 'Education'],
  [faFilm, 'Storytelling'],
];

export interface UseCaseChipsProps {
  readonly variant?: 'compact' | 'expanded';
  readonly className?: string;
}

/**
 * The five honest use-cases for a globe component, replacing the fake
 * trust-mark logos that used to live here. `compact` is the inline pill
 * style for ApiSection; `expanded` is the larger card-feel for FinalCta.
 */
export function UseCaseChips({ variant = 'compact', className }: UseCaseChipsProps) {
  const expanded = variant === 'expanded';
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {USE_CASES.map(([icon, label]) => (
        <span
          key={label}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.035] backdrop-blur-md transition-colors hover:border-white/25',
            expanded
              ? 'px-4 py-2.5 text-sm text-slate-200'
              : 'px-3 py-1.5 text-xs text-slate-300',
          )}
        >
          <FontAwesomeIcon
            icon={icon}
            className={cn('text-amber-200', expanded ? 'size-4' : 'size-3.5')}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
