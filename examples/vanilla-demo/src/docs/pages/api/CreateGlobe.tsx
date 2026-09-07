import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, Signature, Step, Steps } from '@/components/docs';
import { keyHref } from '@/docs/search-index';
import type { ApiEntry } from '@/docs/generated/api-types';
import { type DocLocation } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

const toGlobeConfig = (entry: ApiEntry): string | undefined => (entry.children ? keyHref(entry) : undefined);

export function CreateGlobe({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <Signature code="function createGlobe(config: GlobeConfig): GlobeInstance" />
      <DocSection title="Lifecycle">
        <Steps>
          <Step title="Create">Creation allocates the scene, WebGL renderer, controls and DOM overlays. It requires a browser and a real container; country geometry and kind layers are built during mount.</Step>
          <Step title="Mount">
            <code>mount()</code> appends the canvas, loads the country geometry and starts the shared frame loop. <code>ready</code> fires once countries are loaded
            and the shaders are compiled: reveal the element then.
          </Step>
          <Step title="Update">
            <code>update(partial)</code> patches the running scene. Supported live fields update in place. Kind, theme, geometry resolution, framing, camera limits and renderer settings require a new instance.
          </Step>
          <Step title="Destroy">
            <code>destroy()</code> releases the WebGL context and every listener. Required before removing the container; the wrappers do it on unmount.
          </Step>
        </Steps>
        <CodePanel code={QUICK_START} />
      </DocSection>
      <DocSection title="GlobeConfig" eyebrow="config keys" lead="The top level. Object-typed keys link to their full tables on the GlobeConfig page.">
        <ConfigKeys nested={false} linkFor={toGlobeConfig} intro={false} />
        <Callout tone="note">
          Kind-specific groups (<code>outline</code>, <code>dotted</code>, <code>wireframe</code>, <code>hologram</code>, <code>paper</code>,{' '}
          <code>cinematic</code>) normally apply to their matching kind. The legacy outline.hoverCrosshair settings are shared by Outline, Dotted, Paper, Hologram and Cinematic. A config can carry all sections when creating instances of different kinds.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
