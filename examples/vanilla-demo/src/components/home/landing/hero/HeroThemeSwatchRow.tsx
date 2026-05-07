import type { ThemePresetName } from '@your-globe/core';
import { ThemeSwatch } from '../atoms';
import type { KindThemeEntry } from '../data/kind-themes';

export interface HeroThemeSwatchRowProps {
  readonly themes: ReadonlyArray<KindThemeEntry>;
  readonly active: ThemePresetName;
  readonly onSelect: (theme: ThemePresetName) => void;
}

export function HeroThemeSwatchRow({ themes, active, onSelect }: HeroThemeSwatchRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 backdrop-blur-xl">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">themes</span>
      <div className="ml-auto flex gap-2">
        {themes.map((t) => (
          <ThemeSwatch
            key={t.preset}
            color={t.swatch}
            label={t.label}
            active={active === t.preset}
            size="sm"
            onClick={() => onSelect(t.preset)}
          />
        ))}
      </div>
    </div>
  );
}
