import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { ControlLabel, type FeatureProps } from './ControlInfo';
import type { DisableProps } from './Field';

export interface ColorFieldProps extends DisableProps, FeatureProps {
  readonly label: string;
  /** Hex value, e.g. `#fbbf24`. The component normalises any input it gets. */
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** Optional helper text shown from the info icon next to the label. */
  readonly hint?: string;
  readonly info?: ReactNode | undefined;
  /**
   * Curated swatch palette. Clicking a swatch jumps the value. Optional —
   * omit to render only the native color picker + hex input.
   */
  readonly swatches?: ReadonlyArray<string>;
  /**
   * Optional preset color the user can revert to with a small "reset"
   * affordance (for theme-default values).
   */
  readonly preset?: string;
}

/** Default amber-leaning palette used when caller doesn't supply one. */
const DEFAULT_SWATCHES: ReadonlyArray<string> = [
  '#ffffff',
  '#fbbf24',
  '#f59e0b',
  '#ef4444',
  '#f472b6',
  '#a78bfa',
  '#67e8f9',
  '#22d3ee',
  '#34d399',
  '#84cc16',
  '#fde68a',
  '#94a3b8',
];

/**
 * Color picker control — surfaces the active value as a swatch button + hex
 * label, and reveals a popover with: a curated swatch grid, the browser's
 * native `<input type="color">`, and a free-form hex input. All three paths
 * call the same `onChange` so the underlying value is consistent.
 *
 * Why a popover rather than always-open: the controls panel is dense and
 * a tile-grid + native picker + input would dominate the layout. The trigger
 * stays slim (one row) while the popover is comfortable to use.
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
  info,
  swatches = DEFAULT_SWATCHES,
  preset,
  disabled,
  disabledReason,
  feature,
  configPath,
}: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape — keeps the control feeling like a
  // standard menu rather than something you have to dismiss explicitly.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const normalised = normaliseHex(value);
  const canReset = preset !== undefined && value !== preset;

  return (
    <div
      className={cn('relative', disabled ? 'is-disabled opacity-50' : null)}
    >
      <div ref={popoverRef} className="flex items-center justify-between gap-3">
        <ControlLabel
          label={label}
          info={info ?? hint}
          feature={feature}
          configPath={configPath}
          disabledReason={
            disabled && disabledReason ? disabledReason : undefined
          }
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className={cn(
            'flex h-8 min-w-[142px] items-center gap-2 rounded-lg border border-white/[0.09] bg-black/[0.18] py-1 pl-1 pr-2.5 transition-colors',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:border-white/[0.18]',
            disabled ? 'pointer-events-none opacity-50' : ''
          )}
        >
          <span
            className="size-6 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.28)]"
            style={{ background: normalised }}
            aria-hidden="true"
          />
          <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-200">
            {normalised}
          </span>
        </button>

        {open ? (
          <div className="absolute right-0 z-30 mt-2 w-[264px] rounded-lg border border-white/10 bg-[#0a0d18]/95 p-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Swatches
              </p>
              {canReset ? (
                <button
                  type="button"
                  onClick={() => {
                    if (preset !== undefined) onChange(preset);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[9.5px] uppercase tracking-[0.12em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                  title="Restore theme default"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {swatches.map((c) => {
                const active =
                  normaliseHex(c).toLowerCase() === normalised.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    className={cn(
                      'group relative flex h-8 items-center justify-center rounded border transition-all',
                      active
                        ? 'border-white/60 ring-1 ring-white/30'
                        : 'border-white/10 hover:border-white/30'
                    )}
                    style={{ background: `${c}26` }}
                    aria-label={c}
                    title={c}
                  >
                    <span
                      className="size-3.5 rounded-full"
                      style={{ background: c, boxShadow: `0 0 8px ${c}99` }}
                    />
                  </button>
                );
              })}
            </div>

            <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Custom
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalised}
                onChange={(event) => onChange(event.target.value)}
                className="size-10 cursor-pointer rounded border border-white/10 bg-transparent p-0"
              />
              <input
                type="text"
                value={normalised}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === '' || next.startsWith('#')) {
                    onChange(next);
                  } else {
                    onChange(`#${next}`);
                  }
                }}
                className="h-10 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-[12px] uppercase tracking-[0.06em] text-slate-100 outline-none transition-colors focus:border-amber-300/50"
                spellCheck={false}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Normalise any hex-ish input into a `#rrggbb` 7-char string. */
function normaliseHex(input: string): string {
  if (!input) return '#000000';
  let s = input.trim();
  if (!s.startsWith('#')) s = `#${s}`;
  // Expand short form (#abc → #aabbcc)
  if (s.length === 4) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  }
  if (s.length === 7) return s.toLowerCase();
  // Accept rgba(...) / rgb(...) by passing through; native picker will
  // show its closest match.
  return s.toLowerCase();
}
