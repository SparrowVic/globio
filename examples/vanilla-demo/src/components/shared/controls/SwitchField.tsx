import type { ReactNode } from 'react';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import { ControlLabel } from './ControlInfo';
import type { DisableProps } from './Field';

export interface SwitchFieldProps extends DisableProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  /** Optional explanatory text shown from the info icon next to the label. */
  readonly value?: ReactNode | undefined;
  readonly info?: ReactNode | undefined;
}

/**
 * Row-shaped toggle switch: label + optional info icon on the left,
 * switch on the right.
 */
export function SwitchField({
  label,
  checked,
  onChange,
  value,
  info,
  disabled,
  disabledReason,
}: SwitchFieldProps) {
  return (
    <div
      className={cn(
        'flex min-h-7 items-center justify-between gap-3 px-0.5 py-1',
        disabled ? 'opacity-50' : null
      )}
    >
      <ControlLabel
        label={label}
        info={info ?? value}
        disabledReason={disabled && disabledReason ? disabledReason : undefined}
      />
      <Switch
        size="sm"
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-checked:bg-emerald-400 data-unchecked:bg-white/[0.10]"
      />
    </div>
  );
}
