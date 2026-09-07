import type { GlobeKind } from '@your-globe/core';
import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { Callout, CardGrid, CodePanel, DocPage, DocSection, DocSubsection, KindDot, LinkCard, LivePreview, Pill, PropsTable, SupportMatrix, type PropRow } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { kindSnippet } from '@/docs/snippets';
import { KIND_FEATURES } from '../start/ChoosingAKind';

const OPTIONS: Readonly<Record<GlobeKind, ReadonlyArray<PropRow>>> = {
  cinematic: [
    { name: 'cinematic.sun.mode', type: "'fixed' | 'realtime' | 'orbit'", default: "'fixed'", description: 'Where the light comes from: a pinned position, the real sun for the current time, or a slow orbit.' },
    { name: 'cinematic.clouds.enabled', type: 'boolean', default: 'true', description: 'The drifting cloud shell with cast shadows.' },
    { name: 'cinematic.textures', type: 'CinematicTextureSet', default: 'procedural', description: 'Swap the procedural surface for real 2k textures.' },
  ],
  outline: [
    { name: 'outline.crosshair', type: 'boolean', default: 'true', description: 'Reads latitude and longitude under the cursor.' },
    { name: 'countries.borderHover', type: 'BorderStyle', default: 'theme', description: 'Colour, width and glow of the hovered border.' },
  ],
  dotted: [
    { name: 'dotted.density', type: 'number', default: '1', description: 'Dots per degree at the equator; rows thin towards the poles.' },
    { name: 'dotted.ripple', type: 'boolean', default: 'true', description: 'Ripple pulses through the dot field on hover and data change.' },
  ],
  wireframe: [
    { name: 'wireframe.pulses', type: 'number', default: '6', description: 'Packets travelling along the grid at any time.' },
    { name: 'wireframe.streams', type: 'boolean', default: 'true', description: 'Pole-to-pole streams.' },
  ],
  hologram: [
    { name: 'hologram.scanlines', type: 'number', default: '0.35', description: 'Scanline strength, 0 to 1.' },
    { name: 'hologram.shimmer', type: 'number', default: '1', description: 'Speed of the shimmer sweep.' },
  ],
  paper: [
    { name: 'paper.grain', type: 'number', default: '0.6', description: 'Paper grain strength.' },
    { name: 'paper.labels', type: 'boolean', default: 'true', description: 'Atlas-style country labels.' },
  ],
};

export function KindPage({ tab, group, page }: DocLocation) {
  const kind = page.kind ?? 'outline';
  const chapter = KIND_CHAPTERS.find((c) => c.kind === kind);
  const themes = KIND_THEMES[kind];
  const accent = themes[0]?.swatch;
  const preset = themes[0]?.preset ?? 'outline-dark';
  const siblings = KIND_CHAPTERS.filter((c) => c.kind !== kind);

  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={chapter?.tagline ?? page.title}
      lead={chapter?.description ?? page.summary}
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
        <LivePreview kind={kind} theme={preset} caption={`kind: '${kind}' with its default theme.`} />
        <CodePanel code={kindSnippet(kind, preset)} caption="The kind is one key; switching it keeps every other setting." />
      </div>

      <DocSection title="Themes" eyebrow="theme">
        <p>Every preset is a partial token set over the defaults. Pick one by name, or extend it with your own tokens.</p>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Pill key={t.preset} title={t.label}>
              <span aria-hidden="true" className="docs-kind-dot" style={{ background: t.swatch }} />
              {t.preset}
            </Pill>
          ))}
        </div>
      </DocSection>

      <DocSection title="Options" eyebrow={`${kind}`}>
        <PropsTable rows={OPTIONS[kind]} />
        <DocSubsection title="Shared keys">
          <p>
            Countries, markers, arcs, atmosphere, camera and performance keys are the same for every kind. The support matrix below shows what this kind draws.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="What it supports">
        <SupportMatrix features={KIND_FEATURES} kinds={[kind]} />
        <Callout tone="perf">
          Representative build cost and frame budget for this kind will be listed here, measured with the engine's own timing marks.
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
