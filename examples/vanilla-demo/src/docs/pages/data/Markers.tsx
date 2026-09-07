import { Callout, CodePanel, DocPage, DocSection, DocSubsection, PropsTable } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { MARKERS } from '@/docs/snippets';

const HTML_MARKERS = {
  vanilla: `globe.setHtmlMarkers([
  {
    id: 'hq',
    position: [51.11, 17.03],
    element: card,          // any HTMLElement you own
    occlude: true,          // hides behind the globe
  },
]);`,
  react: `<Globe htmlMarkers={[{ id: 'hq', position: [51.11, 17.03], element: cardRef.current!, occlude: true }]} />`,
  vue: `<VueGlobe :html-markers="htmlMarkers" />`,
  angular: `<ng-globe [htmlMarkers]="htmlMarkers" />`,
};

export function Markers({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="Pins" eyebrow="MarkerConfig">
        <CodePanel code={MARKERS} caption="Two markers, one pulsing, one custom-coloured." />
        <PropsTable
          rows={[
            { name: 'id', type: 'string', description: 'Stable identity for add, remove and events.', required: true },
            { name: 'position', type: '[lat, lng]', description: 'Degrees.', required: true },
            { name: 'color', type: 'string', default: 'theme accent', description: 'Pin colour.' },
            { name: 'size', type: 'number', default: '1', description: 'Scale factor relative to the theme size.' },
            { name: 'hoverScale', type: 'number', default: '1.25', description: 'Scale on hover.' },
            { name: 'label', type: 'string', description: 'Text drawn next to the pin.' },
            { name: 'pulse', type: 'boolean | PulseConfig', default: 'false', description: 'Expanding rings under the pin.' },
            { name: 'data', type: 'Record<string, unknown>', description: 'Anything you want back in marker events.' },
          ]}
        />
      </DocSection>

      <DocSection title="HTML markers" eyebrow="htmlMarkers">
        <p>When a pin is not enough, anchor your own element to a coordinate. The engine positions it every frame and can hide it behind the globe.</p>
        <CodePanel code={HTML_MARKERS} />
        <DocSubsection title="Occlusion">
          <p>
            With <code>occlude: true</code> the element fades as its anchor passes the limb. Turn it off for labels that must always be readable.
          </p>
        </DocSubsection>
        <Callout tone="perf">
          Hundreds of pins are fine; hundreds of HTML markers are not, because each is a DOM node repositioned per frame. Use pins with{' '}
          <code>data</code> and one shared tooltip instead.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
