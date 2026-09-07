import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import type { GlobeInstance } from '@your-globe/core';
import { COUNTRY_DATA } from '@/docs/snippets';

const previewSetup = (globe: GlobeInstance) => {
  const scale = { type: 'sequential', domain: [0, 100], palette: ['#15181d', '#6fb4ff'] } as const;
  globe.setCountryData({ '616': { value: 82 }, '276': { value: 71 }, '840': { value: 64 }, '076': { value: 38 } }, scale);
  globe.showLegend(scale);
  return () => { globe.hideLegend(); globe.setCountryData(null); };
};

export function CountryData({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Colour countries from a map keyed by id. Give each entry a colour, or a value and let a scale pick the colour.">
      <div className="docs-two-col">
        <CodePanel code={COUNTRY_DATA} caption="Values through a sequential scale, plus a legend for it." />
        <LivePreview kind="dotted" setup={previewSetup} caption="The four example values mapped through the same scale on Dotted." />
      </div>

      <DocSection title="The map" id="map" eyebrow="CountryDataMap">
        <p>
          Keys are zero-padded ISO 3166-1 numeric ids (<code>'076'</code> is Brazil); numbers and short strings are normalised for you. Each entry carries an
          explicit <code>color</code>, a <code>value</code>, an <code>opacity</code>, or any mix. Countries without an entry are hidden in data mode; use always or palette fill mode when the rest of the map should remain coloured.
        </p>
        <Types names={['CountryDataEntry']} />
        <Callout tone="warning" title="Alpha-2 codes match nothing">
          <code>'BR'</code> is not a key the engine knows. Convert to numeric ids at the edge of your app; the built-in region arrays are already padded.
        </Callout>
      </DocSection>

      <DocSection title="Values and scales" id="scales" eyebrow="setCountryData(data, scale)">
        <p>
          With a scale, every entry that has a <code>value</code> and no <code>color</code> gets the scale's colour. An explicit colour always wins, so a
          highlight can sit on top of a choropleth without a second layer.
        </p>
        <Methods names={['setCountryData', 'getCountryData']} guide={false} />
        <DocSubsection title="Live updates">
          <p>
            Repeated updates of the same choropleth reuse its fill geometry and apply new colours directly. Passing a new non-null map selects the choropleth slot and replaces any other data layer. Pass null to clear country data; it removes an active choropleth but leaves a bars, heatmap or other layer in place.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="Where the fill comes from" id="fill">
        <p>
          Country data renders on Outline, Dotted and Cinematic. The fill layer is the same one <code>countries.fill</code> configures. Setting data switches it to <code>mode: 'data'</code>; the hover and active
          overrides from the countries page still apply on top. On Dotted, scale colours fill the country beneath the dots; setCountryData() also flashes dots when values change. The dotted.dots data colour mode does not yet receive country-data colours.
        </p>
      </DocSection>
    </DocPage>
  );
}
