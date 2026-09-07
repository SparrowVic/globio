import { PRESET_DEFAULT_KIND, THEME_PRESETS, type GlobeKind, type ThemePresetName } from '@your-globe/core';
import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { Callout, CardGrid, CodePanel, DocPage, DocSection, KindDot, LinkCard, LivePreview, Pill } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { THEME_EXTEND } from '@/docs/snippets';

const swatchFor = (kind: GlobeKind, preset: string): string | undefined => KIND_THEMES[kind].find((t) => t.preset === preset)?.swatch;

export function Themes({ tab, group, page }: DocLocation) {
  const presets = Object.keys(THEME_PRESETS) as ReadonlyArray<ThemePresetName>;
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="A theme is a token set: every colour, width, opacity and font the renderers read, addressed by path. Presets are partial sets over the defaults.">
      <div className="docs-two-col">
        <CodePanel code={THEME_EXTEND} caption="Extend inline, or register a preset once and use it by name." />
        <LivePreview kind="outline" theme="outline-sunset" caption="outline-sunset: the same Outline renderer, different tokens." />
      </div>

      <DocSection title="Presets" id="presets" lead={`${presets.length} built-in presets, listed with the kind each selects when the config names no kind.`}>
        {KIND_CHAPTERS.map((c) => {
          const own = presets.filter((p) => PRESET_DEFAULT_KIND[p] === c.kind);
          return (
            <div key={c.kind} className="docs-preset-row">
              <span className="docs-preset-kind">
                <KindDot kind={c.kind} />
                {c.title}
              </span>
              <span className="flex flex-wrap gap-2">
                {own.map((p) => (
                  <Pill key={p} title={`${Object.keys(THEME_PRESETS[p]).length} tokens declared`}>
                    <span aria-hidden="true" className="docs-kind-dot" style={{ background: swatchFor(c.kind, p) ?? '#8a94a6' }} />
                    {p}
                  </Pill>
                ))}
              </span>
            </div>
          );
        })}
        <p>
          Naming a preset without a <code>kind</code> is enough: <code>theme: 'dotted-dark'</code> renders the Dotted kind. Naming a kind with another kind's
          preset is allowed and applies the tokens the kind understands.
        </p>
      </DocSection>

      <DocSection title="Extend a preset" id="extend" eyebrow="theme.extends">
        <p>
          Start from the closest preset and override tokens by path. TypeScript checks token names in typed config objects. JavaScript callers should check names against the token reference.
          <code>resolveTheme()</code> returns the complete token set. Choose the theme at creation; changing the theme field with update() does not reapply tokens to an existing scene.
        </p>
        <Callout tone="tip">
          The Studio's theme panel writes exactly this shape. Tune the colours there, then copy the <code>theme</code> object or register it as a preset at
          startup.
        </Callout>
      </DocSection>

      <DocSection title="Go deeper">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('appearance/tokens')} eyebrow="theme.tokens" title="Theme tokens" description="Every path, with the resolved value per preset." />
          <LinkCard to={pageHref('api/presets')} eyebrow="registerThemePreset()" title="Presets" description="The registry for your own presets." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
