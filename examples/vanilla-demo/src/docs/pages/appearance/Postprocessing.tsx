import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { POSTFX } from '@/docs/snippets';

export function Postprocessing({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="One HDR pipeline for every layer: bloom, an anamorphic streak, vignette, chromatic aberration, film grain and exposure. On by default for the cinematic kind, available to all.">
      <div className="docs-two-col">
        <CodePanel code={POSTFX} caption="Slightly more bloom, a soft streak, no grain." />
        <LivePreview kind="cinematic" theme="cinematic-night" caption="Cinematic with its default pipeline." />
      </div>
      <DocSection title="Pipeline" id="pipeline" eyebrow="postprocessing">
        <ConfigKeys path="postprocessing" />
        <Callout tone="perf">
          The bloom chain runs at <code>resolutionScale</code> of the drawing buffer; 0.5 halves it and the blur hides the loss. Turning the pipeline on for a
          non-cinematic kind adds one off-screen pass and the composite; on integrated graphics keep <code>pixelRatio</code> at 1 alongside it.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
