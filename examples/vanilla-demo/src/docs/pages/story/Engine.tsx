import { Callout, CodePanel, DocPage, DocSection, DocSubsection, Events, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { STORY } from '@/docs/snippets';

export function StoryEngine({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="A story is a list of scenes. Each scene moves the camera, highlights a country and shows a popup for a duration; the engine advances, loops and emits events you can narrate to.">
      <div className="docs-two-col">
        <CodePanel code={STORY} caption="An intro spin, a framed country with a popup, a second stop, on a loop." />
        <LivePreview kind="cinematic" theme="cinematic-dawn" caption="Cinematic dawn, the usual stage for a narrated globe." />
      </div>

      <DocSection title="Scenes" id="scenes" eyebrow="SceneConfig">
        <p>
          A scene's <code>duration</code> covers the camera transition and the hold after it. <code>focusOnCountry</code> wins over <code>flyTo</code> when both
          are given; <code>activeCountry</code> is inherited from the previous scene unless set, and cleared with <code>null</code>.
        </p>
        <Types names={['StoryConfig', 'SceneConfig']} />
      </DocSection>

      <DocSection title="Playback" id="playback">
        <Methods names={['setStory', 'playStory', 'pauseStory', 'nextScene', 'prevScene', 'goToScene', 'getCurrentScene', 'isStoryPlaying']} guide={false} />
        <DocSubsection title="Events">
          <Events names={['sceneEnter', 'sceneExit', 'storyComplete']} guide={false} />
        </DocSubsection>
        <Callout tone="tip">
          Drive captions from <code>sceneEnter</code> rather than a parallel timer: scenes can be paused, skipped or jumped to, and the event is the only
          source that stays in sync.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
