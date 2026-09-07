import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { COUNTRY_DATA } from '@/docs/snippets';

export function CountryData({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Colour countries from a map keyed by id. Give each entry a colour, or a value and let a scale pick the colour.">
      <div className="docs-two-col">
        <CodePanel code={COUNTRY_DATA} caption="Values through a sequential scale, plus a legend for it." />
        <LivePreview kind="dotted" caption="Dotted kind: the choropleth runs through the dots." />
      </div>

      <DocSection title="The map" id="map" eyebrow="CountryDataMap">
        <p>
          Keys are zero-padded ISO 3166-1 numeric ids (<code>'076'</code> is Brazil); numbers and short strings are normalised for you. Each entry carries an
          explicit <code>color</code>, a <code>value</code>, an <code>opacity</code>, or any mix. Countries without an entry keep the theme fill.
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
            Call <code>setCountryData()</code> as often as the data changes; fills tween between the old and the new colour and the geometry is never rebuilt.
            Pass <code>null</code> to fade the layer out.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="Where the fill comes from" id="fill">
        <p>
          The fill layer is the same one <code>countries.fill</code> configures. Setting data switches it to <code>mode: 'data'</code>; the hover and active
          overrides from the countries page still apply on top.
        </p>
      </DocSection>
    </DocPage>
  );
}
