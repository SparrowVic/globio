import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { DisableProps } from './Field';

export interface SwitchFieldProps extends DisableProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  /** Optional descriptive text rendered under the label (e.g. "60 FPS target"). */
  readonly value?: ReactNode | undefined;
}

/**
 * Toggle switch with a label + optional sublabel. Diverges from `Field`
 * because the layout is row-shaped rather than column-shaped (label on
 * the left, switch on the right).
 */
export function SwitchField({
  label,
  checked,
  onChange,
  value,
  disabled,
  disabledReason,
}: SwitchFieldProps) {
  return (
    <div
      className={cn(
        'flex min-h-8 items-center justify-between gap-3 rounded-md border border-white/8 bg-white/[0.025] px-3 py-2',
        disabled ? 'pointer-events-none opacity-50' : null,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Label className="block truncate text-sm text-slate-100">{label}</Label>
          {disabled && disabledReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="pointer-events-auto flex size-3.5 cursor-help items-center justify-center rounded-full text-amber-200/90"
                  aria-label="Why is this disabled?"
                  role="img"
                >
                  <Info className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4} className="max-w-[240px] text-xs">
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {value ? <div className="mt-0.5 text-xs text-slate-400">{value}</div> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="data-checked:bg-amber-300" />
    </div>
  );
}
