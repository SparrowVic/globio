import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import { Field, type DisableProps } from './Field';

export interface SliderFieldProps extends DisableProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  /** Accessible live value text. Numeric input stays unformatted so it remains editable. */
  readonly format?: (value: number) => string;
  readonly className?: string | undefined;
}

/**
 * Range slider paired with a fixed-width numeric input. The input clamps
 * manual values to the allowed range and uses the same `step` as the slider,
 * so keyboard arrow increments match drag increments.
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
  const [draft, setDraft] = useState(() => formatNumericValue(value, step));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(formatNumericValue(value, step));
  }, [editing, step, value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(formatNumericValue(value, step));
      return;
    }
    const next = clamp(parsed, min, max);
    setDraft(formatNumericValue(next, step));
    onChange(next);
  };

  const stepBy = (direction: 1 | -1) => {
    const next = normalizeStep(value + step * direction, min, max, step);
    setDraft(formatNumericValue(next, step));
    onChange(next);
  };

  return (
    <Field
      label={label}
      className={className}
      disabled={disabled}
      disabledReason={disabledReason}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_86px] items-center gap-2">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          aria-valuetext={format(value)}
          onValueChange={(next) => onChange(next[0] ?? value)}
          className="[&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-track]]:bg-white/[0.12] [&_[data-slot=slider-range]]:bg-amber-300 [&_[data-slot=slider-thumb]]:size-2.5 [&_[data-slot=slider-thumb]]:border-amber-100 [&_[data-slot=slider-thumb]]:bg-amber-100 [&_[data-slot=slider-thumb]]:shadow-[0_0_10px_rgba(251,191,36,0.55)]"
        />
        <div className="relative w-[86px]">
          <Input
            type="text"
            inputMode="decimal"
            value={draft}
            disabled={disabled}
            aria-label={`${label} value`}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              commit(draft);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                stepBy(1);
                return;
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                stepBy(-1);
              }
            }}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft(raw);
              if (raw === '' || raw === '-' || raw === '.' || raw === '-.')
                return;
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) return;
              const next = clamp(parsed, min, max);
              if (next !== parsed) {
                setDraft(formatNumericValue(next, step));
              }
              onChange(next);
            }}
            className="h-7 w-[86px] rounded-lg border-white/[0.08] bg-black/[0.18] px-2 pr-[22px] text-right font-mono text-[10.5px] tabular-nums text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
          />
          <div className="absolute bottom-1 right-1 top-1 grid w-4 overflow-hidden rounded-[5px] border border-white/[0.06] bg-white/[0.035]">
            <StepperButton
              label={`Increase ${label}`}
              disabled={disabled || value >= max}
              onClick={() => stepBy(1)}
            >
              <ChevronUp className="size-2.5" />
            </StepperButton>
            <StepperButton
              label={`Decrease ${label}`}
              disabled={disabled || value <= min}
              onClick={() => stepBy(-1)}
            >
              <ChevronDown className="size-2.5" />
            </StepperButton>
          </div>
        </div>
      </div>
    </Field>
  );
}

function StepperButton({
  label,
  disabled,
  onClick,
  children,
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center text-slate-400 transition-colors',
        'hover:bg-white/[0.08] hover:text-slate-100',
        'disabled:pointer-events-none disabled:text-slate-700'
      )}
    >
      {children}
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeStep(
  value: number,
  min: number,
  max: number,
  step: number
): number {
  const clamped = clamp(value, min, max);
  if (step <= 0) return clamped;
  const decimals = decimalPlaces(step);
  const stepsFromMin = Math.round((clamped - min) / step);
  const snapped = min + stepsFromMin * step;
  return Number(clamp(snapped, min, max).toFixed(decimals));
}

function formatNumericValue(value: number, step: number): string {
  const decimals = decimalPlaces(step);
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

function decimalPlaces(value: number): number {
  const normalized = value.toString().toLowerCase();
  if (normalized.includes('e-')) {
    const [, exponent = '0'] = normalized.split('e-');
    return Number.parseInt(exponent, 10) || 0;
  }
  const [, decimals = ''] = normalized.split('.');
  return decimals.length;
}
