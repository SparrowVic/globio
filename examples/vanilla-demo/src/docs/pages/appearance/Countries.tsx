import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { COUNTRIES_STYLE } from '@/docs/snippets';

export function Countries({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Which geometry loads, whether the pointer picks countries, and how borders and fills look on this globe.">
      <div className="docs-two-col">
        <CodePanel code={COUNTRIES_STYLE} caption="Medium geometry, a glowing hover stroke, an ember active stroke and a palette fill." />
        <LivePreview kind="outline" theme="outline-light" interactive caption="Hover to see the border highlight; click pins a country." />
      </div>

      <DocSection title="Resolution" id="resolution" eyebrow="countries.resolution">
        <p>
          Three resolutions of the same world-atlas source. Low is about 90 kB and builds in tens of milliseconds; medium is the default and holds up at
          hero size; high is for close-ups. Every polygon is normalised the same way, so Antarctica, the antimeridian and enclaves render correctly at
          every level.
        </p>
        <ConfigKeys path="countries" only={['resolution', 'hoverEnabled', 'hoverOccludeBackSide']} nested={false} intro={false} />
      </DocSection>

      <DocSection title="Borders" id="borders" eyebrow="countries.borderHover · countries.borderActive">
        <p>
          Base borders come from the theme. The hovered and the pinned country get their own stroke, and the hover stroke can carry an additive glow.
          Leave a field out to keep the theme token.
        </p>
        <ConfigKeys path="countries" only={['borderHover', 'borderActive']} intro={false} />
      </DocSection>

      <DocSection title="Fills" id="fills" eyebrow="countries.fill">
        <p>
          The fill layer sits between the surface and the borders. <code>mode</code> decides what it paints; <code>setCountryData()</code> switches it to{' '}
          <code>'data'</code> on its own. Hover and active colours recolour a single country in place.
        </p>
        <ConfigKeys path="countries" only={['fill']} intro={false} />
        <Callout tone="note">
          Fills are drawn with a depth prepass, so overlapping slivers along coastlines never double-blend. Transparent fills therefore look flat, as they
          should.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
