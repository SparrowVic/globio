import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LivePreview, PropsTable, Signature } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { FLY_TO } from '@/docs/snippets';

export function FlyTo({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={FLY_TO} caption="Fly to Warsaw, then select Poland when the move completes." />
        <LivePreview kind="paper" caption="Paper kind, ambient rotation; flights interrupt it and it resumes." />
      </div>

      <DocSection title="flyTo">
        <Signature code="flyTo(position: LatLng, distance?: number, options?: FlyToOptions): void" />
        <p>
          Animates the camera to look at a coordinate. <code>distance</code> is the camera distance in globe radii; omit it to keep the current zoom.
        </p>
        <PropsTable
          rows={[
            { name: 'duration', type: 'number', default: '1200', description: 'Milliseconds. Zero snaps.' },
            { name: 'easing', type: 'EasingFunction', default: 'easeInOutCubic', description: 'Any (t) => t curve; three are exported.' },
            { name: 'onComplete', type: '() => void', description: 'Called once the camera settles. Not called if another move interrupts.' },
          ]}
        />
      </DocSection>

      <DocSection title="focusOnCountry">
        <Signature code="focusOnCountry(id: string, options?: FocusOptions): void" />
        <p>Flies to a country's centroid and fits its bounds, with a padding fraction around it.</p>
        <DocSubsection title="Interrupting">
          <p>Any pointer drag cancels a running move; auto-rotate resumes after the configured idle delay.</p>
        </DocSubsection>
        <Callout tone="tip">
          Combine with <code>setActiveCountry()</code> in <code>onComplete</code> so the highlight appears when the camera arrives, not while it is moving.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
