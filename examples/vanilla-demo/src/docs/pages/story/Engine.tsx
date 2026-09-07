import { Callout, CodePanel, DocPage, DocSection, DocSubsection, Events, LivePreview, Methods, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { storySetup } from '@/docs/recipes';
import { STORY } from '@/docs/snippets';

export function StoryEngine({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="A story is a list of scenes. Each scene moves the camera, highlights a country and shows a popup for a duration; the engine advances, loops and emits events you can narrate to.">
      <div className="docs-two-col">
        <CodePanel code={STORY} caption="An intro spin, a framed country with a popup, a second stop, on a loop." />
        <LivePreview kind="cinematic" theme="cinematic-dawn" lockZoom={false} setup={storySetup} caption="A running country tour: Poland, Japan and Brazil." />
      </div>

      <DocSection title="Scenes" id="scenes" eyebrow="SceneConfig">
        <p>
          A scene's <code>duration</code> covers the camera transition and the hold after it. <code>focusOnCountry</code> wins over <code>flyTo</code> when both
          are given. Wireframe supports flyTo and active-country rings but does not implement country focus. <code>activeCountry</code> is inherited from the previous scene unless set, and cleared with <code>null</code>.
        </p>
        <Types names={['StoryConfig', 'SceneConfig']} />
      </DocSection>

      <DocSection title="Transition timing" id="timing">
        <p>Durations and delays are milliseconds. The default transition duration is the smaller of 1500 ms and 60% of scene duration. transitionDelay postpones the camera move but does not postpone the scene’s advance timer; allow enough total duration for both the delay and the move.</p>
        <p>transitionElevation adds distance at the flight midpoint, within the camera limits. Named easing values are linear, easeIn, easeOut and easeInOut; custom easing functions are also accepted. Disable framing.lockZoom when a tour needs to change camera distance.</p>
      </DocSection>
      <DocSection title="Starting and replacing a story" id="setup">
        <p>Subscribe to sceneEnter before calling setStory() with autoPlay, and wait for ready when scenes focus countries. autoPlay and loop default to false. With neither autoplay nor startAt, loading a story does not enter a scene until playStory(), nextScene() or goToScene() is called. startAt enters that scene immediately, even without autoplay.</p>
        <p>Scene ids should be unique. An unknown startAt falls back to the first scene on playback; goToScene() ignores unknown ids. Replacing a story exits the current scene and clears its popup. setStory(null) stops scene scheduling but does not reset the camera, selection or auto-rotation.</p>
      </DocSection>
      <DocSection title="Playback" id="playback">
        <Methods names={['setStory', 'playStory', 'pauseStory', 'nextScene', 'prevScene', 'goToScene', 'getCurrentScene', 'isStoryPlaying']} guide={false} />
        <p>pauseStory() stops automatic scene advancement. It does not freeze camera motion, auto-rotation or an already scheduled transition delay. Resuming with playStory() starts a fresh full-duration timer for the current scene. Render pausing with setPaused() is separate and does not stop story timers.</p>
        <p>nextScene(), prevScene() and goToScene() also work while paused. At the first scene prevScene() stays put; nextScene() loops from the last scene only when loop is true. Scene popups are HTML strings: use trusted content and they are removed on exit.</p>
        <p>When a non-looping story finishes, it emits sceneExit and storyComplete once and retains the last scene in getCurrentScene(). Repeated nextScene() calls then do nothing. Call playStory() to replay from the first scene, or choose a scene with goToScene() or prevScene() before resuming. A storyComplete handler may safely start another story.</p>
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
