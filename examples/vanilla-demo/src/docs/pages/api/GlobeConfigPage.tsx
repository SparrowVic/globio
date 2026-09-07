import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, Pill } from '@/components/docs';
import { useApi } from '@/docs/api';
import type { ApiEntry } from '@/docs/generated/api-types';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

const KIND_KEYS = ['outline', 'dotted', 'wireframe', 'hologram', 'paper', 'cinematic'];

const GROUPS: ReadonlyArray<{ readonly id: string; readonly title: string; readonly lead: string; readonly keys: ReadonlyArray<string> }> = [
  { id: 'identity', title: 'Identity', lead: 'Where the globe renders and which renderer and theme it uses.', keys: ['container', 'mode', 'kind', 'theme'] },
  { id: 'countries', title: 'Countries', lead: 'Geometry, interaction, labels and the initial choropleth values.', keys: ['countries', 'countryLabels', 'countryData'] },
  { id: 'layers', title: 'Layers', lead: 'Pins, DOM markers, arcs, the rim glow, the stars and the focus pulse.', keys: ['markers', 'htmlMarkers', 'arcs', 'atmosphere', 'starfield', 'focusPulse'] },
  { id: 'camera', title: 'Camera', lead: 'What faces the camera, how it moves, and how far it can zoom.', keys: ['initialPosition', 'axisTilt', 'autoRotate', 'zoom', 'minZoom', 'maxZoom', 'framing'] },
  { id: 'rendering', title: 'Rendering', lead: 'Post-processing, the frame budget and the canvas itself.', keys: ['postprocessing', 'performance', 'transparent'] },
  { id: 'kinds', title: 'Kind options', lead: 'Each kind reads only its own section; a config can carry all six and switch freely.', keys: KIND_KEYS },
];

const kindLink = (entry: ApiEntry): string | undefined => (KIND_KEYS.includes(entry.name) ? pageHref(`kinds/${entry.name}`) : undefined);

export function GlobeConfigPage({ tab, group, page }: DocLocation) {
  const api = useApi();
  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={page.title}
      lead="Every key createGlobe() and update() accept, generated from the TypeScript types. Types, defaults and descriptions here are the ones in the source."
      meta={
        api && (
          <>
            <Pill tone="accent">{api.stats.configKeys} keys</Pill>
            <Pill>core {api.coreVersion}</Pill>
          </>
        )
      }
    >
      <CodePanel code={QUICK_START} caption="A config is a plain object; every key except container is optional." />
      <Callout tone="note">
        Object-typed keys expand into their own table below the group. Kind sections are large and live on the kind pages; the table links there.
      </Callout>
      {GROUPS.map((g) => (
        <DocSection key={g.id} id={g.id} title={g.title} lead={g.lead}>
          <ConfigKeys only={g.keys} nested={g.id !== 'kinds'} linkFor={kindLink} intro={false} />
        </DocSection>
      ))}
    </DocPage>
  );
}
