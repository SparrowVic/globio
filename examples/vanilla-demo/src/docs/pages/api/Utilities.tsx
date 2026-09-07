import { AFRICA, ASEAN, ASIA, AU, BRICS, EFTA, EU, EUROPE, G20, G7, MERCOSUR, NATO, NORTH_AMERICA, OCEANIA, OECD, PRESET_DEFAULT_KIND, SOUTH_AMERICA, THEME_PRESETS } from '@your-globe/core';
import { ApiTable, Callout, CodePanel, DocPage, DocSection, KindDot, MethodsTable, Signature, Types } from '@/components/docs';
import type { GlobeKind } from '@your-globe/core';
import type { DocLocation } from '@/docs/manifest';

const REGIONS: ReadonlyArray<{ readonly name: string; readonly ids: ReadonlyArray<string>; readonly what: string }> = [
  { name: 'G7', ids: G7, what: 'Group of Seven' },
  { name: 'G20', ids: G20, what: 'Group of Twenty' },
  { name: 'NATO', ids: NATO, what: 'North Atlantic Treaty Organization' },
  { name: 'EU', ids: EU, what: 'European Union' },
  { name: 'BRICS', ids: BRICS, what: 'BRICS, including the 2024 members' },
  { name: 'ASEAN', ids: ASEAN, what: 'Association of Southeast Asian Nations' },
  { name: 'OECD', ids: OECD, what: 'OECD members' },
  { name: 'EFTA', ids: EFTA, what: 'European Free Trade Association' },
  { name: 'MERCOSUR', ids: MERCOSUR, what: 'Southern Common Market' },
  { name: 'AU', ids: AU, what: 'African Union' },
  { name: 'EUROPE', ids: EUROPE, what: 'Continent' },
  { name: 'ASIA', ids: ASIA, what: 'Continent' },
  { name: 'AFRICA', ids: AFRICA, what: 'Continent' },
  { name: 'NORTH_AMERICA', ids: NORTH_AMERICA, what: 'Continent' },
  { name: 'SOUTH_AMERICA', ids: SOUTH_AMERICA, what: 'Continent' },
  { name: 'OCEANIA', ids: OCEANIA, what: 'Continent' },
];

export function EasingPage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Curves for camera moves and scene transitions. Any function from progress to progress works; three are exported.">
      <CodePanel
        code={{
          vanilla: `import { easeInOutCubic, easeOutCubic, linear } from '@your-globe/core';

globe.flyTo([52.23, 21.01], 2.4, { duration: 1400, easing: easeOutCubic });

// Your own curve: t in [0, 1] → eased t in [0, 1]
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
globe.flyTo([35.68, 139.69], undefined, { easing: easeOutQuart });`,
        }}
      />
      <DocSection title="Exported curves" id="curves">
        <MethodsTable
          rows={[
            { name: 'linear', signature: 'linear(t: number): number', description: 'Constant speed.' },
            { name: 'easeOutCubic', signature: 'easeOutCubic(t: number): number', description: 'Fast start, gentle arrival. The default for data-layer mount animations.' },
            { name: 'easeInOutCubic', signature: 'easeInOutCubic(t: number): number', description: 'Slow at both ends. The default for flyTo, focusOnCountry and story transitions.' },
          ]}
        />
      </DocSection>
      <DocSection title="Types" id="types">
        <Types names={['EasingFunction', 'EasingName']} />
        <Callout tone="note">
          Story scenes accept the CSS-like names as well as functions; instance methods take functions only.
        </Callout>
      </DocSection>
    </DocPage>
  );
}

export function CountryIdsPage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Countries are keyed by ISO 3166-1 numeric codes as zero-padded three-character strings, exactly as world-atlas names its features.">
      <Signature code={`normalizeCountryId(id: string | number): string\nnormalizeCountryKeys<T>(map: Record<string, T>): Record<string, T>`} />
      <CodePanel
        code={{
          vanilla: `import { NATO, normalizeCountryId, normalizeCountryKeys } from '@your-globe/core';

normalizeCountryId(32);        // '032'  Argentina
normalizeCountryId('616');     // '616'  Poland
normalizeCountryId('XK');      // 'XK'   non-numeric ids pass through

// Every id-keyed API normalises for you:
globe.setCountryData(normalizeCountryKeys({ 76: { value: 12 }, '840': { value: 40 } }));

// Built-in groupings, already padded:
globe.setCountryData(Object.fromEntries(NATO.map((id) => [id, { color: '#6fb4ff' }])));`,
        }}
      />
      <DocSection title="Why numeric ids" id="why">
        <p>
          The engine draws world-atlas geometry, whose feature ids are numeric ISO codes. Alpha-2 codes such as <code>'PL'</code> are not a key the engine
          knows, so they match nothing; convert once at the edge of your app.
        </p>
        <p>
          <code>setCountryData</code>, <code>setCountryLabels</code>, <code>focusOnCountry</code>, <code>setActiveCountry</code> and story scenes all run their
          input through <code>normalizeCountryId</code>, so string ids <code>'32'</code> and <code>'032'</code> refer to the same country. The normalizer and object keys accept numbers; methods typed with a string id require strings.
        </p>
      </DocSection>
      <DocSection title="Region groupings" id="regions" lead="Importable static arrays from the package. These are bundled snapshots, not a live membership service.">
        <ApiTable
          columns={[
            { key: 'name', label: 'Export', className: 'docs-col-name' },
            { key: 'count', label: 'Countries' },
            { key: 'what', label: 'What' },
          ]}
          rows={REGIONS.map((r) => ({ id: `region-${r.name}`, cells: { name: <code>{r.name}</code>, count: r.ids.length, what: r.what } }))}
        />
      </DocSection>
    </DocPage>
  );
}

export function PresetsPage({ tab, group, page }: DocLocation) {
  const presets = Object.keys(THEME_PRESETS) as ReadonlyArray<keyof typeof THEME_PRESETS>;
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The built-in presets, the kind each one selects by default, and the registry for your own.">
      <DocSection title="THEME_PRESETS and PRESET_DEFAULT_KIND" id="presets">
        <p>
          <code>THEME_PRESETS</code> maps a preset name to the partial token set it declares. <code>PRESET_DEFAULT_KIND</code> maps it to the kind{' '}
          <code>createGlobe()</code> picks when the config names the theme but not the kind.
        </p>
        <ApiTable
          columns={[
            { key: 'name', label: 'Preset', className: 'docs-col-name' },
            { key: 'kind', label: 'Default kind' },
            { key: 'tokens', label: 'Declared tokens' },
          ]}
          rows={presets.map((name) => {
            const kind = PRESET_DEFAULT_KIND[name] as GlobeKind;
            return {
              id: `preset-${name}`,
              cells: {
                name: <code>{name}</code>,
                kind: (
                  <span className="inline-flex items-center gap-2">
                    <KindDot kind={kind} />
                    {kind}
                  </span>
                ),
                tokens: Object.keys(THEME_PRESETS[name]).length,
              },
            };
          })}
        />
      </DocSection>
      <DocSection title="Custom presets" id="custom">
        <MethodsTable
          rows={[
            { name: 'registerThemePreset', signature: 'registerThemePreset(name: string, tokens: PartialTokenSet): void', description: 'Register a partial token set under a name; use it anywhere a preset name is accepted, including extends.' },
            { name: 'unregisterThemePreset', signature: 'unregisterThemePreset(name: string): void', description: 'Remove a custom preset. Built-ins cannot be removed.' },
            { name: 'listCustomPresets', signature: 'listCustomPresets(): ReadonlyArray<string>', description: 'Names registered at runtime.' },
            { name: 'resolveTheme', signature: 'resolveTheme(input?: ThemeInput): ResolvedTokens', description: 'The complete token set for an input, as the renderers see it.' },
          ]}
        />
        <Callout tone="tip">
          Register brand presets once at startup and pass their names from then on; the Studio can export a preset as the token object this call takes.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
