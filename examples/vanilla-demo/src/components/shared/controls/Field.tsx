import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { ControlLabel } from './ControlInfo';

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
  readonly info?: ReactNode | undefined;
  readonly value?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

/**
 * Wrapper used by column-shaped controls. Owns the label row (label text,
 * optional info glyph, optional value pill) and the inert state styling.
 */
export function Field({
  label,
  info,
  value,
  children,
  className,
  disabled,
  disabledReason,
}: FieldProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        className,
        disabled ? 'is-disabled' : null
      )}
    >
      <div className="flex min-h-5 items-center justify-between gap-3">
        <ControlLabel
          label={label}
          info={info}
          disabledReason={disabled && disabledReason ? disabledReason : undefined}
        />
        {value ? (
          <div className="shrink-0 rounded-md border border-white/[0.07] bg-white/[0.045] px-2 py-1 font-mono text-[10.5px] leading-none tabular-nums text-slate-200/85">
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
