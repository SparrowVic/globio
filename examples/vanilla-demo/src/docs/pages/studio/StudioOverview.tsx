import { Kbd } from '@/components/shared/components/Kbd';
import { ApiTable, Callout, CardGrid, DocPage, DocSection, LinkCard, Step, Steps } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';

const PANELS = [
  { name: 'Top bar', what: 'Kind, theme and preset selectors, plus the quick actions: replay the layer animation, reset the camera, manage saved items, export, reset.' },
  { name: 'Scene', what: 'Camera, focus and performance: position, auto-rotate, zoom, framing, focus pulse, frame budget.' },
  { name: 'Canonical layers', what: 'One inspector per layer the kinds share: countries, labels, markers, arcs, atmosphere, starfield, selection, focus pulse, crosshair.' },
  { name: 'Data', what: 'The data layer slot: choropleth, bars, extruded, heatmap, hex bins and charts with their datasets and animation.' },
  { name: 'Workshop', what: 'A card gallery of presets per kind with live previews; pick one and the main globe takes its config.' },
];

export function StudioOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The Studio is the configurator: every GlobeConfig key as a control, a live globe in the middle, and an export that gives you the exact config back.">
      <DocSection title="A session">
        <Steps>
          <Step title="Pick a kind and a theme">The top bar lists the six kinds and the presets of the active one. The Workshop shows presets as live cards.</Step>
          <Step title="Tune the panels">
            Every control maps to a config key. Changes apply live through <code>update()</code>; nothing is rebuilt unless the kind changes.
          </Step>
          <Step title="Export">
            <em>Export config as JSON</em> downloads the globe config and the active data layer. Paste the object into <code>createGlobe()</code> or spread it
            onto a wrapper component.
          </Step>
        </Steps>
      </DocSection>

      <DocSection title="Panels">
        <ApiTable
          columns={[
            { key: 'name', label: 'Area', className: 'docs-col-name' },
            { key: 'what', label: 'What it controls' },
          ]}
          rows={PANELS.map((p) => ({ id: `panel-${p.name.toLowerCase().replace(/\s+/g, '-')}`, cells: { name: p.name, what: p.what } }))}
        />
        <Callout tone="tip">
          Press <Kbd>⌘</Kbd>
          <Kbd>K</Kbd> anywhere in the Studio for the command palette: kinds, themes, presets and the quick actions by name.
        </Callout>
      </DocSection>

      <DocSection title="Go on">
        <CardGrid columns={3}>
          <LinkCard to="/studio" eyebrow="/studio" title="Open Studio" description="The configurator, in this browser." />
          <LinkCard to={pageHref('studio/export')} eyebrow="Export config as JSON" title="Export the config" description="What the file contains and how to use it." />
          <LinkCard to={pageHref('studio/presets')} eyebrow="Apply preset" title="Presets and saved themes" description="Built-in presets and your own, saved in the browser." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
