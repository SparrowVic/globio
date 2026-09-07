import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview, Methods } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { LABELS } from '@/docs/snippets';

export function Labels({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Country names as HTML at each centroid: they fade by apparent size, hide behind the globe, and take per-id overrides for localisation.">
      <div className="docs-two-col">
        <CodePanel code={LABELS} caption="Enable with a stricter size threshold and a German label; toggle later." />
        <LivePreview kind="paper" caption="Paper's atlas labels are this layer with the kind's typography tokens." />
      </div>
      <DocSection title="Configuration" id="configuration" eyebrow="countryLabels">
        <ConfigKeys path="countryLabels" />
        <Callout tone="note">
          Labels are <code>pointer-events: none</code>, so they never steal clicks from the globe. Colour, size and font come from the{' '}
          <code>countries.label.*</code> tokens unless overridden here.
        </Callout>
      </DocSection>
      <DocSection title="At runtime" id="runtime">
        <Methods names={['setCountryLabelsEnabled', 'setCountryLabels']} guide={false} />
      </DocSection>
    </DocPage>
  );
}
