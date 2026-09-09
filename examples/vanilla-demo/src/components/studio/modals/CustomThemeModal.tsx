import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPalette,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import { type PartialTokenSet, type ThemePresetName } from '@your-globe/core';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { idFromName, saveCustomTheme, type CustomTheme } from '@/lib/custom-themes';
import { createStudioThemeDraft } from '@/lib/studio-document-theme';
import { cn } from '@/lib/utils';

/**
 * Curated token list — only the tokens that produce a visible, immediate
 * change on the globe surface. Per-kind tokens (wireframe.* / paper.* /
 * hologram.* / countries.dotted.*) are omitted from v1; advanced users
 * can drop down to JSON via Reset → manual edit. Keeps the form short
 * and avoids the modal becoming a 50-field token explorer.
 */
const COLOR_TOKENS = [
  { key: 'background.color', label: 'Background' },
  { key: 'globe.surfaceColor', label: 'Globe surface' },
  { key: 'countries.border.color', label: 'Country borders' },
  { key: 'countries.fill.defaultColor', label: 'Country fill' },
  { key: 'atmosphere.color', label: 'Atmosphere' },
  { key: 'starfield.color', label: 'Stars' },
  { key: 'markers.defaultColor', label: 'Markers' },
] as const;

const NUMBER_TOKENS = [
  { key: 'countries.border.opacity', label: 'Borders opacity', min: 0, max: 1, step: 0.05 },
  { key: 'countries.fill.opacity', label: 'Fill opacity', min: 0, max: 1, step: 0.05 },
  { key: 'atmosphere.intensity', label: 'Atmosphere intensity', min: 0, max: 1.5, step: 0.05 },
  { key: 'starfield.density', label: 'Stars density', min: 0, max: 4000, step: 100 },
  { key: 'starfield.size', label: 'Stars size', min: 0.5, max: 4, step: 0.1 },
] as const;

const BUILT_IN_BASES: ReadonlyArray<{ readonly value: ThemePresetName; readonly label: string }> = [
  { value: 'cinematic-night', label: 'Cinematic · night' },
  { value: 'cinematic-day', label: 'Cinematic · day' },
  { value: 'cinematic-dawn', label: 'Cinematic · dawn' },
  { value: 'cinematic-noir', label: 'Cinematic · noir' },
  { value: 'outline-dark', label: 'Outline · dark' },
  { value: 'outline-light', label: 'Outline · light' },
  { value: 'outline-sunset', label: 'Outline · sunset' },
  { value: 'outline-cyber', label: 'Outline · cyber' },
  { value: 'outline-monochrome', label: 'Outline · mono' },
  { value: 'dotted-dark', label: 'Dotted · dark' },
  { value: 'wireframe-tron', label: 'Wireframe · Tron' },
  { value: 'paper-default', label: 'Paper atlas' },
  { value: 'hologram-cyan', label: 'Hologram · cyan' },
];

/**
 * Materialize the base, including tokens outside the curated editor,
 * because registered custom themes do not inherit their metadata's base.
 */
const initialDraftFromBase = (base: ThemePresetName): PartialTokenSet => {
  return createStudioThemeDraft(base);
};

export interface CustomThemeModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Defaults for the form (kind-aware: pre-pick the matching base). */
  readonly defaultBase?: ThemePresetName;
  /**
   * If supplied, the modal opens in EDIT mode — the form is pre-filled
   * with this theme's name + base + tokens, and Save updates the existing
   * entry (keeps the same id). When undefined the modal is in CREATE mode.
   */
  readonly editing?: CustomTheme | undefined;
  /**
   * Called on every token / base change while the modal is open. Use this
   * to live-preview the draft theme on the globe via `registerThemePreset`
   * + theme swap. Modal does not directly touch the globe.
   */
  readonly onPreview?: (draft: { extends: ThemePresetName; tokens: PartialTokenSet }) => void;
  /**
   * Called when the modal closes WITHOUT saving (Cancel / Esc / outside
   * click). The host should restore whatever theme was active before the
   * modal opened. Not called after `onSaved`.
   */
  readonly onPreviewEnd?: () => void;
  /** Called after the theme is persisted; caller refreshes its list. */
  readonly onSaved: (theme: CustomTheme) => void;
}

/**
 * Custom theme builder modal. Layout:
 *
 *   ┌── Name + Base preset row
 *   ├── Colors grid (7 colour pickers)
 *   ├── Sliders grid (5 numeric tokens)
 *   └── Cancel · Save
 *
 * Live-updates `tokens` state on every input change so the preview
 * could (in future) pre-apply the draft to the globe before save.
 */
export function CustomThemeModal({
  open,
  onOpenChange,
  defaultBase = 'outline-dark',
  editing,
  onPreview,
  onPreviewEnd,
  onSaved,
}: CustomThemeModalProps) {
  const [name, setName] = useState('');
  const [base, setBase] = useState<ThemePresetName>(defaultBase);
  const [tokens, setTokens] = useState<PartialTokenSet>(() => initialDraftFromBase(defaultBase));
  const [draftReady, setDraftReady] = useState(false);
  // Track whether the close was a save vs a cancel so the parent can
  // distinguish "user kept the changes" from "restore previous theme".
  const wasSavedRef = useRef(false);
  const wasOpenRef = useRef(false);
  const openingRef = useRef({ defaultBase, editing });
  const callbacksRef = useRef({ onPreview, onPreviewEnd });
  openingRef.current = { defaultBase, editing };
  callbacksRef.current = { onPreview, onPreviewEnd };

  // Re-seed the draft when the modal opens. Edit mode pre-fills from
  // the supplied theme; create mode resets to a clean draft from the
  // chosen base preset.
  useEffect(() => {
    if (!open) {
      setDraftReady(false);
      if (wasOpenRef.current && !wasSavedRef.current) callbacksRef.current.onPreviewEnd?.();
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;
    wasSavedRef.current = false;
    const opening = openingRef.current;
    if (opening.editing) {
      setName(opening.editing.name);
      setBase(opening.editing.extends);
      setTokens(createStudioThemeDraft(opening.editing.extends, opening.editing.tokens));
    } else {
      setName('');
      setBase(opening.defaultBase);
      setTokens(initialDraftFromBase(opening.defaultBase));
    }
    setDraftReady(true);
  }, [open]);

  // Themes are construction-time engine settings. Coalesce slider/color
  // input so rapid edits do not create a new WebGL context on every tick.
  useEffect(() => {
    if (!open || !draftReady) return;
    const timer = window.setTimeout(() => callbacksRef.current.onPreview?.({ extends: base, tokens }), 150);
    return () => window.clearTimeout(timer);
  }, [open, draftReady, base, tokens]);

  const onTokenChange = <T,>(key: string, value: T): void => {
    setTokens((current) => ({ ...current, [key]: value } as PartialTokenSet));
  };

  const onBaseChange = (next: ThemePresetName): void => {
    setBase(next);
    // Reset the editable tokens to the new base's values — the user
    // probably wants to start tweaking from the picked starting point,
    // not carry over their existing draft into a totally different palette.
    setTokens(initialDraftFromBase(next));
  };

  const canSave = name.trim().length > 0;

  const handleSave = (): void => {
    if (!canSave) return;
    const theme: CustomTheme = {
      // Edit mode: keep the existing id so the entry doesn't duplicate.
      // Create mode: derive a fresh slug from the name.
      id: editing?.id ?? idFromName(name),
      name: name.trim(),
      extends: base,
      tokens,
      createdAt: editing?.createdAt ?? Date.now(),
    };
    saveCustomTheme(theme);
    wasSavedRef.current = true;
    onSaved(theme);
    onOpenChange(false);
  };

  const colorRows = useMemo(
    () =>
      COLOR_TOKENS.map((token) => (
        <ColorRow
          key={token.key}
          label={token.label}
          value={(tokens[token.key as keyof PartialTokenSet] as string) ?? '#000000'}
          onChange={(next) => onTokenChange(token.key, next)}
        />
      )),
    [tokens],
  );

  const numberRows = useMemo(
    () =>
      NUMBER_TOKENS.map((token) => (
        <NumberRow
          key={token.key}
          label={token.label}
          value={(tokens[token.key as keyof PartialTokenSet] as number) ?? 0}
          min={token.min}
          max={token.max}
          step={token.step}
          onChange={(next) => onTokenChange(token.key, next)}
        />
      )),
    [tokens],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faSparkles} className="size-3.5 text-amber-200" />
            <span>{editing ? 'Edit custom theme' : 'Create custom theme'}</span>
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Tweak this theme's tokens — saving updates the existing entry. Changes preview live on the globe."
              : 'Pick a base preset, override the tokens you care about. Changes preview live on the globe; saving persists to localStorage.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-theme-name" className="text-[11px] uppercase tracking-wider text-slate-400">
                Name
              </Label>
              <Input
                id="custom-theme-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Aurora night"
                autoFocus
                className="h-8 border-white/10 bg-white/[0.04] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-slate-400">Base preset</Label>
              <Select value={base} onValueChange={(next) => onBaseChange(next as ThemePresetName)}>
                <SelectTrigger className="h-8 w-full border-white/10 bg-white/[0.04] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
                  {!BUILT_IN_BASES.some((option) => option.value === base) && (
                    <SelectItem value={base}>Current custom theme</SelectItem>
                  )}
                  {BUILT_IN_BASES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FieldGroup
            title="Colors"
            icon={<FontAwesomeIcon icon={faPalette} className="size-3 text-cyan-200" />}
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{colorRows}</div>
          </FieldGroup>

          <FieldGroup
            title="Intensity & density"
            icon={<FontAwesomeIcon icon={faSparkles} className="size-3 text-rose-200" />}
          >
            <div className="grid grid-cols-1 gap-3">{numberRows}</div>
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 border-white/10 bg-white/[0.04]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="h-8 bg-amber-300 text-slate-900 hover:bg-amber-200 disabled:opacity-40"
          >
            {editing ? 'Save changes' : 'Save theme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  title,
  icon,
  children,
}: {
  readonly title: string;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-slate-400">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/8 bg-white/[0.025] px-3 py-2">
      <Label className="truncate text-xs text-slate-200">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'size-7 cursor-pointer rounded border border-white/10 bg-transparent p-0',
            '[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none',
          )}
          aria-label={`${label} color`}
        />
        <span className="font-mono text-[10px] tabular-nums text-slate-400">{value}</span>
      </div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
}) {
  const format = step >= 100 ? value.toFixed(0) : value.toFixed(2);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-slate-200">{label}</Label>
        <span className="font-mono text-[10px] tabular-nums text-slate-400">{format}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0] ?? value)}
        className="[&_[data-slot=slider-range]]:bg-amber-300 [&_[data-slot=slider-thumb]]:border-amber-200 [&_[data-slot=slider-thumb]]:bg-amber-100"
      />
    </div>
  );
}
