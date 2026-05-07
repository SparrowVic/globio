import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { Field, type DisableProps, type SelectOption } from './Field';

export interface ToggleFieldProps<T extends string> extends DisableProps {
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
}: ToggleFieldProps<T>) {
  return (
    <Field
      label={label}
      className={className}
      disabled={disabled}
      disabledReason={disabledReason}
    >
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as T);
        }}
        variant="outline"
        size="sm"
        className="flex w-full flex-wrap rounded-lg border border-white/[0.06] bg-black/[0.14] p-0.5"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="min-w-14 flex-1 rounded-md border-transparent px-2 text-[10.5px] text-slate-400 data-active:border-amber-300/40 data-active:bg-amber-300/15 data-active:text-amber-100"
          >
            <span className="truncate">{option.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
