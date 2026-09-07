import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause, faPlay } from '@fortawesome/sharp-solid-svg-icons';
import type {
  ArcConfig,
  CountryDataMap,
  GlobeInstance,
  MarkerConfig,
  ScaleConfig,
  StoryConfig,
} from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';
import { CodeBlock } from '../atoms';
import { useCoarsePointer } from '../hooks/use-coarse-pointer';
import { useInViewport } from '../hooks/use-in-viewport';

// Population, millions. Keys are the numeric ISO 3166-1 codes world-atlas
// uses as feature ids (zero-padded, e.g. '032' Argentina).
const POPULATION: CountryDataMap = {
  '156': { value: 1412 }, // CN
  '356': { value: 1380 }, // IN
  '840': { value: 332 }, // US
  '360': { value: 273 }, // ID
  '586': { value: 225 }, // PK
  '076': { value: 213 }, // BR
  '566': { value: 219 }, // NG
  '050': { value: 166 }, // BD
  '643': { value: 144 }, // RU
  '484': { value: 128 }, // MX
  '392': { value: 125 }, // JP
  '231': { value: 118 }, // ET
  '608': { value: 111 }, // PH
  '818': { value: 109 }, // EG
  '704': { value: 98 }, // VN
  '180': { value: 96 }, // CD
  '792': { value: 85 }, // TR
  '364': { value: 85 }, // IR
  '276': { value: 84 }, // DE
  '764': { value: 70 }, // TH
  '826': { value: 67 }, // GB
  '250': { value: 65 }, // FR
  '380': { value: 59 }, // IT
  '710': { value: 60 }, // ZA
  '404': { value: 54 }, // KE
  '032': { value: 45 }, // AR
  '124': { value: 38 }, // CA
  '616': { value: 38 }, // PL
  '036': { value: 26 }, // AU
  '682': { value: 35 }, // SA
  '170': { value: 51 }, // CO
  '724': { value: 47 }, // ES
  '804': { value: 41 }, // UA
  '504': { value: 37 }, // MA
  '604': { value: 33 }, // PE
  '752': { value: 10 }, // SE
  '578': { value: 5 }, // NO
  '246': { value: 6 }, // FI
  '398': { value: 19 }, // KZ
  '496': { value: 3 }, // MN
};

const SCALE: ScaleConfig = {
  type: 'sequential',
  palette: ['#6fb4ff', '#ff8a4c'],
  domain: [0, 1500],
  noDataColor: '#1a2029',
};

const MARKERS: ReadonlyArray<MarkerConfig> = [
  { id: 'tokyo', position: [35.68, 139.69], color: '#ff8a4c', size: 1.9, pulse: true, label: 'Tokyo' },
  { id: 'nairobi', position: [-1.29, 36.82], color: '#dcebff', size: 1.6, pulse: true, label: 'Nairobi' },
  { id: 'sao-paulo', position: [-23.55, -46.63], color: '#ff8a4c', size: 1.8, pulse: true, label: 'São Paulo' },
  { id: 'warsaw', position: [52.23, 21.01], color: '#dcebff', size: 1.6, pulse: true, label: 'Warsaw' },
  { id: 'sydney', position: [-33.87, 151.21], color: '#dcebff', size: 1.4, label: 'Sydney' },
  { id: 'san-francisco', position: [37.77, -122.42], color: '#dcebff', size: 1.4, label: 'San Francisco' },
];

const ARCS: ReadonlyArray<ArcConfig> = [
  { id: 'sf-tokyo', from: [37.77, -122.42], to: [35.68, 139.69], color: '#ff8a4c', width: 1.3, animated: true, animationDuration: 3.2, headEasing: 'pulse' },
  { id: 'warsaw-nairobi', from: [52.23, 21.01], to: [-1.29, 36.82], color: '#6fb4ff', width: 1.1, style: 'dashed', dashSize: 0.03, dashGap: 0.02, animated: true, animationDuration: 3.6 },
  { id: 'sao-paulo-sydney', from: [-23.55, -46.63], to: [-33.87, 151.21], color: '#dcebff', width: 1, animated: true, animationDuration: 4.4, headEasing: 'easeInOut' },
];

interface Stop {
  readonly id: string;
  readonly label: string;
  readonly country: string;
  readonly position: readonly [number, number];
  readonly popup: string;
}

const STOPS: ReadonlyArray<Stop> = [
  { id: 'tokyo', label: 'Tokyo', country: '392', position: [35.68, 139.69], popup: 'Tokyo · 37.4M' },
  { id: 'nairobi', label: 'Nairobi', country: '404', position: [-1.29, 36.82], popup: 'Nairobi · 5.1M' },
  { id: 'sao-paulo', label: 'São Paulo', country: '076', position: [-23.55, -46.63], popup: 'São Paulo · 22.4M' },
  { id: 'warsaw', label: 'Warsaw', country: '616', position: [52.23, 21.01], popup: 'Warsaw · 1.8M' },
];

const TOUR: StoryConfig = {
  loop: true,
  scenes: STOPS.map((stop) => ({
    id: stop.id,
    duration: 4600,
    transitionDuration: 1800,
    flyTo: { position: stop.position },
    activeCountry: stop.country,
    popup: { position: stop.position, content: stop.popup, anchor: 'top' },
  })),
};

const SNIPPET = `globe.setCountryData(population, {
  type: 'sequential',
  palette: ['#6fb4ff', '#ff8a4c'],
  domain: [0, 1500],
});

globe.setMarkers([{ id: 'tokyo', position: [35.68, 139.69], pulse: true }]);
globe.setArcs([{ id: 'sf-tokyo', from: [37.77, -122.42], to: [35.68, 139.69] }]);

globe.setStory({
  loop: true,
  scenes: [
    { id: 'tokyo',   duration: 4600, flyTo: { position: [35.68, 139.69] }, activeCountry: '392' },
    { id: 'nairobi', duration: 4600, flyTo: { position: [-1.29, 36.82] },  activeCountry: '404' },
  ],
});
globe.playStory();

globe.on('countryClick', ({ country }) => select(country.id));`;

const API_ROWS: ReadonlyArray<{ readonly call: string; readonly what: string }> = [
  { call: 'setCountryData(values, scale)', what: 'Choropleth with sequential, diverging, threshold or categorical scales and a built-in legend.' },
  { call: 'setMarkers([…])', what: 'Instanced pins with pulse, hover scale, labels and tooltips.' },
  { call: 'setArcs([…])', what: 'Animated routes: solid or dashed, auto height, three head easings.' },
  { call: 'setHtmlMarkers([…])', what: 'Your own DOM on the surface, hidden when it rotates behind the planet.' },
  { call: "setDataLayer({ type: 'hexbin' })", what: 'Hexbin, bars, extruded, heatmap and chart layers on any kind.' },
  { call: 'setStory({ scenes })', what: 'Fly, focus, popups, timing and easing per scene. Play, pause, jump.' },
  { call: "on('countryClick', …)", what: 'Country, marker, surface and scene events, all typed.' },
];

/** A live outline globe carrying a choropleth, markers, arcs and a four-stop story. */
export function DataSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const near = useInViewport(sectionRef, { rootMargin: '40% 0px 40% 0px' });
  const coarse = useCoarsePointer();
  const [instance, setInstance] = useState<GlobeInstance | null>(null);
  const [scene, setScene] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!instance) return undefined;
    const offEnter = instance.on('sceneEnter', ({ scene: s }) => setScene(s.id));
    return () => {
      offEnter();
    };
  }, [instance]);

  useEffect(() => {
    if (!near) {
      setInstance(null);
      setScene(null);
      setPlaying(false);
    }
  }, [near]);

  const jumpTo = (id: string): void => {
    if (!instance) return;
    instance.goToScene(id);
    setScene(id);
  };
  const togglePlay = (): void => {
    if (!instance) return;
    if (instance.isStoryPlaying()) {
      instance.pauseStory();
      setPlaying(false);
    } else {
      instance.playStory();
      setPlaying(true);
    }
  };

  return (
    <section ref={sectionRef} id="data" className="relative py-28 md:py-36" aria-label="Data layers">
      <div className="wrap grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-28">
          <span className="eyebrow reveal">globe.setCountryData()</span>
          <h2 className="t-h2 reveal reveal-d1 mt-5">Data lives on the surface.</h2>
          <p className="t-lead reveal reveal-d2 mt-5 max-w-[34rem]">
            Every layer is one call on the instance and works on every kind. Fills, pins, routes,
            your own HTML, and a story that flies between them.
          </p>
          <dl className="reveal reveal-d3 mt-9 divide-y divide-[var(--hair)] border-y border-[var(--hair)]">
            {API_ROWS.map((row) => (
              <div key={row.call} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6">
                <dt className="t-mono text-[var(--ice)]">{row.call}</dt>
                <dd className="t-body">{row.what}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="reveal card relative aspect-square overflow-hidden rounded-[24px] lg:aspect-[7/6]">
            {near && (
              <DecorationGlobe
                kind="outline"
                theme="outline-dark"
                speed={0.02}
                initialLat={18}
                initialLng={24}
                starfield={false}
                atmosphere
                framingPadding={0.1}
                interactive={!coarse}
                maxFps={60}
                onReady={({ instance: globe }) => {
                  globe.setCountryData(POPULATION, SCALE);
                  globe.setMarkers(MARKERS);
                  globe.setArcs(ARCS);
                  globe.setStory(TOUR);
                  setInstance(globe);
                }}
                className="absolute inset-0"
              />
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="pointer-events-auto flex flex-wrap gap-1.5 rounded-full border border-[var(--hair)] bg-[rgba(5,6,8,0.7)] p-1 backdrop-blur-md">
                {STOPS.map((stop) => (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => jumpTo(stop.id)}
                    disabled={!instance}
                    className={cn('tab', scene === stop.id && 'is-active')}
                  >
                    {stop.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={togglePlay}
                disabled={!instance}
                className="btn btn-ghost btn-sm pointer-events-auto bg-[rgba(5,6,8,0.7)] backdrop-blur-md"
              >
                <FontAwesomeIcon icon={playing ? faPause : faPlay} className="size-2.5" />
                {playing ? 'Pause tour' : 'Play tour'}
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-[var(--hair)] bg-[rgba(5,6,8,0.7)] px-3.5 py-2.5 backdrop-blur-md">
              <div className="t-mono text-[var(--mist)]">population · millions</div>
              <div className="mt-2 h-1.5 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, #6fb4ff, #ff8a4c)' }} />
              <div className="t-mono mt-1.5 flex justify-between text-[var(--ice)]">
                <span>0</span>
                <span>1500</span>
              </div>
            </div>

            {!instance && near && (
              <div className="t-mono pointer-events-none absolute inset-0 flex items-center justify-center text-[var(--mist)]">
                loading countries…
              </div>
            )}
          </div>
          <CodeBlock code={SNIPPET} title="data.ts" className="reveal reveal-d1" />
        </div>
      </div>
    </section>
  );
}
