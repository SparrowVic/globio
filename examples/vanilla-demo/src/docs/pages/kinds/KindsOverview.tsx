import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { Callout, CardGrid, DocPage, DocSection, DocSubsection, KindCard, KindDot, LinkCard, SupportMatrix } from '@/components/docs';
import { KIND_DATA_LAYER_SUPPORT, KIND_LAYER_SUPPORT } from '@/docs/kind-support';
import { pageHref, type DocLocation } from '@/docs/manifest';

export function KindsOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="What each kind renders">
        <SupportMatrix features={KIND_LAYER_SUPPORT} />
        <DocSubsection title="Data layers">
          <SupportMatrix features={KIND_DATA_LAYER_SUPPORT} />
          <p>
            Data layers are rendered by per-kind decorations. Outline renders every type; Dotted and Cinematic a subset; the other kinds accept{' '}
            <code>setCountryData()</code> but ignore <code>setDataLayer()</code> with a warning.
          </p>
        </DocSubsection>
        <Callout tone="perf" title="Build cost">
          Building a kind is the one synchronous cost: roughly 60 ms (Wireframe, low resolution) to 400 ms (Cinematic, medium) on a 2023 laptop. Keep one globe
          building at a time and never during scroll.
        </Callout>
      </DocSection>
      <DocSection title="Pages">
        <CardGrid columns={2}>
          {KIND_CHAPTERS.map((c) => (
            <KindCard key={c.kind} kind={c.kind} title={c.title} description={c.description} />
          ))}
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
