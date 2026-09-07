import { CopyCommand } from '@/components/home/landing/atoms';
import { Callout, CodePanel, ContentTabs, DocPage, DocSection, Step, Steps } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { INSTALL } from '@/docs/snippets';

const WRAPPER_INSTALL = {
  vanilla: `# The engine only. three.js is a peer dependency.
npm i @your-globe/core three`,
  react: `npm i @your-globe/core @your-globe/react three`,
  vue: `npm i @your-globe/core @your-globe/vue three`,
  angular: `npm i @your-globe/core @your-globe/angular three`,
};

const CONTAINER = {
  vanilla: `<div id="globe" style="width: 100%; aspect-ratio: 1"></div>`,
  react: `<div className="aspect-square w-full">
  <Globe kind="outline" />
</div>`,
  vue: `<div class="aspect-square w-full">
  <VueGlobe kind="outline" />
</div>`,
  angular: `<div class="aspect-square w-full">
  <ng-globe kind="outline" />
</div>`,
};

export function Installation({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <Steps>
        <Step title="Install the engine">
          <ContentTabs
            label="Package manager"
            tabs={[
              { id: 'npm', label: 'npm', content: <CopyCommand command={INSTALL.npm} size="sm" /> },
              { id: 'pnpm', label: 'pnpm', content: <CopyCommand command={INSTALL.pnpm} size="sm" /> },
              { id: 'yarn', label: 'yarn', content: <CopyCommand command={INSTALL.yarn} size="sm" /> },
            ]}
          />
        </Step>
        <Step title="Add a wrapper (optional)">
          <p>The wrappers forward the whole config as props and turn events into callbacks. Skip this step for plain TypeScript.</p>
          <CodePanel code={WRAPPER_INSTALL} files={{ vanilla: 'terminal', react: 'terminal', vue: 'terminal', angular: 'terminal' }} lineNumbers={false} />
        </Step>
        <Step title="Give it a container">
          <p>The globe fills its container and follows its size. Give the element a width and an aspect ratio, nothing else.</p>
          <CodePanel code={CONTAINER} files={{ vanilla: 'index.html', react: 'App.tsx', vue: 'App.vue', angular: 'app.component.html' }} lineNumbers={false} />
        </Step>
      </Steps>

      <DocSection title="Requirements">
        <ul>
          <li>A browser with WebGL 2. Every evergreen browser since 2021 qualifies.</li>
          <li>three.js 0.160 or newer as a peer dependency. One copy per page; the bundlers guide explains dedupe.</li>
          <li>TypeScript 5 if you want the typed config. Types ship inside the packages.</li>
        </ul>
        <Callout tone="perf">
          Country geometry loads on first mount: about 90 kB at low resolution, 400 kB at medium. Pick the resolution per globe with <code>countries.resolution</code>.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
