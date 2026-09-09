import { Kbd } from '@/components/shared/components/Kbd';
import { ApiTable, Callout, CardGrid, DocPage, DocSection, LinkCard, Step, Steps } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';

const PANELS = [
  { name: 'Top bar', what: 'Kind, theme and preset selectors, plus camera, replay, saved items, Open project and Export actions.' },
  { name: 'Scene', what: 'Camera, focus and performance: position, auto-rotate, zoom, framing, focus pulse, frame budget.' },
  { name: 'Canonical layers', what: 'One inspector per layer the kinds share: countries, labels, markers, arcs, atmosphere, starfield, selection, focus pulse, crosshair.' },
  { name: 'Data', what: 'The data layer slot: heatmap, hex bins and charts with their datasets and animation, or no data layer.' },
  { name: 'Inspector', what: 'Controls for the selected scene setting, visual layer or data layer. Only the active controls load.' },
];

export function StudioOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The Studio is the configurator: controls for the supported globe and data-layer settings, a live globe in the middle, and an export that gives you the exact config back.">
      <DocSection title="A session">
        <Steps>
          <Step title="Pick a kind and a theme">Choose one of six kinds, a theme and an optional scene preset in the top bar. Opening Studio from a world on the homepage keeps the kind and theme you chose.</Step>
          <Step title="Tune the panels">
            Controls build globe or data-layer configuration. Supported fields update in place; Studio recreates the preview when settings require new rendering resources.
          </Step>
          <Step title="Export">
            <em>Export → Use in app</em> gives you framework code and a companion <code>globe-config.json</code>. Choose <em>Studio project</em> to save all editing controls and reopen the scene later with <em>Open project</em>.
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
          <LinkCard to={pageHref('studio/export')} eyebrow="Export & open" title="Code and Studio projects" description="Use a scene in your app or continue editing it later." />
          <LinkCard to={pageHref('studio/presets')} eyebrow="Apply preset" title="Presets and saved themes" description="Built-in presets and your own, saved in the browser." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
