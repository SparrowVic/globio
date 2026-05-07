import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartArea, faFilm, faBolt } from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { GlobeInstance } from '@your-globe/core';
import { SectionHeader } from '@/components/shared';
import { ChoroplethStage } from './data-story/ChoroplethStage';
import { StoryTimeline } from './data-story/StoryTimeline';
import { CodeBlock } from './atoms';

const FEATURES: ReadonlyArray<{
  readonly icon: IconDefinition;
  readonly title: string;
  readonly copy: string;
  readonly accent: string;
}> = [
  {
    icon: faChartArea,
    title: 'Data layers',
    copy: 'Choropleth, hexbin, bars, extruded, heatmap, charts. One imperative call mounts the data on top of any kind.',
    accent: '#22d3ee',
  },
  {
    icon: faFilm,
    title: 'Story API',
    copy: 'Scene timeline with flyTo, focusOnCountry, popups, transitions, and easing curves.',
    accent: '#f472b6',
  },
  {
    icon: faBolt,
    title: 'Real-time updates',
    copy: 'Every setter runs without a scene rebuild. Live dashboards stay smooth at 60 FPS.',
    accent: '#fbbf24',
  },
];

const SNIPPET = `globe.setCountryData(
  {
    US: { value: 332 }, CN: { value: 1412 }, IN: { value: 1380 },
    BR: { value: 213 }, NG: { value: 219 }, JP: { value: 125 },
  },
  { type: 'sequential', palette: ['#22d3ee', '#f472b6'], domain: [0, 1500] },
);

globe.setStory({
  scenes: [
    { id: 'tokyo', flyTo: { position: [35.6, 139.7] }, duration: 5500 },
    { id: 'nyc',   flyTo: { position: [40.7, -74.0] }, duration: 5500 },
    { id: 'cairo', flyTo: { position: [30.0, 31.2]  }, duration: 5500 },
  ],
});
globe.playStory();`;

export function DataStorySection() {
  const [instance, setInstance] = useState<GlobeInstance | null>(null);

  return (
    <section id="data" className="relative overflow-hidden py-28">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_30%,rgba(244,114,182,0.08),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.08),transparent_30%)]" />

      <div className="mx-auto max-w-[1480px] px-6">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              align="left"
              eyebrow="Data & Storytelling"
              title="From dataset to scene."
              sub="Mount data layers and choreograph cinematic scenes using the same engine. Built-in scale, scene controller, and runtime updates — no external animation library."
            />

            <div className="mt-8 grid gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"
                >
                  <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
                    <FontAwesomeIcon icon={f.icon} className="size-4" style={{ color: f.accent }} />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <StoryTimeline instance={instance} />
            <ChoroplethStage
              className="aspect-square w-full lg:aspect-[16/13]"
              onReady={(api) => setInstance(api.instance)}
            />
            <CodeBlock code={SNIPPET} copy lineNumbers />
          </div>
        </div>
      </div>
    </section>
  );
}
