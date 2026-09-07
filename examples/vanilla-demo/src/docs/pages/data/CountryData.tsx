import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LivePreview, PropsTable } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { COUNTRY_DATA } from '@/docs/snippets';

export function CountryData({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={COUNTRY_DATA} caption="Values keyed by country id, coloured through a scale." />
        <LivePreview kind="dotted" caption="Dotted kind: the choropleth runs through the dots." />
      </div>

      <DocSection title="Keys and values" eyebrow="CountryDataMap">
        <p>
          A <code>CountryDataMap</code> is a plain object: ISO 3166-1 numeric id to number. Countries without a key keep the theme's default fill. Passing{' '}
          <code>null</code> clears the layer with a fade.
        </p>
        <Callout tone="warning" title="Ids are zero-padded strings">
          <code>'076'</code> is Brazil; <code>76</code> and <code>'76'</code> are normalised to it at the API boundary. ISO alpha-2 codes such as{' '}
          <code>'BR'</code> are not accepted and match nothing.
        </Callout>
      </DocSection>

      <DocSection title="Scales" eyebrow="ScaleConfig">
        <PropsTable
          rows={[
            { name: 'type', type: "'sequential' | 'diverging' | 'threshold' | 'categorical'", default: "'sequential'", description: 'How values map to colours.' },
            { name: 'domain', type: '[number, number] | number[]', default: 'data extent', description: 'Input range, or thresholds for a threshold scale.' },
            { name: 'range', type: 'string[]', description: 'Colour stops. Two for sequential, three for diverging, one per bucket for threshold.', required: true },
            { name: 'missingColor', type: 'string', default: 'theme fill', description: 'Fill for countries without data.' },
            { name: 'transition', type: 'number', default: '500', description: 'Milliseconds for the fade when data changes.' },
          ]}
        />
        <DocSubsection title="Legends">
          <p>
            <code>showLegend(scale)</code> draws a DOM legend over the canvas in the theme's type. It is optional; any charting library can render the same
            scale.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="Live updates">
        <p>
          Call <code>setCountryData()</code> as often as the data changes. Fills interpolate between the old and the new value; the geometry is never
          rebuilt.
        </p>
      </DocSection>
    </DocPage>
  );
}
