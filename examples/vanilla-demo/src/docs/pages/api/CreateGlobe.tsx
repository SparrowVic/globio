import { Callout, CodePanel, ConfigKeys, DocPage, DocSection, Signature, Step, Steps } from '@/components/docs';
import { configAnchor } from '@/docs/api';
import type { ApiEntry } from '@/docs/generated/api-types';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

const toGlobeConfig = (entry: ApiEntry): string | undefined => (entry.children ? `${pageHref('api/globe-config')}#${configAnchor(entry.path)}` : undefined);

export function CreateGlobe({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <Signature code="function createGlobe(config: GlobeConfig): GlobeInstance" />
      <DocSection title="Lifecycle">
        <Steps>
          <Step title="Create">The scene, renderer and kind are built synchronously. Nothing touches the DOM yet, so a globe can be created ahead of time.</Step>
          <Step title="Mount">
            <code>mount()</code> appends the canvas, loads the country geometry and starts the shared frame loop. <code>ready</code> fires once countries are loaded
            and the shaders are compiled: reveal the element then.
          </Step>
          <Step title="Update">
            <code>update(partial)</code> patches the running scene. A new <code>kind</code> rebuilds the renderer in place; every other key is applied live.
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
          <code>cinematic</code>) are ignored by the other kinds, so one config can carry all of them and switch kinds freely.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
