import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { Callout, CardGrid, CodePanel, ConfigKeys, DocPage, DocSection, DocSubsection, KindDot, LinkCard, LivePreview, Pill, SupportMatrix } from '@/components/docs';
import { getFeature } from '@/docs/features';
import { KIND_DATA_LAYER_SUPPORT, KIND_LAYER_SUPPORT } from '@/docs/kind-support';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { kindSnippet } from '@/docs/snippets';

export function KindPage({ tab, group, page }: DocLocation) {
  const kind = page.kind ?? 'outline';
  const chapter = KIND_CHAPTERS.find((c) => c.kind === kind);
  const feature = getFeature(`kind-${kind}`);
  const themes = KIND_THEMES[kind];
  const accent = themes[0]?.swatch;
  const preset = themes[0]?.preset ?? 'outline-dark';
  const siblings = KIND_CHAPTERS.filter((c) => c.kind !== kind);

  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={chapter?.tagline ?? page.title}
      lead={chapter?.description ?? feature?.summary ?? page.summary}
      accent={accent}
      meta={
        <>
          <Pill tone="accent">
            <KindDot kind={kind} />
            {chapter?.title ?? kind}
          </Pill>
          <Pill>
            {themes.length} {themes.length === 1 ? 'theme' : 'themes'}
          </Pill>
          {chapter?.traits.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </>
      }
    >
      <div className="docs-two-col">
        <LivePreview kind={kind} theme={preset} caption={`kind: '${kind}' with ${preset}.`} />
        <CodePanel code={kindSnippet(kind, preset)} caption="The kind is one key; switching it keeps every other setting." />
      </div>

      <DocSection title="Themes" eyebrow="theme">
        <p>Every preset is a partial token set over the defaults. Pick one by name, or extend it with your own tokens on the themes page.</p>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Pill key={t.preset} title={t.label}>
              <span aria-hidden="true" className="docs-kind-dot" style={{ background: t.swatch }} />
              {t.preset}
            </Pill>
          ))}
        </div>
      </DocSection>

      <DocSection title="Options" eyebrow={kind} lead={`Everything under the ${kind} key of GlobeConfig, generated from the types. Other kinds ignore this section.`}>
        <ConfigKeys path={kind} />
        <DocSubsection title="Shared keys">
          <p>
            Countries, markers, arcs, atmosphere, starfield, camera and performance keys are the same for every kind and documented on their own pages;
            the GlobeConfig reference lists them all.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="What it renders">
        <SupportMatrix features={KIND_LAYER_SUPPORT} kinds={[kind]} />
        <DocSubsection title="Data layers">
          <SupportMatrix features={KIND_DATA_LAYER_SUPPORT} kinds={[kind]} />
          <p>
            <code>setDataLayer()</code> with a type this kind does not render logs a warning and draws nothing; <code>setCountryData()</code> works on every
            kind.
          </p>
        </DocSubsection>
        <Callout tone="perf">
          Build time depends on <code>countries.resolution</code> more than on the kind: 60 to 400 ms at medium resolution on a 2023 laptop, measured by the
          engine's own timing marks. Use low resolution for decorative globes.
        </Callout>
      </DocSection>

      <DocSection title="Other kinds">
        <CardGrid columns={2}>
          {siblings.map((c) => (
            <LinkCard key={c.kind} to={pageHref(`kinds/${c.kind}`)} leading={<KindDot kind={c.kind} />} eyebrow={`kind: '${c.kind}'`} title={c.title} description={c.tagline} />
          ))}
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
