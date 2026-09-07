import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { Callout, CodePanel, DocPage, DocSection, KindDot, LinkCard, CardGrid, Pill } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';

const EXTEND = {
  vanilla: `const globe = createGlobe({
  container,
  kind: 'outline',
  theme: {
    extends: 'outline-cyber',
    tokens: {
      'countries.border.color': '#6fb4ff',
      'countries.fill.defaultColor': '#15181d',
      'background.color': '#050608',
    },
  },
});`,
  react: `<Globe
  kind="outline"
  theme={{
    extends: 'outline-cyber',
    tokens: { 'countries.border.color': '#6fb4ff', 'background.color': '#050608' },
  }}
/>`,
  vue: `<VueGlobe kind="outline" :theme="{ extends: 'outline-cyber', tokens }" />`,
  angular: `<ng-globe kind="outline" [theme]="{ extends: 'outline-cyber', tokens }" />`,
};

export function Themes({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="Presets">
        <p>Thirteen presets, each tied to the kind it was designed for. A preset only declares the tokens that make it recognisable; the rest resolve to defaults.</p>
        {KIND_CHAPTERS.map((c) => (
          <div key={c.kind} className="docs-preset-row">
            <span className="docs-preset-kind">
              <KindDot kind={c.kind} />
              {c.title}
            </span>
            <span className="flex flex-wrap gap-2">
              {KIND_THEMES[c.kind].map((t) => (
                <Pill key={t.preset} title={t.label}>
                  <span aria-hidden="true" className="docs-kind-dot" style={{ background: t.swatch }} />
                  {t.preset}
                </Pill>
              ))}
            </span>
          </div>
        ))}
      </DocSection>

      <DocSection title="Extend a preset" eyebrow="theme.extends">
        <p>Start from the closest preset and override tokens by path. Unknown paths are a type error, so a typo never silently falls back to a default.</p>
        <CodePanel code={EXTEND} />
        <Callout tone="tip">
          The Studio's Theme panel writes exactly this shape. Tune the colours there, then copy the <code>theme</code> object.
        </Callout>
      </DocSection>

      <DocSection title="Go deeper">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('appearance/tokens')} eyebrow="theme.tokens" title="Theme tokens" description="Every path a renderer reads." />
          <LinkCard to={pageHref('api/theme-types')} eyebrow="ThemeInput" title="Theme types" description="TokenSet, ThemeInput and the preset names." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
