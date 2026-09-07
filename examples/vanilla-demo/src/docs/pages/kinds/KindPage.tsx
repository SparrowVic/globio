import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { Callout, CardGrid, CodePanel, ConfigKeys, DocPage, DocSection, DocSubsection, KindDot, LinkCard, LivePreview, Pill, SupportMatrix, Methods } from '@/components/docs';
import { getFeature } from '@/docs/features';
import { KIND_DATA_LAYER_SUPPORT, KIND_LAYER_SUPPORT } from '@/docs/kind-support';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { CINEMATIC_DATA, CINEMATIC_SURFACE, kindSnippet } from '@/docs/snippets';

export function KindPage({ tab, group, page }: DocLocation) {
  const kind = page.kind ?? 'outline';
  const chapter = KIND_CHAPTERS.find((c) => c.kind === kind);
  const feature = getFeature(`kind-${kind}`);
  const themes = KIND_THEMES[kind];
  const accent = themes[0]?.swatch;
  const preset = themes[0]?.preset ?? 'outline-dark';
  const siblings = KIND_CHAPTERS.filter((c) => c.kind !== kind);

  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={chapter?.tagline ?? page.title}
      lead={chapter?.description ?? feature?.summary ?? page.summary}
      accent={accent}
      meta={
        <>
          <Pill tone="accent">
            <KindDot kind={kind} />
            {chapter?.title ?? kind}
          </Pill>
          <Pill>
            {themes.length} {themes.length === 1 ? 'theme' : 'themes'}
          </Pill>
          {chapter?.traits.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </>
      }
    >
      <div className="docs-two-col">
        <LivePreview kind={kind} theme={preset} caption={`kind: '${kind}' with ${preset}.`} />
        <CodePanel code={kindSnippet(kind, preset)} caption="Choose the kind at creation. A different kind or theme requires a new instance." />
      </div>

      {kind === 'cinematic' && (
        <>
          <DocSection title="Surface, clouds and textures" id="surface">
            <p>Cinematic starts with a procedural Earth: terrain relief, biome colour, ice, shallows and clouds. The top-level atmosphere enables the scattering shell; cinematic.atmosphere tunes its day, twilight and night colours. HDR post-processing is enabled by default for this kind.</p>
            <CodePanel code={CINEMATIC_SURFACE} caption="Choose the scene at creation, then adjust supported cinematic settings live." />
            <p>Texture maps are optional equirectangular URLs or Three.js Texture objects. Omitted maps keep their procedural fallback. Supply assets from your application (the paths above are included in the demo), and allow cross-origin access when hosting them elsewhere. Pass cinematic.textures: null to return to procedural rendering.</p>
          </DocSection>
          <DocSection title="Sun and day/night lighting" id="sun">
            <p><code>fixed</code> uses a world-space direction; <code>realtime</code> computes the solar direction from the current time or an explicit date; <code>orbit</code> animates the direction at speed in degrees per second. These are lighting modes, separate from camera auto-rotation. The sun controls surface lighting, night-side effects, clouds and the visible sun disc.</p>
            <p>The procedural starfield is controlled by the top-level starfield group. Its Milky Way band is supported by Cinematic only; turn starfield.enabled on to see it.</p>
          </DocSection>
          <DocSection title="City lights and route data" id="dataset">
            <p>City lights and the network begin with decorative built-in data. Use <code>setCinematicData()</code> to replace it with explicit cities and routes. City entries use lat and lng fields; route endpoints can reference a city id, a coordinate tuple or a coordinate object.</p>
            <CodePanel code={CINEMATIC_DATA} />
            <Methods names={['setCinematicData', 'getCinematicData']} guide={false} />
            <p>The call replaces the custom dataset: omitted members use their built-in fallback, empty arrays also select a fallback, and null restores all fallback data. Use cityLights.enabled or network.enabled to hide those layers. This dataset does not occupy the setDataLayer slot or emit marker events. Add regular markers when city clicks are needed.</p>
          </DocSection>
        </>
      )}

      <DocSection title="Themes" eyebrow="theme">
        <p>Every preset is a partial token set over the defaults. Pick one by name, or extend it with your own tokens on the themes page.</p>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Pill key={t.preset} title={t.label}>
              <span aria-hidden="true" className="docs-kind-dot" style={{ background: t.swatch }} />
              {t.preset}
            </Pill>
          ))}
        </div>
      </DocSection>

      <DocSection title="Options" eyebrow={kind} lead={`Everything under the ${kind} key of GlobeConfig, generated from the types. Most options apply only to this kind; outline.hoverCrosshair is shared by Outline, Dotted, Paper, Hologram and Cinematic.`}>
        <ConfigKeys path={kind} />
        <DocSubsection title="Shared keys">
          <p>
            Countries, markers, arcs, atmosphere, starfield, camera and performance keys are the same for every kind and documented on their own pages;
            the GlobeConfig reference lists them all.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="What it renders">
        <SupportMatrix features={KIND_LAYER_SUPPORT} kinds={[kind]} />
        <DocSubsection title="Data layers">
          <SupportMatrix features={KIND_DATA_LAYER_SUPPORT} kinds={[kind]} />
          <p>
            <code>setDataLayer()</code> with a type this kind does not render logs a warning and draws nothing; <code>setCountryData()</code> also requires choropleth support (Outline, Dotted or Cinematic).
          </p>
        </DocSubsection>
        <Callout tone="perf">
          Build time depends on country resolution and enabled effects. Use the engine’s User Timing measures to compare on your target devices, and start with low resolution for decorative globes.
        </Callout>
      </DocSection>

      <DocSection title="Other kinds">
        <CardGrid columns={2}>
          {siblings.map((c) => (
            <LinkCard key={c.kind} to={pageHref(`kinds/${c.kind}`)} leading={<KindDot kind={c.kind} />} eyebrow={`kind: '${c.kind}'`} title={c.title} description={c.tagline} />
          ))}
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}
