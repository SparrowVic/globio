import { Callout, CodePanel, DocPage, DocSection, Methods } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { PROJECTION } from '@/docs/snippets';

export function Projection({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Turn a coordinate into canvas pixels for overlays you position yourself, and turn the current frame into an image.">
      <CodePanel code={PROJECTION} caption="Anchor a DOM label every frame; export a share card." />
      <DocSection title="project()" id="project">
        <p>
          Returns canvas-relative pixels, or <code>null</code> when the point is behind the globe or outside the canvas. Call it in your own animation frame:
          the camera matrix is up to date from the first call, before the first frame renders.
        </p>
        <Methods names={['project']} guide={false} />
        <Callout tone="tip">
          For more than a handful of overlays use HTML markers, which the engine positions and occludes for you.
        </Callout>
      </DocSection>
      <DocSection title="Export" id="export" eyebrow="toImage()">
        <Methods names={['toImage']} guide={false} />
        <p>
          The frame is re-rendered at the requested size, so a 1200 by 630 share card comes out sharp regardless of the on-screen canvas. Transparent globes
          export with an alpha channel. Only WebGL content is captured: country labels, HTML markers, tooltips and legends are separate DOM overlays. Provide both width and height as positive finite values; they are renderer dimensions and the PNG pixel size also depends on device pixel ratio.
        </p>
      </DocSection>
    </DocPage>
  );
}
