import { Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { ColorField } from './ColorField';

const DEFAULT_ADD_COLORS = [
  '#ffffff',
  '#fbbf24',
  '#67e8f9',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#facc15',
  '#ef4444',
  '#22d3ee',
  '#cfdcff',
  '#fde68a',
] as const;

export interface ColorListFieldProps {
  readonly label?: ReactNode;
  readonly colors: ReadonlyArray<string>;
  readonly onChange: (next: ReadonlyArray<string>) => void;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly addColor?: string;
  readonly addLabel?: string;
  readonly itemLabel?: (index: number) => string;
  readonly removeLabel?: (index: number) => string;
  readonly swatches?: ReadonlyArray<string>;
  readonly className?: string | undefined;
}

export function ColorListField({
  label,
  colors,
  onChange,
  minItems = 1,
  maxItems = 16,
  addColor = '#ffffff',
  addLabel = 'Add',
  itemLabel = (index) => `Slot ${index + 1}`,
  removeLabel = (index) => `Remove ${itemLabel(index)}`,
  swatches,
  className,
}: ColorListFieldProps) {
  const canAdd = colors.length < maxItems;
  const canRemove = colors.length > minItems;

  return (
    <div className={cn('space-y-2', className)}>
      {label || maxItems > minItems ? (
        <div className="flex items-center justify-between gap-3">
          {label ? (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-300/70">
              {label}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={() =>
              onChange([...colors, pickNextColor(colors, addColor, swatches)])
            }
            disabled={!canAdd}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-3" />
            {addLabel}
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        {colors.map((color, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_32px] items-center gap-2">
            <ColorField
              label={itemLabel(index)}
              value={color}
              onChange={(next) => {
                const copy = [...colors];
                copy[index] = next;
                onChange(copy);
              }}
              {...(swatches ? { swatches } : {})}
            />
            <button
              type="button"
              onClick={() => onChange(colors.filter((_, i) => i !== index))}
              disabled={!canRemove}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-rose-300/40 hover:bg-rose-300/[0.06] hover:text-rose-200 disabled:pointer-events-none disabled:opacity-40"
              aria-label={removeLabel(index)}
              title={removeLabel(index)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function pickNextColor(
  colors: ReadonlyArray<string>,
  preferred: string,
  swatches: ReadonlyArray<string> | undefined
): string {
  const used = new Set(colors.map(normaliseHex));
  const palette = [preferred, ...(swatches ?? DEFAULT_ADD_COLORS)];
  const available = palette.find((color) => !used.has(normaliseHex(color)));
  if (available) return normaliseHex(available);

  for (let index = colors.length; index < colors.length + 128; index += 1) {
    const candidate = hslToHex((index * 137.508) % 360, 82, 64);
    if (!used.has(candidate)) return candidate;
  }

  return '#ffffff';
}

function normaliseHex(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return `#${toHex(r + m)}${toHex(g + m)}${toHex(b + m)}`;
}

function toHex(channel: number): string {
  return Math.round(channel * 255)
    .toString(16)
    .padStart(2, '0');
}
