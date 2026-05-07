import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';

export interface StatChipProps {
  readonly icon: IconDefinition;
  readonly value: string;
  readonly label: string;
  readonly className?: string;
}

export function StatChip({ icon, value, label, className }: StatChipProps) {
  return (
    <div className={cn('flex items-center gap-3 px-5', className)}>
      <FontAwesomeIcon icon={icon} className="size-6 text-amber-200" />
      <div>
        <div className="text-2xl font-semibold leading-none text-white">{value}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      </div>
    </div>
  );
}
