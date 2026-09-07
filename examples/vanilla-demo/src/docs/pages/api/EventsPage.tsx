import { Callout, CodePanel, DocPage, DocSection, Events, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { EVENTS } from '@/docs/snippets';

export function EventsPage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Every event the instance emits, with the payload each handler receives.">
      <CodePanel code={EVENTS} caption="on() returns the unsubscribe function; off() takes the same handler." />
      <DocSection title="GlobeEvents" id="globe-events">
        <Events />
        <Callout tone="note">
          Hover events fire only when the country or marker under the pointer changes, and pass <code>null</code> on leave. They are safe to bind to
          framework state.
        </Callout>
      </DocSection>
      <DocSection title="Payload types" id="payloads">
        <Types names={['CountryEvent', 'CountryData', 'MarkerEvent', 'SurfaceClickEvent', 'StorySceneEvent', 'StoryCompleteEvent']} />
      </DocSection>
    </DocPage>
  );
}
