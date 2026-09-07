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
            <strong>Build</strong> — one synchronous cost per kind and resolution: about 60 ms at low resolution, 200 to 400 ms at medium. Triangulated country
            geometry is cached per resolution, so a second globe of the same resolution builds in a few milliseconds.
          </li>
          <li>
            <strong>Frame</strong> — dominated by pixel ratio and post-processing. A globe at pixel ratio 2 draws four times the pixels of one at 1.
          </li>
          <li>
            <strong>Download</strong> — country geometry, about 90 kB at low and 400 kB at medium resolution, fetched once and shared.
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
          The landing page keeps seven globes warm and scrolls with zero long tasks by following exactly these rules.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
