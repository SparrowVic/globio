import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, DocSubsection } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { PERFORMANCE } from '@/docs/snippets';

export function PerformanceOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Every globe on a page shares one animation loop. What you control is how much each one draws per frame, and how often.">
      <CodePanel code={PERFORMANCE} caption="A decorative globe: low geometry, 30 fps, pixel ratio 1, paused when hidden." />
      <DocSection title="Settings" id="settings" eyebrow="performance">
        <ConfigKeys path="performance" />
      </DocSection>
      <DocSection title="Where the time goes" id="costs">
        <ul>
          <li>
            <strong>Build</strong> — country triangulation, geometry allocation and materials can block the main thread. Cached country geometry reduces repeated work, but each globe still creates its own rendering resources.
          </li>
          <li>
            <strong>Frame</strong> — dominated by pixel ratio and post-processing. A globe at pixel ratio 2 draws four times the pixels of one at 1.
          </li>
          <li>
            <strong>Download</strong> — world-atlas country geometry is fetched and parsed once per resolution per page. Higher-resolution datasets are larger.
          </li>
        </ul>
        <DocSubsection title="Rules that hold">
          <ul>
            <li>Build at most one globe at a time, never during a scroll; warm the others in idle time.</li>
            <li>Decorative globes take low resolution, a frame cap and adaptive quality; the hero takes medium.</li>
            <li>Keep globes that will come back paused rather than destroyed; a rebuild costs more than the memory.</li>
          </ul>
        </DocSubsection>
        <Callout tone="perf">
          Profile build time and frames on representative devices. These settings reduce work; they do not guarantee a particular frame rate or eliminate long tasks.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
