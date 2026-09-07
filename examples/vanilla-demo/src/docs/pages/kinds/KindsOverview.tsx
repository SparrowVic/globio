import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { Callout, CardGrid, DocPage, DocSection, KindDot, LinkCard, SupportMatrix } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { KIND_FEATURES } from '../start/ChoosingAKind';

export function KindsOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="Feature support">
        <SupportMatrix features={KIND_FEATURES} />
        <Callout tone="perf" title="Build cost">
          Kind build time at medium country resolution ranges from about 80 ms (Wireframe) to 370 ms (Cinematic) on a 2023 laptop. Use{' '}
          <code>countries.resolution: 'low'</code> for decorative globes and keep one globe building at a time.
        </Callout>
      </DocSection>
      <DocSection title="Pages">
        <CardGrid columns={2}>
          {KIND_CHAPTERS.map((c) => (
            <LinkCard key={c.kind} to={pageHref(`kinds/${c.kind}`)} leading={<KindDot kind={c.kind} />} eyebrow={`kind: '${c.kind}'`} title={c.title} description={c.description} />
          ))}
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
