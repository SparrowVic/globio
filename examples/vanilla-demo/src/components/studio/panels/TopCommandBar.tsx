import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobePointer,
  faPlay,
  faHouseChimney,
  faFolderOpen,
  faDownload,
  faArrowsRotate,
  faBookmark,
  faPlus,
  faCircleSmall,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import { faCommand } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd } from '@/components/shared/components/Kbd';
import {
  GroupedSelectField,
  type GroupedSelectGroup,
} from '@/components/shared/controls';
import {
  configuratorPresets,
  globeDefaultsForKind,
} from '@/configurator/defaults';
import type { CustomTheme } from '@/lib/custom-themes';
import type { CustomPreset } from '@/lib/custom-presets';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';
import { cn } from '@/lib/utils';

const kindLabels: ReadonlyArray<{
  readonly value: GlobeKind;
  readonly label: string;
}> = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'outline', label: 'Outline' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'paper', label: 'Paper' },
  { value: 'hologram', label: 'Hologram' },
];

/**
 * Built-in theme catalog tagged by kind. Top bar surfaces the subset
 * relevant to the active kind so the user only sees themes that map
 * to something visible on the globe.
 */
const themeCatalog: ReadonlyArray<{
  readonly value: ThemePresetName;
  readonly label: string;
  readonly kind: GlobeKind;
}> = [
  { value: 'cinematic-night', label: 'Cinematic · night', kind: 'cinematic' },
  { value: 'cinematic-day', label: 'Cinematic · day', kind: 'cinematic' },
  { value: 'cinematic-dawn', label: 'Cinematic · dawn', kind: 'cinematic' },
  { value: 'cinematic-noir', label: 'Cinematic · noir', kind: 'cinematic' },
  { value: 'outline-dark', label: 'Outline · dark', kind: 'outline' },
  { value: 'outline-light', label: 'Outline · light', kind: 'outline' },
  { value: 'outline-sunset', label: 'Outline · sunset', kind: 'outline' },
  { value: 'outline-cyber', label: 'Outline · cyber', kind: 'outline' },
  { value: 'outline-monochrome', label: 'Outline · mono', kind: 'outline' },
  { value: 'dotted-dark', label: 'Dotted · dark', kind: 'dotted' },
  { value: 'wireframe-tron', label: 'Wireframe · Tron', kind: 'wireframe' },
  { value: 'paper-default', label: 'Paper atlas', kind: 'paper' },
  { value: 'hologram-cyan', label: 'Hologram · cyan', kind: 'hologram' },
];

export interface TopCommandBarProps {
  readonly state: ConfiguratorState;
  readonly customThemes: ReadonlyArray<CustomTheme>;
  readonly customPresets: ReadonlyArray<CustomPreset>;
  /** Globe is up and rendering — drives the brand-mark status dot. */
  readonly ready: boolean;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
  readonly onPreset: (id: string) => void;
  readonly onCreateTheme: () => void;
  readonly onSavePreset: () => void;
  readonly onManageSaved: () => void;
  readonly onReplay: () => void;
  readonly onHome: () => void;
  readonly onExport: () => void;
  readonly onReset: () => void;
  /** Open the ⌘K command palette (drives the right-side hint chip + button). */
  readonly onCommandPalette: () => void;
}

/**
 * Top command bar — the globe's "core identity" controls live here:
 *   Kind · Theme · Preset · ⌘K · action buttons (Replay / Home / Saved / Export / Reset)
 *
 * Styled to match the marketing-home `Nav` — floating glass pill, animated
 * brand mark with rotating dotted halo, sliding hover indicator on selects,
 * FA Sharp Duotone Solid icons throughout. The visual continuity tells the
 * user "this is the same product, just in editor mode" rather than two
 * disjoint surfaces.
 */
export function TopCommandBar({
  state,
  customThemes,
  customPresets,
  ready,
  onGlobeChange,
  onPreset,
  onCreateTheme,
  onSavePreset,
  onManageSaved,
  onReplay,
  onHome,
  onExport,
  onReset,
  onCommandPalette,
}: TopCommandBarProps) {
  const themesForKind = themeCatalog
    .filter((t) => t.kind === state.globe.kind)
    .map((t) => ({ value: t.value, label: t.label }));

  // User-created themes appear at the top of the dropdown — they're the
  // most "yours" content. Each custom is tagged with the kind its base
  // preset maps to; when that kind doesn't match the active globe kind we
  // surface a small ⚠ glyph in the label so the user knows kind-specific
  // tokens won't render meaningfully on a mismatched globe.
  const customThemeOptions = customThemes.map((theme) => {
    const baseKind = themeCatalog.find((t) => t.value === theme.extends)?.kind;
    const compatible = baseKind === state.globe.kind;
    const suffix = compatible ? ' ✦' : ` ✦ ⚠ for ${baseKind ?? 'unknown'}`;
    return {
      value: theme.id as ThemePresetName,
      label: `${theme.name}${suffix}`,
    };
  });

  const themeGroups: ReadonlyArray<GroupedSelectGroup<ThemePresetName>> = [
    {
      label: customThemeOptions.length > 0 ? 'Custom' : 'Custom (none yet)',
      options: customThemeOptions,
      footer: {
        content: <CreateCustomThemeButton />,
        onClick: onCreateTheme,
      },
    },
    {
      label: 'Built-in',
      options: themesForKind,
    },
  ];

  const kindGroups: ReadonlyArray<GroupedSelectGroup<GlobeKind>> = [
    { label: '', options: kindLabels },
  ];

  const userPresetOptions = customPresets.map((preset) => ({
    value: preset.id,
    label: `${preset.name} ✦`,
  }));
  const presetGroups: ReadonlyArray<GroupedSelectGroup<string>> = [
    {
      label:
        userPresetOptions.length > 0
          ? 'Your presets'
          : 'Your presets (none yet)',
      options: userPresetOptions,
      footer: {
        content: <SavePresetFooterButton />,
        onClick: onSavePreset,
      },
    },
    {
      label: 'Built-in',
      options: configuratorPresets.map((preset) => ({
        value: preset.id,
        label: preset.label,
      })),
    },
  ];

  // Surface the active preset in the trigger label, with a "modified"
  // hint when state has drifted since the last apply. Look up both
  // built-in and user presets so saved presets show their own name.
  const activePresetLabel = state.lastPresetId
    ? configuratorPresets.find((p) => p.id === state.lastPresetId)?.label ??
      customPresets.find((p) => p.id === state.lastPresetId)?.name
    : undefined;
  const presetTriggerLabel = activePresetLabel
    ? state.dirtySincePreset
      ? `${activePresetLabel} · modified`
      : activePresetLabel
    : 'Apply preset…';

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-3">
      <div
        className={cn(
          'pointer-events-auto relative flex h-12 w-full max-w-[1380px] items-center gap-2 rounded-full pl-2 pr-1.5',
          'border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl backdrop-saturate-150',
          'shadow-[0_18px_60px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        )}
      >
        {/* Iridescent edge — barely-there gradient that breathes */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-40 [mask:linear-gradient(white,transparent_60%)]"
          style={{
            background:
              'linear-gradient(120deg, rgba(255,200,90,0.15) 0%, rgba(255,255,255,0) 35%, rgba(120,180,255,0.12) 70%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Brand mark — links back home so the studio doesn't feel like a dead-end. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/"
              aria-label="Back to Globio home"
              className="group relative flex h-9 items-center gap-2 rounded-full px-2.5 transition-colors hover:bg-white/[0.04]"
            >
              <span className="relative flex size-7 items-center justify-center">
                <svg
                  viewBox="0 0 28 28"
                  className="absolute inset-0 size-full animate-[spin_18s_linear_infinite] text-amber-200/70"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="14"
                    cy="14"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="0.6"
                    strokeDasharray="1.2 2.6"
                  />
                </svg>
                <span
                  className={cn(
                    'relative z-10 flex size-5 items-center justify-center rounded-full',
                    'bg-gradient-to-br from-amber-200 to-orange-300 text-slate-950',
                    'shadow-[0_0_20px_-2px_rgba(255,200,90,0.7)] transition-shadow group-hover:shadow-[0_0_28px_0_rgba(255,200,90,0.9)]'
                  )}
                >
                  <FontAwesomeIcon icon={faGlobePointer} className="size-2.5" />
                </span>
              </span>
              <span className="hidden text-[12.5px] font-semibold tracking-tight text-white sm:inline">
                Globio
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.18em] transition-colors',
                  ready
                    ? 'border-emerald-300/30 bg-emerald-300/[0.06] text-emerald-200/90'
                    : 'border-amber-200/30 bg-amber-200/[0.04] text-amber-200/80'
                )}
              >
                <FontAwesomeIcon
                  icon={faCircleSmall}
                  className={cn(
                    'size-1.5',
                    ready ? 'text-emerald-300' : 'text-amber-300'
                  )}
                />
                <span>{ready ? 'live' : 'loading'}</span>
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>Back to home</TooltipContent>
        </Tooltip>

        {/* Divider */}
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-white/[0.08]" />

        {/* Core identity selects: kind → theme → preset. */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GroupedSelectField<GlobeKind>
            label="Kind"
            configPath="kind"
            feature="kind"
            hideLabel
            value={state.globe.kind}
            groups={kindGroups}
            onChange={(kind) => onGlobeChange(globeDefaultsForKind(kind))}
            triggerClassName="h-7 w-[120px] rounded-full border-white/[0.08] bg-white/[0.04] text-[11.5px] font-medium text-slate-100"
          />
          <GroupedSelectField<ThemePresetName>
            label="Theme"
            configPath="theme"
            feature="theme"
            hideLabel
            value={state.globe.theme}
            groups={themeGroups}
            onChange={(theme) => onGlobeChange({ theme })}
            triggerClassName="h-7 w-[160px] rounded-full border-white/[0.08] bg-white/[0.04] text-[11.5px] text-slate-100"
          />
          <GroupedSelectField<string>
            label="Preset"
            feature="studio-presets"
            hideLabel
            // Force-render the placeholder by leaving `value` undefined —
            // we want every preset re-application (even the same id) to
            // fire onChange so users can re-apply over their dirty state.
            placeholder={presetTriggerLabel}
            groups={presetGroups}
            onChange={onPreset}
            triggerClassName={cn(
              'h-7 w-[200px] rounded-full text-[11.5px]',
              state.dirtySincePreset
                ? 'border-amber-300/40 bg-amber-300/[0.06] text-amber-100'
                : 'border-white/[0.08] bg-white/[0.04] text-slate-100'
            )}
          />
        </div>

        {/* ⌘K command palette trigger — pill-shaped, kbd hint inside. */}
        <button
          type="button"
          onClick={onCommandPalette}
          className={cn(
            'group hidden h-7 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] pl-2.5 pr-1 text-[11.5px] text-slate-300 transition-colors md:inline-flex',
            'hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white'
          )}
        >
          <FontAwesomeIcon icon={faCommand} className="size-2.5 opacity-70" />
          <span className="opacity-80">Search</span>
          <span className="ml-1 flex items-center gap-0.5">
            <Kbd className="!h-4 !min-w-[16px] !px-0.5 !text-[9px]">⌘</Kbd>
            <Kbd className="!h-4 !min-w-[16px] !px-0.5 !text-[9px]">K</Kbd>
          </span>
        </button>

        {/* Divider */}
        <span
          aria-hidden="true"
          className="mx-0.5 hidden h-5 w-px bg-white/[0.08] md:block"
        />

        {/* Action buttons — replay anim, home, manage saved, export, reset.
            Grouped right-side; each gets a glow-on-hover + descriptive
            tooltip so first-time users don't have to guess. */}
        <div className="flex shrink-0 items-center gap-1">
          <ActionButton
            label="Replay layer animation"
            onClick={onReplay}
            icon={faPlay}
            accent="emerald"
          />
          <ActionButton
            label="Reset camera to home view"
            onClick={onHome}
            icon={faHouseChimney}
            accent="sky"
          />
          <ActionButton
            label="Manage saved themes & presets"
            onClick={onManageSaved}
            icon={faFolderOpen}
            accent="amber"
          />
          <ActionButton
            label="Export config as JSON"
            onClick={onExport}
            icon={faDownload}
            accent="cyan"
          />
          <ActionButton
            label="Reset configurator (reload)"
            onClick={onReset}
            icon={faArrowsRotate}
            accent="rose"
          />
        </div>
      </div>
    </header>
  );
}

const accentClasses: Record<
  'emerald' | 'sky' | 'amber' | 'cyan' | 'rose',
  string
> = {
  emerald:
    'group-hover:text-emerald-200 group-hover:shadow-[0_0_20px_-4px_rgba(110,231,183,0.55)]',
  sky: 'group-hover:text-sky-200 group-hover:shadow-[0_0_20px_-4px_rgba(125,211,252,0.55)]',
  amber:
    'group-hover:text-amber-200 group-hover:shadow-[0_0_20px_-4px_rgba(252,211,77,0.55)]',
  cyan: 'group-hover:text-cyan-200 group-hover:shadow-[0_0_20px_-4px_rgba(103,232,249,0.55)]',
  rose: 'group-hover:text-rose-200 group-hover:shadow-[0_0_20px_-4px_rgba(252,165,165,0.55)]',
};

function ActionButton({
  label,
  onClick,
  icon,
  accent,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly icon: typeof faPlay;
  readonly accent: keyof typeof accentClasses;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onClick}
          aria-label={label}
          className={cn(
            'group relative size-8 rounded-full border-white/[0.08] bg-white/[0.025] text-slate-300',
            'transition-all duration-300 hover:bg-white/[0.06]',
            accentClasses[accent]
          )}
        >
          <FontAwesomeIcon icon={icon} className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Footer affordance for the Theme dropdown's Custom group. Styled like
 * an upload-zone — dashed border, centred plus icon — so it reads as
 * "drop in something new" rather than another menu item.
 */
function CreateCustomThemeButton() {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-md border border-dashed border-amber-300/40 bg-amber-300/[0.04] px-3 py-2 text-[12px] text-amber-200',
        'transition-colors hover:border-amber-300/70 hover:bg-amber-300/[0.08]'
      )}
    >
      <FontAwesomeIcon icon={faPlus} className="size-3" />
      <span>Create custom theme</span>
    </div>
  );
}

/**
 * Footer affordance for the Preset dropdown's "Your presets" group.
 * Same dashed-zone pattern as the theme one — different icon + label so
 * users can read the action at a glance.
 */
function SavePresetFooterButton() {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-md border border-dashed border-amber-300/40 bg-amber-300/[0.04] px-3 py-2 text-[12px] text-amber-200',
        'transition-colors hover:border-amber-300/70 hover:bg-amber-300/[0.08]'
      )}
    >
      <FontAwesomeIcon icon={faBookmark} className="size-3" />
      <span>Save current as preset…</span>
    </div>
  );
}

// Helper export — used by the studio shell as a pretend ReactNode renderer
// where we need a top-bar replacement for storybook-style screenshots etc.
// Intentionally not exported in the components/shared barrel.
export type { ReactNode };
