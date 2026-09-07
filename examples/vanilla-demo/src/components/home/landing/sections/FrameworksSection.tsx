import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngular, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';
import { CodeBlock, CopyCommand, SectionHeading } from '../atoms';

interface Tab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly file: string;
  readonly code: string;
}

const TABS: ReadonlyArray<Tab> = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    icon: faJs,
    file: 'globe.ts',
    code: `import { createGlobe } from '@your-globe/core';

const globe = createGlobe({
  container: document.querySelector('#globe')!,
  kind: 'cinematic',
  theme: 'cinematic-night',
  markers: [{ id: 'warsaw', position: [52.23, 21.01], pulse: true }],
  autoRotate: { enabled: true, speed: 0.05 },
});

globe.mount();
globe.on('countryClick', ({ country }) => console.log(country.name));

// Everything is live — no rebuild, no flash.
globe.update({ kind: 'dotted', theme: 'dotted-dark' });`,
  },
  {
    id: 'react',
    label: 'React',
    icon: faReact,
    file: 'Globe.tsx',
    code: `import { Globe } from '@your-globe/react';

export function WorldPanel({ routes, risk }) {
  return (
    <Globe
      kind="outline"
      theme="outline-cyber"
      arcs={routes}
      countryData={risk}
      atmosphere={{ enabled: true }}
      autoRotate={{ enabled: true, speed: 0.04 }}
      onCountryClick={({ country }) => select(country.id)}
    />
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: faVuejs,
    file: 'WorldPanel.vue',
    code: `<script setup lang="ts">
import { VueGlobe } from '@your-globe/vue';
import { routes, risk } from './data';
</script>

<template>
  <VueGlobe
    kind="paper"
    theme="paper-default"
    :arcs="routes"
    :country-data="risk"
    :atmosphere="{ enabled: true }"
    :auto-rotate="{ enabled: true, speed: 0.04 }"
    @country-click="({ country }) => select(country.id)"
  />
</template>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    icon: faAngular,
    file: 'world-panel.component.ts',
    code: `import { Component } from '@angular/core';
import { GlobeComponent } from '@your-globe/angular';

@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: \`
    <ng-globe
      kind="hologram"
      theme="hologram-cyan"
      [arcs]="routes"
      [countryData]="risk"
      [atmosphere]="{ enabled: true }"
      (countryClick)="select($event.country.id)"
    />
  \`,
})
export class WorldPanelComponent {}`,
  },
];

const PACKAGES: ReadonlyArray<{ readonly name: string; readonly what: string; readonly install: string }> = [
  { name: '@your-globe/core', what: 'The engine. Framework-agnostic, ESM and CJS, three.js is the only peer.', install: 'npm i @your-globe/core' },
  { name: '@your-globe/react', what: 'A <Globe /> component. Every config key is a prop, every event a callback.', install: 'npm i @your-globe/react' },
  { name: '@your-globe/vue', what: '<VueGlobe /> with kebab-case props and emits. Works with <script setup>.', install: 'npm i @your-globe/vue' },
  { name: '@your-globe/angular', what: 'A standalone <ng-globe> with signals-friendly inputs and outputs.', install: 'npm i @your-globe/angular' },
];

export function FrameworksSection() {
  const [activeId, setActiveId] = useState(TABS[0]?.id ?? 'vanilla');
  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];
  if (!active) return null;

  return (
    <section id="frameworks" className="relative py-28 md:py-36" aria-label="Framework wrappers">
      <div className="wrap">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <SectionHeading
            eyebrow="@your-globe/*"
            title="One config. Four ways in."
            lead="The wrappers forward the whole GlobeConfig and turn events into callbacks. Change a prop and the globe updates in place."
            leadClassName="max-w-[32rem]"
          />
          <div className="reveal reveal-d2 flex flex-wrap gap-1.5 rounded-full border border-[var(--hair)] p-1 lg:justify-self-end">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn('tab inline-flex items-center gap-2', activeId === t.id && 'is-active')}
              >
                <FontAwesomeIcon icon={t.icon} className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <CodeBlock code={active.code} title={active.file} className="reveal reveal-d3 mt-10" />

        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PACKAGES.map((pkg, i) => (
            <li key={pkg.name} className={cn('card reveal flex flex-col p-5', `reveal-d${(i % 4) + 1}`)}>
              <span className="t-mono text-[var(--ice)]">{pkg.name}</span>
              <p className="t-body mt-2 flex-1">{pkg.what}</p>
              <CopyCommand command={pkg.install} size="sm" className="mt-5 w-fit" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
