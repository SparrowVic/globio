import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Common shape every Field component understands. `disabled` switches the
 * underlying control inert (pointer-events: none, opacity 50%); when paired
 * with `disabledReason`, an info icon appears next to the label so users
 * can hover for the prerequisite explanation.
 */
export interface DisableProps {
  readonly disabled?: boolean | undefined;
  readonly disabledReason?: string | undefined;
}

export interface FieldProps extends DisableProps {
  readonly label: string;
  readonly value?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

/**
 * Wrapper used by every other control in this folder. Owns the label
 * row (label text + optional value pill on the right + the disabled-
 * reason tooltip glyph) and the inert state styling. Keep it thin so
 * specialised controls (SwitchField below) can opt out and roll their
 * own row when the default doesn't fit.
 */
export function Field({
  label,
  value,
  children,
  className,
  disabled,
  disabledReason,
}: FieldProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        className,
        disabled ? 'is-disabled' : null
      )}
    >
      <div className="flex min-h-4 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Label className="text-[11px] font-medium leading-none text-slate-400">
            {label}
          </Label>
          {disabled && disabledReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="flex size-3.5 cursor-help items-center justify-center rounded-full text-amber-200/90"
                  aria-label="Why is this disabled?"
                  role="img"
                >
                  <Info className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={4}
                className="max-w-[240px] text-xs"
              >
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {value ? (
          <div className="shrink-0 rounded border border-white/[0.06] bg-white/[0.035] px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums text-slate-200/80">
            {value}
          </div>
        ) : null}
      </div>
      <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>
        {children}
      </div>
    </div>
  );
}
