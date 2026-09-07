import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { FLY_TO } from '@/docs/snippets';

export function FlyTo({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Animated camera moves: to a coordinate, or to a country framed with padding. Both interrupt on drag and both respect the zoom limits.">
      <div className="docs-two-col">
        <CodePanel code={FLY_TO} caption="Fly to Warsaw, then frame Australia with generous padding." />
        <LivePreview kind="paper" caption="Paper kind. Focus calls pause the ambient rotation by default." />
      </div>

      <DocSection title="Methods" id="methods">
        <Methods names={['flyTo', 'focusOnCountry', 'setRotation']} guide={false} />
        <DocSubsection title="Distance and elevation">
          <p>
            <code>distance</code> is the camera distance in globe radii, clamped to the zoom limits; omit it to keep the current zoom. The optional{' '}
            <code>elevation</code> adds height at the midpoint of the flight, a fly-over arc that reads better than a straight slerp on long jumps.
          </p>
        </DocSubsection>
      </DocSection>

      <DocSection title="Options" id="options">
        <Types names={['FlyToOptions', 'FocusOptions']} />
        <Callout tone="tip">
          Pair a focus with <code>setActiveCountry()</code> so the highlight and the framing tell the same story; the story engine does exactly this per
          scene.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
