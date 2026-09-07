import { Callout, CodePanel, DocPage, DocSection, Events, LivePreview } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { EVENTS } from '@/docs/snippets';

export function EventsGuide({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Ten events cover interaction, lifecycle and the story engine. Subscribe by name; the wrappers expose the same set as callbacks, emits and outputs.">
      <div className="docs-two-col">
        <CodePanel code={EVENTS} caption="A hover tooltip and a fly-to on empty-surface clicks." />
        <LivePreview kind="outline" theme="outline-cyber" interactive caption="Interactive: hover and click fire the events documented here." />
      </div>
      <DocSection title="Subscribe" id="subscribe" eyebrow="globe.on()">
        <p>
          <code>on()</code> returns the unsubscribe function; <code>off()</code> takes the same handler. Hover events fire only when the country or marker under
          the pointer changes and pass <code>null</code> on leave, so one handler covers both directions.
        </p>
      </DocSection>
      <DocSection title="Interaction events" id="interaction">
        <Events names={['countryClick', 'countryHover', 'markerClick', 'markerHover']} guide={false} />
      </DocSection>
      <DocSection title="Surface clicks" id="surface-clicks" eyebrow="surfaceClick">
        <p>
          A click that lands on the globe but on no country. Use it to fly to the clicked point, to clear a selection, or to place a marker. It never fires
          together with <code>countryClick</code>.
        </p>
        <Events names={['surfaceClick']} guide={false} />
      </DocSection>
      <DocSection title="Lifecycle and story events" id="lifecycle">
        <Events names={['ready', 'error', 'sceneEnter', 'sceneExit', 'storyComplete']} guide={false} />
        <Callout tone="tip">
          Reveal the container on <code>ready</code>, not on mount: it fires once countries are loaded and the shaders are compiled, so the first frame the
          reader sees is a finished one.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
