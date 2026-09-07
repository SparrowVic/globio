import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview, Methods } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { SELECTION } from '@/docs/snippets';

export function Selection({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Hover highlights the country under the pointer; the active country stays highlighted until you clear it. The focus pulse marks the moment a country is chosen.">
      <div className="docs-two-col">
        <CodePanel code={SELECTION} caption="Toggle the active country on click; pulse from the clicked point." />
        <LivePreview kind="hologram" interactive setup={(globe) => globe.on('countryClick', ({ country }) => {
          globe.setActiveCountry(globe.getActiveCountry() === country.id ? null : country.id);
        })} caption="Interactive: hover, then click to pin a country." />
      </div>
      <DocSection title="Hover" id="hover" eyebrow="countries.hoverEnabled">
        <p>
          Hover is on by default on the five kinds with country picking; Wireframe does not build it. Picking tests loaded country polygons, including holes. Small countries are selectable only when included in the chosen world-atlas resolution. The far side
          of a country is hidden unless you turn occlusion off for an x-ray look.
        </p>
        <ConfigKeys path="countries" only={['hoverEnabled', 'hoverOccludeBackSide']} nested={false} intro={false} />
      </DocSection>
      <DocSection title="Hover crosshair" id="crosshair" eyebrow="outline.hoverCrosshair">
        <p>A surface reticle and cursor label show latitude, longitude and the hovered country. The legacy outline.hoverCrosshair group controls this feature on Outline, Dotted, Paper, Hologram and Cinematic; Wireframe has no crosshair layer.</p>
        <ConfigKeys path="outline.hoverCrosshair" />
      </DocSection>
      <DocSection title="Active country" id="active-country" eyebrow="setActiveCountry()">
        <p>
          The active country uses the <code>borderActive</code> stroke and the active fill colour. Stories set it per scene; your click handler can toggle it.
        </p>
        <Methods names={['setActiveCountry', 'getActiveCountry']} guide={false} />
      </DocSection>
      <DocSection title="Focus pulse" id="focus-pulse" eyebrow="focusPulse">
        <p>
          Each kind draws its own pulse, from a sonar ring on Outline to layered projection rings on Hologram. This section decides when and where it fires;
          the kind sections decide how it looks.
        </p>
        <ConfigKeys path="focusPulse" />
        <Callout tone="note">
          Markers take priority over countries in the picker, so a click on a pin never selects the country under it.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
