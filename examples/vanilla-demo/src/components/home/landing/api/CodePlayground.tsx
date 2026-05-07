import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { faAngular, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { CodeBlock } from '../atoms';
import { cn } from '@/lib/utils';

interface Tab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly code: string;
}

const TABS: ReadonlyArray<Tab> = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    icon: faJs,
    code: `import { createGlobe } from '@your-globe/core';

const globe = createGlobe({
  container,
  kind: 'hologram',
  theme: 'hologram-cyan',
  arcs: { enabled: true, animationSpeed: 1.2 },
  markers: { enabled: true, hoverScale: 1.35 },
});

globe.mount();
globe.update({ kind: 'paper', theme: 'paper-default' });`,
  },
  {
    id: 'react',
    label: 'React',
    icon: faReact,
    code: `import { Globe } from '@your-globe/react';

function IntelligenceGlobe({ dataset }) {
  return (
    <Globe
      kind="dotted"
      theme="dotted-dark"
      markers={{ points: dataset.cities, pulse: true }}
      arcs={{ routes: dataset.routes, colorMode: 'velocity' }}
      countryFill={{ mode: 'data', data: dataset.risk }}
    />
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: faVuejs,
    code: `<script setup lang="ts">
import { VueGlobe } from '@your-globe/vue';
</script>

<template>
  <VueGlobe
    kind="paper"
    theme="paper-default"
    :country-fill="{ mode: 'palette', palette }"
    :labels="{ enabled: true, density: 'featured' }"
    :focus-pulse="{ enabled: true, texture: 'ink-ring' }"
  />
</template>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    icon: faAngular,
    code: `import { GlobeComponent } from '@your-globe/angular';

@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: \`
    <globio-globe
      [kind]="'wireframe'"
      [theme]="'wireframe-tron'"
      [arcs]="networkRoutes"
      [markers]="edgeNodes"
      (countryClick)="selectCountry($event)" />
  \`,
})
export class NetworkPanel {}`,
  },
];

export function CodePlayground() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#050812]/90">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.035] px-4 py-3">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <FontAwesomeIcon icon={faCode} className="size-3 text-amber-200" />
          typed config
        </div>
        <div className="flex rounded-full border border-white/[0.08] bg-black/25 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs transition-all duration-250',
                activeId === t.id
                  ? 'bg-white/[0.1] text-white'
                  : 'text-slate-500 hover:text-slate-200',
              )}
            >
              <FontAwesomeIcon icon={t.icon} className="size-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#02030a] p-5">
        <CodeBlock code={active.code} copy lineNumbers />
      </div>
    </div>
  );
}
