import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, LivePreview } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { AUTO_ROTATE } from '@/docs/snippets';

export function AutoRotate({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="A slow ambient spin that gives way to the user. It stops while the pointer drags, resumes afterwards, and can be toggled at any time.">
      <div className="docs-two-col">
        <CodePanel code={AUTO_ROTATE} caption="Enable, pick a speed, toggle later with update()." />
        <LivePreview kind="dotted" speed={0.05} caption="A faster spin than the default, for the demo." />
      </div>
      <DocSection title="Options" id="options" eyebrow="autoRotate">
        <ConfigKeys path="autoRotate" />
        <p>
          Speed is a multiplier on a slow base rate: 0.5 is roughly one revolution per minute, 1 about one per thirty seconds. Decorative globes look best
          well below 1; a turntable spin fights the page for attention.
        </p>
      </DocSection>
      <DocSection title="Interplay" id="interplay">
        <ul>
          <li>
            <code>focusOnCountry()</code> pauses rotation while it frames a country (override with <code>pauseAutoRotateOnFocus: false</code>).
          </li>
          <li>Story scenes can set rotation on or off per scene; the setting persists until another scene changes it.</li>
          <li>A paused globe (<code>setPaused</code>, off-screen, hidden tab) keeps time-based rotation consistent when it resumes.</li>
        </ul>
        <Callout tone="tip">
          Respect <code>prefers-reduced-motion</code> in the host page: set <code>enabled: false</code> when the media query matches.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
