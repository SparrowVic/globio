import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import type { FeatureProps } from './ControlInfo';
import { Field, type DisableProps, type SelectOption } from './Field';

export interface ToggleFieldProps<T extends string> extends DisableProps, FeatureProps {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<SelectOption<T>>;
  readonly onChange: (value: T) => void;
  readonly className?: string | undefined;
}

/**
 * Segmented control — the "make-the-options-visible" alternative to a
 * Select when the option list is short (≤4 items typically). Active state
 * uses the demo's amber accent so it reads as the highlighted choice.
 */
export function ToggleField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
  disabledReason,
  feature,
  configPath,
}: ToggleFieldProps<T>) {
  return (
    <Field
      label={label}
      className={className}
      disabled={disabled}
      disabledReason={disabledReason}
      feature={feature}
      configPath={configPath}
    >
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as T);
        }}
        variant="outline"
        size="default"
        className="flex w-full flex-wrap rounded-lg border border-white/[0.075] bg-black/[0.16] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="min-w-16 flex-1 rounded-md border-transparent px-2.5 text-[11.5px] font-medium text-slate-400 data-active:border-amber-300/45 data-active:bg-amber-300/16 data-active:text-amber-100"
          >
            <span className="truncate">{option.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
