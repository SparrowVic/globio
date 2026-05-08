import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Field, type DisableProps, type SelectOption } from './Field';

export interface SelectFieldProps<T extends string> extends DisableProps {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<SelectOption<T>>;
  readonly onChange: (value: T) => void;
  readonly className?: string | undefined;
}

/** Single-select dropdown inside a `Field`. Use for short option lists. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
  disabledReason,
}: SelectFieldProps<T>) {
  return (
    <Field
      label={label}
      className={className}
      disabled={disabled}
      disabledReason={disabledReason}
    >
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="h-8 w-full rounded-lg border-white/[0.09] bg-black/[0.18] px-3 text-[12px] font-medium text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100 backdrop-blur-xl">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
