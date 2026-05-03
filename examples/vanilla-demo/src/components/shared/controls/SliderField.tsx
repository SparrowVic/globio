import { Slider } from '@/components/ui/slider';

import { Field, type DisableProps } from './Field';

export interface SliderFieldProps extends DisableProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  /** Format the live value pill on the right of the label. Default `toFixed(2)`. */
  readonly format?: (value: number) => string;
  readonly className?: string | undefined;
}

/**
 * Range slider with a live-updating value pill. The pill text is whatever
 * `format` returns — gives callers room to render units (`'1.20s'`,
 * `'15px'`) without us baking them in.
 */
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
}: SliderFieldProps) {
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
