import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { CardGrid, DocPage, DocSection, KindCard, KindDot, LinkCard, SupportMatrix } from '@/components/docs';
import { KIND_DATA_LAYER_SUPPORT, KIND_LAYER_SUPPORT } from '@/docs/kind-support';
import { pageHref, type DocLocation } from '@/docs/manifest';

export function ChoosingAKind({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="By job">
        <ul>
          <li>
            <strong>Dashboards and choropleths</strong> — Outline renders all six data layer types. Dotted supports choropleth, bars, extruded countries and heatmaps; use Outline for hex bins and charts.
          </li>
          <li>
            <strong>Hero sections and product shots</strong> — Cinematic. Bloom, clouds and a sun you can time.
          </li>
          <li>
            <strong>Status, network and infrastructure views</strong> — Wireframe or Hologram. Grid pulses and scanline effects; choose another kind when country fills are required.
          </li>
          <li>
            <strong>Editorial and print-like pages</strong> — Paper. Grain, ink borders and atlas labels.
          </li>
        </ul>
      </DocSection>

      <DocSection title="By feature">
        <SupportMatrix features={KIND_LAYER_SUPPORT} />
        <p>Data layers narrow the choice further: Outline renders all six types, Dotted and Cinematic a subset.</p>
        <SupportMatrix features={KIND_DATA_LAYER_SUPPORT} />
      </DocSection>

      <DocSection title="The six kinds">
        <CardGrid columns={2}>
          {KIND_CHAPTERS.map((c) => (
            <KindCard key={c.kind} kind={c.kind} title={c.title} description={c.tagline} />
          ))}
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
