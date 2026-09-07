import { Callout, CodePanel, DocPage, DocSection, DocSubsection, Methods, SupportMatrix, Types } from '@/components/docs';
import { KIND_DATA_LAYER_SUPPORT } from '@/docs/kind-support';
import type { DocLocation } from '@/docs/manifest';
import { DATA_LAYER } from '@/docs/snippets';

export function DataLayers({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="One high-level visualisation at a time, rendered by the active kind in its own style. Same dataset, different look per kind.">
      <CodePanel code={DATA_LAYER} caption="Bars from country ids and coordinates; the wrappers reach the same call through the instance." />
      <DocSection title="Types" id="types" eyebrow="DataLayer">
        <ul>
          <li>
            <strong>choropleth</strong> — per-country fills through a scale; the same pipeline as <code>setCountryData()</code>.
          </li>
          <li>
            <strong>bars</strong> — cylinders rising from coordinates or country centroids, height from value.
          </li>
          <li>
            <strong>extruded</strong> — countries pushed outward at a value-derived height, with side walls.
          </li>
          <li>
            <strong>heatmap</strong> — a density texture baked from point samples, displaced and coloured in the shader, with kernels, domes, contours and a
            mount animation.
          </li>
          <li>
            <strong>hexbin</strong> — point samples aggregated into cells of a subdivided icosphere, coloured and extruded per cell.
          </li>
          <li>
            <strong>charts</strong> — grouped or stacked bars, pie, donut, radial, gauge or sunburst charts anchored at coordinates.
          </li>
        </ul>
        <SupportMatrix features={KIND_DATA_LAYER_SUPPORT} />
        <Callout tone="note">
          A kind without a decoration for the requested type logs one warning and draws nothing. <code>setCountryData()</code> works everywhere.
        </Callout>
      </DocSection>
      <DocSection title="Methods" id="methods">
        <Methods names={['setDataLayer', 'getDataLayer', 'playDataLayerAnimation']} guide={false} />
        <DocSubsection title="Events">
          <p>
            Every layer type accepts <code>events.onHover</code> and <code>events.onClick</code> with a payload specific to the type: the entry for bars and
            charts, the cell for hex bins, the country id for choropleths.
          </p>
        </DocSubsection>
      </DocSection>
      <DocSection title="Reference" id="reference">
        <Types names={['DataLayer', 'ChoroplethDataLayer', 'BarsDataLayer', 'BarsDataEntry', 'ExtrudedDataLayer', 'HeatmapDataLayer', 'HeatmapDataEntry', 'HexBinDataLayer', 'HexBinDataEntry', 'ChartsDataLayer', 'ChartsDataEntry', 'DataLayerEvents']} />
      </DocSection>
    </DocPage>
  );
}
