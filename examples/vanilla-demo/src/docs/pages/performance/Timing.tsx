import { ApiTable, Callout, CodePanel, DocPage, DocSection } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { TIMING } from '@/docs/snippets';

const MARKS = [
  { name: 'globio:construct', what: 'createGlobe() itself: scene, renderer and kind module setup.' },
  { name: 'globio:countries-load', what: 'Fetching and parsing the country geometry for the requested resolution.' },
  { name: 'globio:kind-build', what: 'Building the kind: triangulation, layers, materials. The one synchronous cost.' },
  { name: 'globio:shader-compile', what: 'Compiling the kind\'s shaders on the GPU before the first real frame.' },
  { name: 'globio:mount-to-ready', what: 'From mount() to the ready event, end to end.' },
];

export function Timing({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The engine records User Timing measures for every phase between construction and the first finished frame. Read them in the DevTools Performance panel or with the Performance API.">
      <CodePanel code={TIMING} lineNumbers={false} />
      <DocSection title="Measures" id="measures">
        <ApiTable
          columns={[
            { key: 'name', label: 'Measure', className: 'docs-col-name' },
            { key: 'what', label: 'Covers' },
          ]}
          rows={MARKS.map((m) => ({ id: `mark-${m.name.replace(':', '-')}`, cells: { name: <code>{m.name}</code>, what: m.what } }))}
        />
        <Callout tone="note">
          Measures are per globe; several globes on a page produce several entries with the same name in mount order. They are cheap and always on.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
