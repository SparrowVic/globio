import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, Methods } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';

const PAUSING = {
  vanilla: `// Automatic: off-screen and hidden-tab globes stop rendering.
createGlobe({ container, performance: { pauseWhenHidden: true } });

// Manual: keep a globe warm behind a cross-fade or in an inactive panel.
globe.setPaused(true);
// …later, no rebuild, no flash:
globe.setPaused(false);`,
  react: `useEffect(() => {
  ref.current?.getInstance()?.setPaused(!isActiveTab);
}, [isActiveTab]);`,
  vue: `watch(isActiveTab, (active) => globeRef.value?.getInstance()?.setPaused(!active));`,
  angular: `ngOnChanges() {
  this.globe.getInstance()?.setPaused(!this.isActiveTab);
}`,
};

export function Pausing({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="A paused globe keeps its scene, data and WebGL context and costs no frame time. Pausing happens on its own when a globe leaves the viewport or the tab hides, and on demand for everything else.">
      <CodePanel code={PAUSING} />
      <DocSection title="Automatic" id="automatic" eyebrow="performance.pauseWhenHidden">
        <ConfigKeys path="performance" only={['pauseWhenHidden']} nested={false} intro={false} />
        <p>Frame-driven animation freezes while rendering is paused and resumes with a clamped time step. Story scene timers are independent: pauseStory() is needed to stop automatic scene advancement.</p>
      </DocSection>
      <DocSection title="On demand" id="on-demand" eyebrow="setPaused()">
        <Methods names={['setPaused']} guide={false} />
        <Callout tone="tip">
          Tab panels, carousels and kind switchers should pause rather than destroy. The landing page keeps one globe per kind alive this way and swaps
          them with a cross-fade.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
