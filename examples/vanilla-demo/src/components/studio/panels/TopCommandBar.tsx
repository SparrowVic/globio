import { DropdownMenu } from 'radix-ui';
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
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import { faCommand } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';


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
  readonly onImport: () => void;
  readonly onReset: () => void;
  /** Open the ⌘K command palette (drives the right-side hint chip + button). */
  readonly onCommandPalette: () => void;
}

/** Scene identity stays visible; project transfer and secondary actions have named controls. */
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
  onImport,
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
    <header className="studio-toolbar">
      <Link to="/" aria-label="Back to Globio home" className="studio-toolbar-brand">
        <FontAwesomeIcon icon={faGlobePointer} aria-hidden="true" />
        <span>Globio <span className="studio-toolbar-product">/ Studio</span></span>
      </Link>
      <div className="studio-toolbar-selects">
        <GroupedSelectField<GlobeKind>
          label="Kind" configPath="kind" feature="kind" hideLabel value={state.globe.kind}
          groups={kindGroups} onChange={(kind) => onGlobeChange(globeDefaultsForKind(kind))}
          triggerClassName="studio-identity-select"
        />
        <GroupedSelectField<ThemePresetName>
          label="Theme" configPath="theme" feature="theme" hideLabel value={state.globe.theme}
          groups={themeGroups} onChange={(theme) => onGlobeChange({ theme })}
          triggerClassName="studio-identity-select"
        />
        <GroupedSelectField<string>
          label="Preset" feature="studio-presets" hideLabel placeholder={presetTriggerLabel}
          groups={presetGroups} onChange={onPreset}
          triggerClassName={cn('studio-identity-select', state.dirtySincePreset && 'is-modified')}
        />
      </div>
      <div className="studio-toolbar-actions">
        <button type="button" className="studio-tool-button studio-search" onClick={onCommandPalette} aria-label="Search Studio commands">
          <FontAwesomeIcon icon={faCommand} aria-hidden="true" /><span>Search</span>
        </button>
        <button type="button" className="studio-tool-button" onClick={onImport}>Open project</button>
        <button type="button" className="studio-tool-button studio-tool-button--primary" onClick={onExport}>Export <FontAwesomeIcon icon={faDownload} aria-hidden="true" /></button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild><button type="button" className="studio-tool-button studio-more" aria-label="More Studio actions">•••</button></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="studio-action-menu" align="end" sideOffset={8}>
              <DropdownMenu.Item onSelect={onCommandPalette}>Search commands <span>⌘ / Ctrl K</span></DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={onSavePreset}><FontAwesomeIcon icon={faBookmark} />Save current as preset</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onManageSaved}><FontAwesomeIcon icon={faFolderOpen} />Manage saved themes &amp; presets</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onCreateTheme}><FontAwesomeIcon icon={faPlus} />Create custom theme</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item disabled={!ready} onSelect={onReplay}><FontAwesomeIcon icon={faPlay} />Replay layer animation</DropdownMenu.Item>
              <DropdownMenu.Item disabled={!ready} onSelect={onHome}><FontAwesomeIcon icon={faHouseChimney} />Reset camera to home view</DropdownMenu.Item>
              <DropdownMenu.Item asChild><Link to="/docs/studio/overview">Studio guide <span>↗</span></Link></DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={onReset}><FontAwesomeIcon icon={faArrowsRotate} />Reset configurator (reload)</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

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
