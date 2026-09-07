import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { ATMOSPHERE } from '@/docs/snippets';

export function Atmosphere({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The glow around the limb, the stars behind it, and what shows through when the canvas is transparent.">
      <div className="docs-two-col">
        <CodePanel code={ATMOSPHERE} caption="A brighter, wider rim with a slow breath; stars on; page background showing through." />
        <LivePreview kind="hologram" caption="Hologram's rim is the atmosphere layer with the kind's own tint." />
      </div>

      <DocSection title="Atmosphere" id="atmosphere" eyebrow="atmosphere">
        <p>
          A Fresnel shell slightly larger than the globe. <code>power</code> and <code>threshold</code> decide how tight the rim is, <code>radiusScale</code> how
          far it reaches, <code>side</code> whether it reads as a halo behind the planet or a haze over it.
        </p>
        <ConfigKeys path="atmosphere" intro={false} />
      </DocSection>

      <DocSection title="Starfield" id="starfield" eyebrow="starfield">
        <p>
          A points cloud on a large sphere. It is created only when <code>enabled</code> is true; density and size fall back to the theme tokens. The Milky
          Way band is honoured by the cinematic kind only.
        </p>
        <ConfigKeys path="starfield" intro={false} />
        <Callout tone="perf">
          Higher density adds vertices and blended fragments. Twinkle runs in the vertex shader and updates one shared time uniform per frame; measure the effect together with pixel ratio and post-processing.
        </Callout>
      </DocSection>

      <DocSection title="Background" id="background" eyebrow="transparent">
        <p>
          By default the canvas clears to the theme's <code>background.color</code> token. With <code>transparent: true</code> the page shows through, which
          is what a globe placed on a gradient or a photo wants. Pair it with <code>framing.padding</code> so the halo has room to fade.
        </p>
        <ConfigKeys only={['transparent']} nested={false} intro={false} />
      </DocSection>
    </DocPage>
  );
}
