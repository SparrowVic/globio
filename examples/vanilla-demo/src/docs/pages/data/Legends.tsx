import { Callout, CodePanel, DocPage, DocSection, DocSubsection, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { LEGEND } from '@/docs/snippets';

export function Legends({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Scales turn values into colours for country data and every data layer. The legend renders a scale as a gradient bar or a swatch list inside the globe container.">
      <CodePanel code={LEGEND} caption="Use an explicit domain so the same scale produces matching fills and legend." />
      <DocSection title="Scales" id="scales" eyebrow="ScaleConfig">
        <ul>
          <li>
            <strong>sequential</strong> — one direction, a palette from light to dark or a perceptual one such as viridis. Domain defaults to the data extent.
          </li>
          <li>
            <strong>diverging</strong> — two directions around a midpoint; defaults to RdBu with the midpoint halfway between the data minimum and maximum. Set domain: [min, 0, max] for a zero-centred scale.
          </li>
          <li>
            <strong>threshold</strong> — sorted cut points and one colour per bucket.
          </li>
          <li>
            <strong>categorical</strong> — a colour per category value.
          </li>
        </ul>
        <Types names={['SequentialScale', 'DivergingScale', 'ThresholdScale', 'CategoricalScale', 'ScalePaletteName']} />
        <DocSubsection title="Palettes">
          <p>
            Twelve built-in palettes: blues, reds, greens, oranges, purples, viridis, magma, plasma, inferno, RdBu, BrBG and PiYG, or pass your own list of
            stops. Interpolation is linear in RGB with no runtime dependency.
          </p>
        </DocSubsection>
      </DocSection>
      <DocSection title="Legend" id="legend" eyebrow="showLegend()">
        <Methods names={['showLegend', 'hideLegend']} guide={false} />
        <Types names={['LegendOptions']} />
        <Callout tone="tip">
          The legend is a DOM element styled by the <code>legend.*</code> tokens and ignores pointer events. For a legend elsewhere on the page, call{' '}
          <code>createLegend()</code> from the core with your own container. A legend has no dataset from which to infer an extent; set the domain explicitly (sequential legends otherwise use [0, 1], diverging legends [-1, 0, 1]).
        </Callout>
      </DocSection>
    </DocPage>
  );
}
