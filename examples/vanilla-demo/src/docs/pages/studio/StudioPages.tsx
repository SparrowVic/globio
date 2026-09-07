import { Kbd } from '@/components/shared/components/Kbd';
import { ApiTable, Callout, CodePanel, DocPage, DocSection, Step, Steps } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';

const EXPORT_USE = {
  vanilla: `import { createGlobe, type DataLayer, type GlobeConfig } from '@your-globe/core';
import raw from './globe-config.json';

// The Studio file has this shape; JSON imports widen literal strings.
const exported = raw as { globe: Omit<GlobeConfig, 'container'>; dataLayer: DataLayer | null };
const globe = createGlobe({ ...exported.globe, container });
globe.mount();
globe.setDataLayer(exported.dataLayer); // queued if countries are still loading`,
  react: `import { useRef } from 'react';
import { Globe, type GlobeHandle } from '@your-globe/react';
import type { DataLayer, GlobeConfig } from '@your-globe/core';
import raw from './globe-config.json';

const exported = raw as { globe: Omit<GlobeConfig, 'container'>; dataLayer: DataLayer | null };

export function ExportedGlobe() {
  const ref = useRef<GlobeHandle>(null);
  return <Globe ref={ref} {...exported.globe}
    onReady={() => ref.current?.getInstance()?.setDataLayer(exported.dataLayer)} />;
}`,
  vue: `<script setup lang="ts">
import { ref } from 'vue';
import { VueGlobe } from '@your-globe/vue';
import type { DataLayer, GlobeConfig } from '@your-globe/core';
import raw from './globe-config.json';

const globeRef = ref<InstanceType<typeof VueGlobe>>();
const exported = raw as { globe: Omit<GlobeConfig, 'container'>; dataLayer: DataLayer | null };
</script>

<template>
  <VueGlobe ref="globeRef" v-bind="exported.globe"
    @ready="globeRef?.getInstance()?.setDataLayer(exported.dataLayer)" />
</template>`,
  angular: `<!-- Bind each exported field used by your scene; this shows three. -->
<ng-globe [kind]="exported.globe.kind" [theme]="exported.globe.theme"
  [countries]="exported.globe.countries" (ready)="onReady()" />

// In your component, with @ViewChild(GlobeComponent) globe!: GlobeComponent:
onReady() {
  this.globe.getInstance()?.setDataLayer(this.exported.dataLayer);
}`,
};

export function StudioExport({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="The export is a JSON file with two members: the globe config and the active data layer. It is the same object the Studio passes to the engine, so what you saw is what you get.">
      <DocSection title="Use it">
        <CodePanel code={EXPORT_USE} caption="Spread the globe member into a config or a component; hand the data layer to the instance." />
        <Callout tone="note">
          Angular has no object spread in templates; bind the keys you use, or build the config in the component and pass it through the inputs.
        </Callout>
      </DocSection>
      <DocSection title="What is inside">
        <ul>
          <li>
            <code>globe</code> — a full <code>GlobeConfig</code> minus <code>container</code>, including the kind section and the theme selected in Studio.
          </li>
          <li>
            <code>dataLayer</code> — the active <code>DataLayer</code> with its dataset, or <code>null</code>.
          </li>
        </ul>
        <p>Check custom theme names before moving an export to another application. If the exported theme refers to a locally registered name, register its tokens there or replace it with an inline extends/tokens object. The file does not include event handlers, DOM elements or functions.</p>
      </DocSection>
    </DocPage>
  );
}

export function StudioPresets({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="Presets are complete Studio states per kind. Built-in ones ship with the demo; your own are saved in this browser's storage and appear next to them.">
      <DocSection title="Apply a preset">
        <Steps>
          <Step title="Open the Workshop">The card gallery renders a live preview per preset for the active kind.</Step>
          <Step title="Pick a card">The main globe takes the preset's config; every panel updates to match.</Step>
          <Step title="Or use the palette">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd> then type the preset name; custom presets are listed with a <em>(custom)</em> suffix.
          </Step>
        </Steps>
      </DocSection>
      <DocSection title="Save your own">
        <p>
          <em>Save preset</em> stores the current state under a name; <em>Manage saved themes &amp; presets</em> lists, renames and deletes them. Both live in{' '}
          <code>localStorage</code>, so they stay on this machine and browser.
        </p>
        <Callout tone="tip">
          To move a preset to another machine, export the config as JSON and use the exported values in your app. The Studio does not currently provide a JSON import control.
        </Callout>
      </DocSection>
    </DocPage>
  );
}

const ACTIONS = [
  { action: 'Replay layer animation', chip: 'R', what: 'Runs the active data layer\'s mount animation again.' },
  { action: 'Reset camera to home view', chip: 'H', what: 'Back to the initial position and distance.' },
  { action: 'Manage saved themes & presets', chip: '', what: 'Opens the list of items saved in this browser.' },
  { action: 'Export config as JSON', chip: 'E', what: 'Downloads the globe config and data layer.' },
  { action: 'Reset configurator (reload)', chip: '', what: 'Discards the session and reloads the Studio.' },
];

export function StudioShortcuts({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead="One chord opens the palette; everything else is a search away. The chips next to quick actions show their letter inside the palette.">
      <DocSection title="Open the palette">
        <p>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd> on macOS, <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd> elsewhere. Type to filter; groups are Quick actions, Switch kind, Themes for the active kind, and Apply preset.
        </p>
      </DocSection>
      <DocSection title="Quick actions">
        <ApiTable
          columns={[
            { key: 'action', label: 'Action', className: 'docs-col-name' },
            { key: 'chip', label: 'Chip' },
            { key: 'what', label: 'What it does' },
          ]}
          rows={ACTIONS.map((a) => ({
            id: `action-${a.chip || a.action.toLowerCase().replace(/[^a-z]+/g, '-')}`,
            cells: { action: a.action, chip: a.chip ? <Kbd>{a.chip}</Kbd> : <span className="docs-dash">—</span>, what: a.what },
          }))}
        />
        <Callout tone="note">The action chips are labels, not global single-letter shortcuts. Use the command palette or the corresponding top-bar controls.</Callout>
      </DocSection>
    </DocPage>
  );
}
