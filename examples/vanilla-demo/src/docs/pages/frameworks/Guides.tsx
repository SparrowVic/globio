import { Callout, CodePanel, DocPage, DocSection, Step, Steps } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';

export function SsrPage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The engine needs a window, a canvas and WebGL. Render the globe on the client only and let the server emit a placeholder of the same size.">
      <DocSection title="Pattern">
        <CodePanel
          code={{
            react: `'use client';

// Next.js (app router): a client-only import with a sized placeholder.
import dynamic from 'next/dynamic';

const Globe = dynamic(() => import('@your-globe/react').then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="aspect-square w-full" aria-busy="true" />,
});

export function Hero() {
  return <Globe kind="cinematic" theme="cinematic-night" />;
}`,
            vue: `<!-- Nuxt: <ClientOnly> keeps the component off the server render. -->
<template>
  <ClientOnly>
    <VueGlobe kind="outline" theme="outline-cyber" />
    <template #fallback>
      <div class="aspect-square w-full" aria-busy="true" />
    </template>
  </ClientOnly>
</template>`,
            angular: `// Angular Universal: the component already checks isPlatformBrowser()
// before creating the globe, so it is safe to render on the server.
// Reserve the space so hydration does not shift the layout:
@Component({
  template: \`<ng-globe class="block aspect-square w-full" kind="outline" />\`,
})
export class HeroComponent {}`,
            vanilla: `// Any framework: create the globe after the element exists in a real DOM.
if (typeof window !== 'undefined') {
  const { createGlobe } = await import('@your-globe/core');
  createGlobe({ container: document.querySelector('#globe')!, kind: 'outline' }).mount();
}`,
          }}
        />
        <Callout tone="tip">
          Give the placeholder the final aspect ratio. The canvas follows its container, so the page does not jump when the globe mounts.
        </Callout>
      </DocSection>
      <DocSection title="What happens on the server">
        <ul>
          <li>The React and Vue components render a div and create the globe in a layout effect or onMounted, which never runs on the server.</li>
          <li>The Angular component checks the platform and skips creation outside the browser.</li>
          <li>Country geometry is fetched from the client, never bundled into server output.</li>
        </ul>
      </DocSection>
    </DocPage>
  );
}

export function BundlersPage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="three.js is a peer dependency so your app owns exactly one copy. Everything else is plain ESM and CommonJS with types.">
      <DocSection title="Package shape">
        <ul>
          <li>ESM (<code>import</code>) and CommonJS (<code>require</code>) builds, with <code>.d.ts</code> types next to them.</li>
          <li>No CSS to import. Labels, legends and HTML markers are DOM nodes styled by tokens.</li>
          <li>Country geometry is loaded at runtime, so it is not part of your bundle.</li>
        </ul>
      </DocSection>
      <DocSection title="One three.js">
        <Steps>
          <Step title="Install three once at the app level">
            <p>The core declares <code>three</code> as a peer; your app's copy satisfies all of them.</p>
          </Step>
          <Step title="Dedupe when a library brings its own">
            <CodePanel
              code={{
                vanilla: `// vite.config.ts
export default defineConfig({
  resolve: { dedupe: ['three'] },
});

// webpack.config.js
resolve: { alias: { three: path.resolve('./node_modules/three') } }

// pnpm: pin one version for the whole workspace
// package.json → "pnpm": { "overrides": { "three": "0.167.1" } }`,
              }}
              files={{ vanilla: 'bundler config' }}
            />
          </Step>
          <Step title="Check">
            <p>Inspect your package manager dependency tree and bundler output for duplicate versions. Three.js may also warn about multiple imports; each globe normally has its own WebGL context regardless.</p>
          </Step>
        </Steps>
        <Callout tone="perf">
          Three.js is the bulk of the download. Import the globe on the route that needs it so the rest of the app does not pay for it.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
