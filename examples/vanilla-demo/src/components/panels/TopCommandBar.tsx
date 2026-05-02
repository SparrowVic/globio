import type { ReactNode } from 'react';
import { Download, Home, Play, Plus, RotateCcw, Settings2 } from 'lucide-react';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GroupedSelectField, type GroupedSelectGroup } from '@/components/controls';
import { configuratorPresets } from '@/configurator/defaults';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';

const kindLabels: ReadonlyArray<{ readonly value: GlobeKind; readonly label: string }> = [
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

/**
 * Top command bar — the globe's "core identity" controls live here:
 *   Kind · Theme · Preset · action buttons (Replay / Home / Export / Reset)
 *
 * Stage panel handles the "fine-tune" details (camera, atmosphere,
 * performance). The split keeps the most-used switches one click away.
 */
export function TopCommandBar({
  state,
  onGlobeChange,
  onPreset,
  onCreateTheme,
  onReplay,
  onHome,
  onExport,
  onReset,
}: {
  readonly state: ConfiguratorState;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
  readonly onPreset: (id: string) => void;
  readonly onCreateTheme: () => void;
  readonly onReplay: () => void;
  readonly onHome: () => void;
  readonly onExport: () => void;
  readonly onReset: () => void;
}) {
  const themesForKind = themeCatalog
    .filter((t) => t.kind === state.globe.kind)
    .map((t) => ({ value: t.value, label: t.label }));

  const themeGroups: ReadonlyArray<GroupedSelectGroup<ThemePresetName>> = [
    {
      label: 'Custom',
      options: [],
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

  const presetGroups: ReadonlyArray<GroupedSelectGroup<string>> = [
    {
      label: 'Built-in presets',
      options: configuratorPresets.map((preset) => ({ value: preset.id, label: preset.label })),
    },
  ];

  // Build a meaningful trigger label so the user always sees what
  // preset (if any) is currently in effect — including a "(modified)"
  // hint when they've tweaked anything since the last apply.
  const activePreset = state.lastPresetId
    ? configuratorPresets.find((p) => p.id === state.lastPresetId)
    : undefined;
  const presetTriggerLabel = activePreset
    ? state.dirtySincePreset
      ? `${activePreset.label} · modified`
      : activePreset.label
    : 'Apply preset…';

  return (
    <header className="top-command">
      {/* Identity glyph — single icon, no wordmark, keeps the bar slim. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            <Settings2 className="size-3.5 text-amber-200" />
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>Globio configurator</TooltipContent>
      </Tooltip>

      {/* Core identity selects: kind → theme → preset. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <GroupedSelectField<GlobeKind>
          label="Kind"
          hideLabel
          value={state.globe.kind}
          groups={kindGroups}
          onChange={(kind) => {
            // Kind switch: also pick the first theme that maps to that
            // kind so we never end up with a stale theme identifier.
            const fallback =
              themeCatalog.find((t) => t.kind === kind)?.value ?? 'outline-dark';
            onGlobeChange({ kind, theme: fallback });
          }}
          triggerClassName="h-7 w-[120px] text-xs"
        />
        <GroupedSelectField<ThemePresetName>
          label="Theme"
          hideLabel
          value={state.globe.theme}
          groups={themeGroups}
          onChange={(theme) => onGlobeChange({ theme })}
          triggerClassName="h-7 w-[160px] text-xs"
        />
        <GroupedSelectField<string>
          label="Preset"
          hideLabel
          // Force-render the placeholder by leaving `value` undefined —
          // we want every preset re-application (even of the SAME id) to
          // fire onChange so the user can re-apply over their dirty state.
          // The trigger label encodes the active preset + dirty hint.
          placeholder={presetTriggerLabel}
          groups={presetGroups}
          onChange={onPreset}
          triggerClassName={
            state.dirtySincePreset
              ? 'h-7 w-[200px] text-xs border-amber-300/40 text-amber-100'
              : 'h-7 w-[200px] text-xs'
          }
        />
      </div>

      {/* Action buttons — replay anim, fly home, export JSON, reset all. */}
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Replay animation" onClick={onReplay}>
          <Play className="size-3.5" />
        </IconButton>
        <IconButton label="Reset camera" onClick={onHome}>
          <Home className="size-3.5" />
        </IconButton>
        <IconButton label="Export JSON" onClick={onExport}>
          <Download className="size-3.5" />
        </IconButton>
        <IconButton label="Reset configurator" onClick={onReset}>
          <RotateCcw className="size-3.5" />
        </IconButton>
      </div>
    </header>
  );
}

/**
 * The "+ Create custom theme" footer item rendered inside the Theme
 * dropdown's Custom group. Styled like an upload-zone — dashed border,
 * centred plus icon — so it reads as "drop in something new" affordance
 * rather than another regular menu item.
 */
function CreateCustomThemeButton() {
  return (
    <div
      className={
        'flex items-center justify-center gap-2 rounded-md border border-dashed border-amber-300/40 bg-amber-300/[0.04] py-2 px-3 text-[12px] text-amber-200 transition-colors hover:border-amber-300/70 hover:bg-amber-300/[0.08]'
      }
    >
      <Plus className="size-3.5" />
      <span>Create custom theme</span>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-7 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.09]"
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
