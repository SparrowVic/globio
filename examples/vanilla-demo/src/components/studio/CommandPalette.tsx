import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faBookmark,
  faCircleDashed,
  faDownload,
  faFolderOpen,
  faGrid,
  faGrid2,
  faHouseChimney,
  faPlay,
  faPalette,
  faRadar,
  faScrollOld,
  faStars,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { configuratorPresets, globeDefaultsForKind } from '@/configurator/defaults';
import type { CustomPreset } from '@/lib/custom-presets';
import type { CustomTheme } from '@/lib/custom-themes';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';

const kindOptions: ReadonlyArray<{
  readonly value: GlobeKind;
  readonly label: string;
  readonly icon: typeof faCircleDashed;
}> = [
  { value: 'cinematic', label: 'Cinematic', icon: faStars },
  { value: 'outline', label: 'Outline', icon: faCircleDashed },
  { value: 'dotted', label: 'Dotted', icon: faGrid },
  { value: 'wireframe', label: 'Wireframe', icon: faGrid2 },
  { value: 'paper', label: 'Paper', icon: faScrollOld },
  { value: 'hologram', label: 'Hologram', icon: faRadar },
];

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

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly state: ConfiguratorState;
  readonly customThemes: ReadonlyArray<CustomTheme>;
  readonly customPresets: ReadonlyArray<CustomPreset>;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
  readonly onPreset: (id: string) => void;
  readonly onReplay: () => void;
  readonly onHome: () => void;
  readonly onManageSaved: () => void;
  readonly onExport: () => void;
  readonly onReset: () => void;
}

/**
 * Linear / Raycast-style command palette. Bound globally to ⌘K (Ctrl+K
 * on Windows). One typed search-box, three sections by default:
 *
 *  1. **Quick actions** — replay layer animation, reset camera, open
 *     manage-saved modal, export JSON, reset configurator. The Top
 *     Command Bar duplicates these as icons; the palette adds keyboard
 *     access + fuzzy-discoverable labels.
 *  2. **Switch kind** — visual kind options, applied instantly. Theme falls
 *     back to the first valid one for the chosen kind.
 *  3. **Switch theme** — themes valid for the *current* kind only.
 *  4. **Apply preset** — built-in + user-saved presets, in that order.
 *
 * `cmdk` (the underlying primitive) takes care of the fuzzy match,
 * arrow-key nav, Enter to commit, and Esc to dismiss. We just wire the
 * actions and close the dialog when one fires.
 */
export function CommandPalette({
  open,
  onOpenChange,
  state,
  customThemes,
  customPresets,
  onGlobeChange,
  onPreset,
  onReplay,
  onHome,
  onManageSaved,
  onExport,
  onReset,
}: CommandPaletteProps) {
  // Global ⌘K binding. Listening on document is fine — we let the user
  // open the palette from anywhere in the studio (including form fields,
  // since dialogs trap focus on open and restore it on close).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const themesForKind = themeCatalog.filter((t) => t.kind === state.globe.kind);

  // Helper that runs a handler then auto-dismisses the palette. Matches
  // the standard "do thing → menu closes" expectation users have from
  // every other command-palette implementation.
  const run = (fn: () => void) => () => {
    fn();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search across actions, kinds, themes, and presets"
      className="sm:max-w-[640px]"
    >
      <CommandInput placeholder="Type a command or search…" />
      <CommandList className="max-h-[440px]">
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <PaletteItem
            label="Replay layer animation"
            icon={faPlay}
            iconClassName="text-emerald-300"
            shortcut="R"
            onSelect={run(onReplay)}
          />
          <PaletteItem
            label="Reset camera to home view"
            icon={faHouseChimney}
            iconClassName="text-sky-300"
            shortcut="H"
            onSelect={run(onHome)}
          />
          <PaletteItem
            label="Manage saved themes & presets"
            icon={faFolderOpen}
            iconClassName="text-amber-300"
            onSelect={run(onManageSaved)}
          />
          <PaletteItem
            label="Export config as JSON"
            icon={faDownload}
            iconClassName="text-cyan-300"
            shortcut="E"
            onSelect={run(onExport)}
          />
          <PaletteItem
            label="Reset configurator (reload)"
            icon={faArrowsRotate}
            iconClassName="text-rose-300"
            destructive
            onSelect={run(onReset)}
          />
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Switch kind">
          {kindOptions.map((kind) => (
            <PaletteItem
              key={kind.value}
              label={kind.label}
              keywords={[kind.value, 'globe', 'kind']}
              icon={kind.icon}
              iconClassName="text-slate-300"
              active={state.globe.kind === kind.value}
              onSelect={run(() => {
                onGlobeChange(globeDefaultsForKind(kind.value));
              })}
            />
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={`Themes for ${state.globe.kind}`}>
          {themesForKind.map((theme) => (
            <PaletteItem
              key={theme.value}
              label={theme.label}
              keywords={['theme', theme.kind]}
              icon={faPalette}
              iconClassName="text-amber-200"
              active={state.globe.theme === theme.value}
              onSelect={run(() => onGlobeChange({ theme: theme.value }))}
            />
          ))}
          {customThemes
            .filter((t) => themeCatalog.find((x) => x.value === t.extends)?.kind === state.globe.kind)
            .map((theme) => (
              <PaletteItem
                key={theme.id}
                label={`${theme.name} (custom)`}
                keywords={['theme', 'custom', 'mine']}
                icon={faStars}
                iconClassName="text-amber-200"
                active={state.globe.theme === (theme.id as ThemePresetName)}
                onSelect={run(() => onGlobeChange({ theme: theme.id as ThemePresetName }))}
              />
            ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Apply preset">
          {configuratorPresets.map((preset) => (
            <PaletteItem
              key={preset.id}
              label={preset.label}
              keywords={['preset', preset.patch.activeLayer ?? '']}
              icon={faBookmark}
              iconClassName="text-amber-200"
              active={state.lastPresetId === preset.id && !state.dirtySincePreset}
              onSelect={run(() => onPreset(preset.id))}
            />
          ))}
          {customPresets.map((preset) => (
            <PaletteItem
              key={preset.id}
              label={`${preset.name} (custom)`}
              keywords={['preset', 'custom', 'mine']}
              icon={faBookmark}
              iconClassName="text-amber-300"
              active={state.lastPresetId === preset.id && !state.dirtySincePreset}
              onSelect={run(() => onPreset(preset.id))}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

interface PaletteItemProps {
  readonly label: string;
  readonly icon: typeof faPlay;
  readonly iconClassName?: string;
  readonly shortcut?: string;
  readonly keywords?: ReadonlyArray<string>;
  readonly active?: boolean;
  readonly destructive?: boolean;
  readonly onSelect: () => void;
}

/**
 * Wraps `<CommandItem>` with our visual conventions: leading FA icon,
 * optional shortcut chip on the right, "active" dot when this entry
 * already matches the current state, "destructive" tint for the reset
 * action so the user notices it's not a casual click.
 */
function PaletteItem({
  label,
  icon,
  iconClassName,
  shortcut,
  keywords,
  active,
  destructive,
  onSelect,
}: PaletteItemProps) {
  return (
    <CommandItem
      onSelect={onSelect}
      keywords={keywords ? [...keywords] : undefined}
      className="gap-2.5"
    >
      <FontAwesomeIcon icon={icon} className={iconClassName ?? 'text-slate-300'} />
      <span className={destructive ? 'text-rose-200' : undefined}>{label}</span>
      {active ? (
        <span
          aria-hidden="true"
          className="ml-auto flex size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]"
        />
      ) : null}
      {shortcut ? <CommandShortcut className="ml-auto">{shortcut}</CommandShortcut> : null}
    </CommandItem>
  );
}
