import { Callout, CardGrid, CodePanel, DocPage, DocSection, DocSubsection, LinkCard, Pill, PropsTable } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

/**
 * Every page that has no dedicated component yet renders through this one:
 * the real title, summary and navigation, plus a representative body so
 * the layout can be judged before the content exists.
 */
export function SkeletonPage({ tab, group, page, prev, next }: DocLocation) {
  const key = page.eyebrow ?? page.title;
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary} meta={<Pill tone="gold">draft</Pill>}>
      <Callout tone="note" title="Placeholder page">
        The layout and navigation are final. The text, tables and examples for this page arrive with the first content pass.
      </Callout>

      <DocSection title="Overview">
        <p>
          This page will explain what <code>{key}</code> controls, what the defaults are, and how the setting interacts with the active kind. Each paragraph
          answers one question a reader has at that point: what it does, when to reach for it, what it costs.
        </p>
        <p>Where a setting is visible, the section carries a live preview beside the code that produces it.</p>
      </DocSection>

      <DocSection title="Configuration">
        <PropsTable
          rows={[
            { name: 'enabled', type: 'boolean', default: 'true', description: 'Turns the feature on. Off means the layer is never created, not merely hidden.' },
            { name: 'intensity', type: 'number', default: '1', description: 'Strength of the effect, 0 to 2. Values above 1 are allowed and clamped per kind.' },
            { name: 'color', type: 'string', default: 'theme token', description: 'Overrides the theme token for this layer only.', kinds: ['outline', 'dotted', 'cinematic'] },
          ]}
        />
      </DocSection>

      <DocSection title="Example">
        <CodePanel code={QUICK_START} caption="Representative example; the real one demonstrates this setting." />
        <DocSubsection title="Updating at runtime">
          <p>
            Every key documented here can be changed after mount with <code>globe.update()</code>. The renderer patches the running scene; nothing is rebuilt
            unless the kind changes.
          </p>
        </DocSubsection>
      </DocSection>

      {(prev || next) && (
        <DocSection title="Related">
          <CardGrid columns={2}>
            {prev && <LinkCard to={pageHref(prev.slug)} eyebrow={prev.eyebrow} title={prev.title} description={prev.summary} />}
            {next && <LinkCard to={pageHref(next.slug)} eyebrow={next.eyebrow} title={next.title} description={next.summary} />}
          </CardGrid>
        </DocSection>
      )}
    </DocPage>
  );
}
