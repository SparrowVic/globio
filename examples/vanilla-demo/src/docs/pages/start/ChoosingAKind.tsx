import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { CardGrid, DocPage, DocSection, KindDot, LinkCard, SupportMatrix } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';

export const KIND_FEATURES = [
  { label: 'Country fills (choropleth)', support: { outline: true, dotted: true, paper: true, cinematic: true, hologram: 'partial' as const } },
  { label: 'Country borders', support: { outline: true, paper: true, cinematic: true, hologram: true } },
  { label: 'Hover and active states', support: { outline: true, dotted: true, paper: true, cinematic: true, hologram: true, wireframe: 'partial' as const } },
  { label: 'Markers and HTML markers', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Arcs', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Country labels', support: { outline: true, paper: true, cinematic: 'partial' as const } },
  { label: 'Atmosphere', support: { outline: true, dotted: true, hologram: true, cinematic: true } },
  { label: 'Post-processing', support: { cinematic: true, hologram: 'partial' as const } },
];

export function ChoosingAKind({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="By job">
        <ul>
          <li>
            <strong>Dashboards and choropleths</strong> — Outline or Dotted. Fills read best on a quiet surface.
          </li>
          <li>
            <strong>Hero sections and product shots</strong> — Cinematic. Bloom, clouds and a sun you can time.
          </li>
          <li>
            <strong>Status, network and infrastructure views</strong> — Wireframe or Hologram. Pulses and streams instead of fills.
          </li>
          <li>
            <strong>Editorial and print-like pages</strong> — Paper. Grain, ink borders and atlas labels.
          </li>
        </ul>
      </DocSection>

      <DocSection title="By feature">
        <SupportMatrix features={KIND_FEATURES} />
      </DocSection>

      <DocSection title="The six kinds">
        <CardGrid columns={2}>
          {KIND_CHAPTERS.map((c) => (
            <LinkCard key={c.kind} to={pageHref(`kinds/${c.kind}`)} leading={<KindDot kind={c.kind} />} eyebrow={`kind: '${c.kind}'`} title={c.title} description={c.tagline} />
          ))}
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
