import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LivePreview, PropsTable } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { EVENTS, QUICK_START, kindSnippet } from '@/docs/snippets';

export function FirstGlobe({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={QUICK_START} highlightLines={[3, 4, 5, 6, 7, 8]} caption="Create, mount, listen." />
        <LivePreview kind="outline" theme="outline-cyber" interactive caption="Hover a country. This one is interactive." />
      </div>

      <DocSection title="Mount">
        <p>
          <code>createGlobe()</code> only builds the scene. <code>mount()</code> attaches the canvas, loads country geometry and starts the frame loop. The
          <code>ready</code> event fires once the shaders are compiled, which is the moment to reveal the element.
        </p>
        <PropsTable
          rows={[
            { name: 'container', type: 'HTMLElement', description: 'The element the canvas fills. Size it with CSS.', required: true },
            { name: 'kind', type: 'GlobeKind', default: "'outline'", description: 'Which renderer draws the globe.' },
            { name: 'theme', type: 'ThemePresetName | ThemeInput', default: 'kind default', description: 'A preset name or a preset extended with your tokens.' },
            { name: 'autoRotate', type: 'AutoRotateConfig', default: '{ enabled: false }', description: 'Ambient rotation. Yields to the pointer and resumes.' },
          ]}
        />
      </DocSection>

      <DocSection title="React to a click">
        <p>Events carry the country record, not just an id, so a click handler has the name and centroid ready.</p>
        <CodePanel code={EVENTS} />
        <Callout tone="note">
          Country ids are zero-padded ISO 3166-1 numeric strings such as <code>'616'</code> for Poland and <code>'010'</code> for Antarctica. Keys you pass in
          are normalised, so <code>616</code> and <code>'616'</code> both work.
        </Callout>
      </DocSection>

      <DocSection title="Change anything live">
        <p>
          <code>update()</code> takes a partial config. Switching the kind rebuilds the renderer in place; every other key is patched on the running scene.
        </p>
        <CodePanel code={kindSnippet('outline', 'outline-cyber')} />
        <DocSubsection title="Tear down">
          <p>
            Call <code>destroy()</code> when the element leaves the page. It releases the WebGL context, the workers and every listener. The wrappers do this
            for you on unmount.
          </p>
        </DocSubsection>
      </DocSection>
    </DocPage>
  );
}
