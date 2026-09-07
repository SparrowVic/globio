import { Callout, CodePanel, DocPage, DocSection, DocSubsection, Methods, SupportMatrix, Types } from '@/components/docs';
import { KIND_DATA_LAYER_SUPPORT } from '@/docs/kind-support';
import type { DocLocation } from '@/docs/manifest';
import { CHARTS, DATA_LAYER, HEATMAP, HEXBIN } from '@/docs/snippets';

export function DataLayers({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="One high-level visualisation at a time, rendered by the active kind in its own style. Check the support matrix before choosing a kind.">
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
            <strong>charts</strong> — grouped or stacked bars, pie, donut, radial, gauge, sunburst or extruded-country charts anchored by country id or coordinates.
          </li>
        </ul>
        <SupportMatrix features={KIND_DATA_LAYER_SUPPORT} />
        <Callout tone="note">
          A kind without a decoration logs a warning and draws nothing; it also removes the previously active data layer. <code>setCountryData()</code> uses the choropleth slot, so it has the same kind restrictions.
        </Callout>
      </DocSection>
      <DocSection title="Choosing a data shape" id="data-shapes">
        <p>Choropleth and extruded layers take a country-id map of objects such as <code>{"{ '616': { value: 82 } }"}</code>. Bars accept entries with a country id or a position tuple. Heatmap and hexbin samples require position and value; charts require a values map whose keys match the series array.</p>
        <p>There is one data-layer slot. Replacing its type disposes the previous rendering resources; updates to supported fields of the same type reuse resources. Structural changes such as heatmap texture dimensions or hexbin resolution rebuild the layer. Calls before country loading completes are queued, with the most recent call winning.</p>
      </DocSection>
      <DocSection title="Heatmaps" id="heatmap">
        <CodePanel code={HEATMAP} />
        <p>Radius is in radians; positions are in degrees. The kernel controls how a sample spreads. Peak normalization compares the baked field with its hottest point, log compresses the range, and absolute uses absoluteMax for a stable saturation point across updates.</p>
        <p>Country domes use matched country polygons to confine the field; disable them for radial samples. Grid and contour overlays, zoom scaling and animation style can be tuned independently. Animation is disabled when omitted or false; supplying true or a config enables it. A heatmap scale palette colours the normalized density field; its domain does not replace absoluteMax.</p>
      </DocSection>
      <DocSection title="Hex bins" id="hexbin">
        <CodePanel code={HEXBIN} />
        <p>Despite the API name, the cells are triangular faces of a subdivided icosphere. Resolution ranges from 0 to 5 and defaults to 3. Use aggregate to select how samples combine; height, cellInset, empty cells, borders and hover highlight control the display.</p>
      </DocSection>
      <DocSection title="Charts" id="charts">
        <CodePanel code={CHARTS} />
        <p>Use stable series keys and non-negative values. Missing values become zero. Explicit positions override country centroids. Labels are DOM overlays; onClick identifies both the entry and the chart segment. The extruded chart type additionally needs a matching country id.</p>
      </DocSection>
      <DocSection title="Methods" id="methods">
        <Methods names={['setDataLayer', 'getDataLayer', 'playDataLayerAnimation']} guide={false} />
        <p>playDataLayerAnimation() reports whether the current layer supports replay. Heatmap, hexbin and charts expose replay; bars and extruded layers only run their mount animation when built.</p>
        <DocSubsection title="Events">
          <p>
            Pointer callbacks are implemented for hexbin and charts. Hex bins return a cell value, sample count and centroid; charts return the source entry and the hit series. Other layer types currently declare events in their types but do not dispatch them. Use globe countryClick and countryHover for country interaction.
          </p>
        </DocSubsection>
      </DocSection>
      <DocSection title="Reference" id="reference">
        <Types names={['DataLayer', 'ChoroplethDataLayer', 'BarsDataLayer', 'BarsDataEntry', 'ExtrudedDataLayer', 'HeatmapDataLayer', 'HeatmapDataEntry', 'HexBinDataLayer', 'HexBinDataEntry', 'ChartsDataLayer', 'ChartsDataEntry', 'DataLayerEvents']} />
      </DocSection>
    </DocPage>
  );
}
