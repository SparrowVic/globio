import { Callout, CodePanel, DocPage, DocSection, EventsTable } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { EVENTS } from '@/docs/snippets';

export const EVENT_ROWS = [
  { name: 'ready', payload: '()', description: 'Shaders compiled, first frame drawn. Reveal the element now.' },
  { name: 'error', payload: '(error: Error)', description: 'Geometry failed to load or WebGL is unavailable.' },
  { name: 'countryClick', payload: '(event: CountryEvent)', description: 'A country was clicked. Carries id, name, centroid and the pointer position.' },
  { name: 'countryHover', payload: '(event: CountryEvent | null)', description: 'Pointer entered a country, or left all of them (null).' },
  { name: 'markerClick', payload: '(event: MarkerEvent)', description: 'A pin was clicked. Carries the MarkerConfig you passed in.' },
  { name: 'markerHover', payload: '(event: MarkerEvent | null)', description: 'Pointer entered or left a pin.' },
  { name: 'surfaceClick', payload: '(event: SurfaceClickEvent)', description: 'A click on the globe that hit no country: ocean or empty space. Never fires together with countryClick.' },
  { name: 'sceneEnter', payload: '(event: StorySceneEvent)', description: 'The story engine entered a scene.' },
  { name: 'sceneExit', payload: '(event: StorySceneEvent)', description: 'The story engine left a scene.' },
  { name: 'storyComplete', payload: '(event: StoryCompleteEvent)', description: 'The last scene finished and the story does not loop.' },
];

export function Events({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="Subscribe" eyebrow="globe.on()">
        <CodePanel code={EVENTS} caption="Hover payloads are null on leave, so one handler covers both directions." />
        <p>
          <code>on()</code> returns nothing; pass the same function to <code>off()</code> to unsubscribe. The wrappers expose every event as a callback prop
          and unsubscribe on unmount.
        </p>
      </DocSection>
      <DocSection title="All events" eyebrow="GlobeEvents">
        <EventsTable rows={EVENT_ROWS} />
        <Callout tone="note">
          Hover events are throttled to the frame rate and only fire when the country under the pointer changes; they are safe to bind to React state.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
