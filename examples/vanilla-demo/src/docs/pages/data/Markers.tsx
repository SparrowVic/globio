import { Callout, CodePanel, DocPage, DocSection, DocSubsection, Events, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { MARKERS } from '@/docs/snippets';

const HTML_MARKERS = {
  vanilla: `globe.setHtmlMarkers([
  {
    id: 'hq',
    position: [51.11, 17.03],
    content: () => card,          // an HTMLElement you own, or an HTML string
    anchor: 'bottom',
    offset: [0, -8],
    hideWhenOccluded: true,
  },
]);`,
  react: `<Globe htmlMarkers={[{ id: 'hq', position: [51.11, 17.03], content: () => cardRef.current!, anchor: 'bottom' }]} />`,
  vue: `<VueGlobe :html-markers="htmlMarkers" />`,
  angular: `<ng-globe [htmlMarkers]="htmlMarkers" />`,
};

export function Markers({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Pins drawn by the kind, and DOM elements anchored to coordinates when a pin is not enough.">
      <div className="docs-two-col">
        <CodePanel code={MARKERS} caption="Two pins, one pulsing, one custom-coloured, and a click handler." />
        <LivePreview kind="outline" theme="outline-cyber" caption="Pins scale up on hover and show their label in a tooltip." />
      </div>

      <DocSection title="Pins" id="pins" eyebrow="markers">
        <p>
          Markers are one instanced mesh per kind, so thousands cost the same as ten. Each kind draws them in its own style. Hover scales a pin up and shows
          a tooltip with its <code>label</code>; click and hover events return the marker you passed in, <code>data</code> included.
        </p>
        <Types names={['MarkerConfig']} />
        <Methods names={['setMarkers', 'addMarker', 'removeMarker']} guide={false} />
        <Events names={['markerClick', 'markerHover']} guide={false} />
      </DocSection>

      <DocSection title="HTML markers" id="html-markers" eyebrow="htmlMarkers">
        <p>
          Your own element, positioned every frame at a coordinate and faded out when it passes the limb. Use it for cards, badges and anything with its own
          interaction.
        </p>
        <CodePanel code={HTML_MARKERS} />
        <Types names={['HtmlMarkerConfig']} />
        <Methods names={['setHtmlMarkers', 'addHtmlMarker', 'removeHtmlMarker']} guide={false} />
        <DocSubsection title="Cost">
          <Callout tone="perf">
            Hundreds of pins are fine; hundreds of HTML markers are not, because each is a DOM node repositioned per frame. Prefer pins with{' '}
            <code>data</code> and one shared tooltip, or <code>project()</code> for a handful of overlays you position yourself.
          </Callout>
        </DocSubsection>
      </DocSection>
    </DocPage>
  );
}
