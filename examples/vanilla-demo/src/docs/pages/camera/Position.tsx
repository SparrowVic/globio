import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { POSITION } from '@/docs/snippets';

export function Position({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="What faces the camera on mount, how the axis leans, and how much of the canvas the globe and its halo take up.">
      <div className="docs-two-col">
        <CodePanel code={POSITION} caption="Europe on mount, an Earth-like tilt, and margin for the halo." />
        <LivePreview kind="outline" theme="outline-dark" caption="Decoration framing: padding around the halo, zoom locked." />
      </div>
      <DocSection title="Position and tilt" id="position" eyebrow="initialPosition · axisTilt">
        <p>
          <code>initialPosition</code> is the <code>[lat, lng]</code> that faces the camera when the globe mounts; the camera keeps its default distance.
          <code>axisTilt</code> leans the whole globe group, so auto-rotate spins around the tilted axis and coordinates stay correct.
        </p>
        <ConfigKeys only={['initialPosition', 'axisTilt']} nested={false} intro={false} />
      </DocSection>
      <DocSection title="Framing" id="framing" eyebrow="framing">
        <p>
          The atmosphere shell extends beyond the surface and its halo fades further out. Without padding those edges clip against the canvas, which shows
          on transparent globes. <code>lockZoom</code> pins the camera to the framed distance so a decorative globe cannot be zoomed out of its composition,
          and the wheel then scrolls the page instead.
        </p>
        <ConfigKeys path="framing" />
        <Callout tone="tip">
          Choose padding for the actual container aspect ratio and halo. Framing, axis tilt and initial position are applied at construction; use camera methods for later movement.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
