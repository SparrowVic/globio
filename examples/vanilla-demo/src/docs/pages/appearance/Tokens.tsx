import { useMemo, useState } from 'react';
import { DEFAULT_TOKENS, THEME_PRESETS, resolveTheme, type ThemePresetName } from '@your-globe/core';
import { Callout, CodePanel, DocPage, DocSection, TokenSwatches, type TokenEntry } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { THEME_EXTEND } from '@/docs/snippets';

const GROUP_LABEL: Readonly<Record<string, string>> = {
  background: 'Background',
  globe: 'Globe surface',
  countries: 'Countries',
  markers: 'Markers',
  arcs: 'Arcs',
  atmosphere: 'Atmosphere',
  starfield: 'Starfield',
  tooltip: 'Tooltip',
  legend: 'Legend',
  labels: 'Labels',
  lights: 'Lights',
};

const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const groupOf = (key: string): string => key.split('.')[0] ?? key;

export function Tokens({ tab, group, page }: DocLocation) {
  const presets = Object.keys(THEME_PRESETS) as ReadonlyArray<ThemePresetName>;
  const [preset, setPreset] = useState<ThemePresetName | 'defaults'>('defaults');
  const resolved = useMemo(() => (preset === 'defaults' ? DEFAULT_TOKENS : resolveTheme(preset)), [preset]);
  const declared = useMemo(() => new Set(preset === 'defaults' ? [] : Object.keys(THEME_PRESETS[preset])), [preset]);

  const groups = useMemo(() => {
    const map = new Map<string, TokenEntry[]>();
    for (const [key, value] of Object.entries(resolved)) {
      const g = groupOf(key);
      const list = map.get(g) ?? [];
      list.push({ name: key, value: value as string | number, description: declared.has(key) ? 'set by this preset' : undefined });
      map.set(g, list);
    }
    return [...map.entries()];
  }, [resolved, declared]);

  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={`${Object.keys(DEFAULT_TOKENS).length} token paths, read live from the engine. Pick a preset to see the values it resolves to; rows a preset declares are marked.`}
    >
      <div className="docs-toolbar">
        <label className="docs-select">
          <span>Preset</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value as ThemePresetName | 'defaults')}>
            <option value="defaults">defaults</option>
            {presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      {groups.map(([g, tokens]) => (
        <DocSection key={g} id={`tokens-${g}`} title={GROUP_LABEL[g] ?? titleCase(g)} eyebrow={`${g}.*`}>
          <TokenSwatches tokens={tokens} />
        </DocSection>
      ))}
      <DocSection title="Override a token" id="override">
        <CodePanel code={THEME_EXTEND} />
        <Callout tone="note">
          Some renderers also accept per-instance overrides in their config (for example <code>countries.borderHover</code>); those win over the theme for
          that globe only.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
