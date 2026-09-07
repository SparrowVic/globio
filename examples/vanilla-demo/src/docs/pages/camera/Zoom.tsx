import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { ZOOM } from '@/docs/snippets';

export function Zoom({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Wheel and pinch change the camera distance; drag rotates. Three zoom modes decide what happens to the point under the cursor.">
      <CodePanel code={ZOOM} caption="Cursor-anchored zoom with limits, and a locked decoration." />
      <DocSection title="Modes" id="modes" eyebrow="zoom.mode">
        <ul>
          <li>
            <strong>classic</strong> — distance changes, angles stay. The point under the cursor drifts.
          </li>
          <li>
            <strong>repel</strong> — each step rotates the camera so the point under the cursor stays under the cursor, the way map apps zoom.
          </li>
          <li>
            <strong>attract</strong> — each step pulls the point under the cursor toward the centre of the screen.
          </li>
        </ul>
        <ConfigKeys path="zoom" />
        <Types names={['ZoomMode']} />
      </DocSection>
      <DocSection title="Limits" id="limits" eyebrow="minZoom · maxZoom">
        <p>
          Distances are in globe radii: 1 is the surface. When the two limits meet, or <code>framing.lockZoom</code> is set, the globe stops intercepting
          the wheel so the page scrolls through it.
        </p>
        <ConfigKeys only={['minZoom', 'maxZoom']} nested={false} intro={false} />
        <Callout tone="note">
          Drag rotation has no inertia yet; the camera stops where the pointer stops. Keyboard navigation is on the roadmap.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
