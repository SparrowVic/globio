import { Callout, CodePanel, DocPage, DocSection, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { ARCS } from '@/docs/snippets';

export function Arcs({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Great-circle connections lifted off the surface. Height, dashes and an animated head particle say what the line means.">
      <div className="docs-two-col">
        <CodePanel code={ARCS} caption="An auto-height animated route and a dashed one." />
        <LivePreview kind="wireframe" arcs={[
          { id: 'wro-nyc', from: [51.11, 17.03], to: [40.71, -74.01], height: 'auto', animated: true },
          { id: 'wro-tyo', from: [51.11, 17.03], to: [35.68, 139.69], style: 'dashed', color: '#ff8a4c' },
        ]} caption="Wireframe draws arcs as glowing streams over the grid." />
      </div>
      <DocSection title="Shape" id="shape" eyebrow="ArcConfig">
        <p>
          An arc follows the great circle between its endpoints and rises to an apex. <code>height</code> is a factor of the globe radius; <code>'auto'</code>{' '}
          scales it with distance so short hops stay low and long routes climb.
        </p>
        <Types names={['ArcConfig']} />
      </DocSection>
      <DocSection title="Methods" id="methods">
        <Methods names={['setArcs', 'addArc', 'removeArc']} guide={false} />
        <Callout tone="tip">
          Animate only the arcs that carry meaning. A dozen heads read as traffic; a hundred read as noise, and each one is a per-frame update.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
