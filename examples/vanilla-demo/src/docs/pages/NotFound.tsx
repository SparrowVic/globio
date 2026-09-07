import { CardGrid, DocPage, LinkCard } from '@/components/docs';
import { DOCS_ROOT, DOCS_TABS, tabHref } from '@/docs/manifest';

export function NotFound({ slug }: { readonly slug: string }) {
  return (
    <DocPage eyebrow="404" title="No page here." lead={`Nothing lives at /docs/${slug}. It may have moved when the map was reorganised.`}>
      <CardGrid columns={2}>
        <LinkCard to={DOCS_ROOT} title="Docs home" description="Start again from the front door." />
        {DOCS_TABS.map((t) => (
          <LinkCard key={t.id} to={tabHref(t)} icon={t.icon} title={t.label} description={t.description} />
        ))}
      </CardGrid>
    </DocPage>
  );
}
