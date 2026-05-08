import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import { KIND_ACCENT, KIND_THEMES } from '../data/kind-themes';
import { HeroKindCard } from './HeroKindCard';
import { HeroThemeSwatchRow } from './HeroThemeSwatchRow';
import { HeroCodePreview } from './HeroCodePreview';

const KIND_LIST: ReadonlyArray<{
  readonly id: GlobeKind;
  readonly label: string;
  readonly caption: string;
}> = [
  { id: 'outline', label: 'Outline', caption: 'Crisp borders & glow' },
  { id: 'dotted', label: 'Dotted', caption: 'Stippled data feel' },
  { id: 'wireframe', label: 'Wireframe', caption: 'Pure topology' },
  { id: 'hologram', label: 'Hologram', caption: 'Futuristic scanlines' },
  { id: 'paper', label: 'Paper', caption: 'Atlas & ink texture' },
];

export interface HeroRightRailProps {
  readonly activeKind: GlobeKind;
  readonly activeTheme: ThemePresetName;
  readonly onKindChange: (kind: GlobeKind) => void;
  readonly onThemeChange: (theme: ThemePresetName) => void;
}

export function HeroRightRail({
  activeKind,
  activeTheme,
  onKindChange,
  onThemeChange,
}: HeroRightRailProps) {
  const themes = KIND_THEMES[activeKind];

  return (
    <div className="relative z-20 flex flex-col gap-4 pt-16 max-[1500px]:gap-3 max-[1500px]:pt-10">
      <div className="grid gap-2.5">
        {KIND_LIST.map((kind) => (
          <HeroKindCard
            key={kind.id}
            kind={kind.id}
            label={kind.label}
            caption={kind.caption}
            active={activeKind === kind.id}
            accent={KIND_ACCENT[kind.id]}
            onClick={() => onKindChange(kind.id)}
          />
        ))}
      </div>

      {themes.length > 1 && (
        <HeroThemeSwatchRow themes={themes} active={activeTheme} onSelect={onThemeChange} />
      )}
      <HeroCodePreview kind={activeKind} theme={activeTheme} />
    </div>
  );
}
