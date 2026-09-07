import type { ReactNode } from 'react';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import { ControlLabel, type FeatureProps } from './ControlInfo';
import type { DisableProps } from './Field';

export interface SwitchFieldProps extends DisableProps, FeatureProps {
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
  feature,
  configPath,
  typePath,
}: SwitchFieldProps) {
  return (
    <div
      className={cn(
        'flex min-h-8 items-center justify-between gap-4 px-0.5 py-1.5',
        disabled ? 'opacity-50' : null
      )}
    >
      <ControlLabel
        label={label}
        info={info ?? value}
        feature={feature}
        configPath={configPath} typePath={typePath}
        disabledReason={disabled && disabledReason ? disabledReason : undefined}
      />
      <Switch
        aria-label={label}
        size="default"
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-checked:bg-amber-300 data-unchecked:bg-white/[0.11] [&_[data-slot=switch-thumb]]:shadow-[0_0_10px_rgba(255,255,255,0.18)]"
      />
    </div>
  );
}
