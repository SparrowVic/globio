import { Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { DisableProps } from './Field';

export interface ColorFieldProps extends DisableProps {
  readonly label: string;
  /** Hex value, e.g. `#fbbf24`. The component normalises any input it gets. */
  readonly value: string;
  readonly onChange: (next: string) => void;
  /**
   * Optional descriptive sublabel under the field name (e.g. "Theme default").
   */
  readonly hint?: string;
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
  swatches = DEFAULT_SWATCHES,
  preset,
  disabled,
  disabledReason,
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

  return (
    <div
      className={cn('flex flex-col gap-1.5', disabled ? 'is-disabled' : null)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Label className="text-[11px] font-medium leading-none text-slate-400">
            {label}
          </Label>
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
              <TooltipContent
                side="top"
                sideOffset={4}
                className="max-w-[240px] text-xs"
              >
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {hint ? (
          <span className="text-[10px] leading-none text-slate-500">
            {hint}
          </span>
        ) : null}
      </div>

      <div ref={popoverRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className={cn(
            'flex h-7 w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-black/[0.16] px-2.5 transition-colors',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] hover:border-white/[0.18]',
            disabled ? 'pointer-events-none opacity-50' : ''
          )}
        >
          <span
            className="size-3.5 rounded-sm border border-white/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{ background: normalised }}
            aria-hidden="true"
          />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-slate-200">
            {normalised}
          </span>
          {preset && normalised.toLowerCase() !== preset.toLowerCase() ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange(preset);
              }}
              className="ml-auto rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-slate-300 hover:border-white/20 hover:text-white"
              title="Restore theme default"
            >
              Reset
            </button>
          ) : (
            <span className="ml-auto text-[9px] uppercase tracking-[0.16em] text-slate-500">
              {open ? 'Done' : 'Pick'}
            </span>
          )}
        </button>

        {open ? (
          <div className="absolute right-0 z-30 mt-1.5 w-[244px] rounded-lg border border-white/10 bg-[#0a0d18]/95 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
            <p className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Swatches
            </p>
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
                      'group relative flex h-7 items-center justify-center rounded border transition-all',
                      active
                        ? 'border-white/60 ring-1 ring-white/30'
                        : 'border-white/10 hover:border-white/30'
                    )}
                    style={{ background: `${c}26` }}
                    aria-label={c}
                    title={c}
                  >
                    <span
                      className="size-3 rounded-full"
                      style={{ background: c, boxShadow: `0 0 8px ${c}99` }}
                    />
                  </button>
                );
              })}
            </div>

            <p className="mb-1.5 mt-3 text-[9.5px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Custom
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalised}
                onChange={(event) => onChange(event.target.value)}
                className="size-9 cursor-pointer rounded border border-white/10 bg-transparent p-0"
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
                className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-100 outline-none transition-colors focus:border-amber-300/50"
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
