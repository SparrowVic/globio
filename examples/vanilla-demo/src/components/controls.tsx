import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
interface DisableProps {
  readonly disabled?: boolean | undefined;
  readonly disabledReason?: string | undefined;
}

export function Field({
  label,
  value,
  children,
  className,
  disabled,
  disabledReason,
}: {
  readonly label: string;
  readonly value?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string | undefined;
} & DisableProps) {
  return (
    <div className={cn('space-y-2', className, disabled ? 'is-disabled' : null)}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Label className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-300/80">
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
              <TooltipContent side="top" sideOffset={4} className="max-w-[240px] text-xs">
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {value ? <div className="shrink-0 text-xs tabular-nums text-slate-100/75">{value}</div> : null}
      </div>
      <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>{children}</div>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
  disabledReason,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<SelectOption<T>>;
  readonly onChange: (value: T) => void;
  readonly className?: string | undefined;
} & DisableProps) {
  return (
    <Field label={label} className={className} disabled={disabled} disabledReason={disabledReason}>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="h-8 w-full border-white/10 bg-white/[0.04] text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
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

export function ToggleField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
  disabledReason,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<SelectOption<T>>;
  readonly onChange: (value: T) => void;
  readonly className?: string | undefined;
} & DisableProps) {
  return (
    <Field label={label} className={className} disabled={disabled} disabledReason={disabledReason}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as T);
        }}
        variant="outline"
        size="sm"
        className="flex w-full flex-wrap rounded-lg bg-white/[0.03]"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="min-w-14 flex-1 border-white/10 px-2 text-xs text-slate-200 data-active:border-amber-300/80 data-active:bg-amber-300/15 data-active:text-amber-200"
          >
            <span className="truncate">{option.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (input) => input.toFixed(2),
  className,
  disabled,
  disabledReason,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  readonly format?: (value: number) => string;
  readonly className?: string | undefined;
} & DisableProps) {
  return (
    <Field
      label={label}
      value={format(value)}
      className={className}
      disabled={disabled}
      disabledReason={disabledReason}
    >
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0] ?? value)}
        className="[&_[data-slot=slider-range]]:bg-amber-300 [&_[data-slot=slider-thumb]]:border-amber-200 [&_[data-slot=slider-thumb]]:bg-amber-100"
      />
    </Field>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  value,
  disabled,
  disabledReason,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly value?: ReactNode | undefined;
} & DisableProps) {
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
