import { Callout, CardGrid, DocPage, DocSection, LinkCard } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';

/** Safe fallback for a manifest entry that has no dedicated article yet. */
export function SkeletonPage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <Callout tone="note" title="Article unavailable">
        This guide has no dedicated article yet. Use the source-backed API reference for supported settings and behavior.
      </Callout>
      <DocSection title="Reference">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('api/globe-config')} title="GlobeConfig" description="Configuration types and defaults." />
          <LinkCard to={pageHref('api/globe-instance')} title="GlobeInstance" description="Runtime methods and their signatures." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
