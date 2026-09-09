import { Component, useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChartNoAxesColumnIncreasing, Globe2, Layers, MapPin, Pause, Play, Route } from 'lucide-react';
import type { ArcConfig, BarsDataLayer, CountryDataMap, GlobeInstance, HeatmapDataLayer, LatLng, MarkerConfig, ScaleConfig, StoryConfig } from '@your-globe/core';

import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared/components/DecorationGlobe';
import { isGlobeRuntimeLoadError } from '@/lib/globe-runtime';
import { useInViewport } from '../hooks/use-in-viewport';
import './experience.css';

const MODES = [
  { id: 'routes', label: 'Routes', icon: Route, title: 'A world of connections.', description: 'Choose an origin. Watch a new network take shape.', method: 'globe.setArcs(routes)', href: '/docs/data/arcs', link: 'Build with arcs' },
  { id: 'countries', label: 'Country data', icon: Globe2, title: 'Numbers become geography.', description: 'One value per country. A shared scale makes the differences visible.', method: 'globe.setCountryData(values, scale)', href: '/docs/data/country-data', link: 'Map country values' },
  { id: 'bars', label: 'Bars', icon: ChartNoAxesColumnIncreasing, title: 'Another dimension of data.', description: 'Coordinates become columns. Height and color carry the same sample value.', method: "globe.setDataLayer({ type: 'bars', data })", href: '/docs/data/data-layers#data-shapes', link: 'Explore data layers' },
  { id: 'heatmap', label: 'Heatmap', icon: Layers, title: 'Find the bigger picture.', description: 'Individual points merge into a density field. Change their reach below.', method: "globe.setDataLayer({ type: 'heatmap', data })", href: '/docs/data/data-layers#heatmap', link: 'Explore heatmaps' },
  { id: 'stories', label: 'Stories', icon: MapPin, title: 'Six stops. Your own pace.', description: 'A camera flight, a country highlight, a new perspective. Choose the next stop.', method: "globe.goToScene('warsaw')", href: '/docs/story/engine', link: 'Build a globe story' },
] as const;

type Mode = typeof MODES[number]['id'];
type PreviewStatus = 'loading' | 'ready' | 'error';

// Sample intensities are deliberately synthetic, not traffic or population statistics.
const CITIES = [
  { id: 'warsaw', code: 'WAW', name: 'Warsaw', position: [52.23, 21.01], country: '616', value: 58 },
  { id: 'london', code: 'LON', name: 'London', position: [51.51, -0.13], country: '826', value: 76 },
  { id: 'new-york', code: 'NYC', name: 'New York', position: [40.71, -74.01], country: '840', value: 94 },
  { id: 'san-francisco', code: 'SFO', name: 'San Francisco', position: [37.77, -122.42], country: '840', value: 64 },
  { id: 'sao-paulo', code: 'SAO', name: 'São Paulo', position: [-23.55, -46.63], country: '076', value: 69 },
  { id: 'cape-town', code: 'CPT', name: 'Cape Town', position: [-33.92, 18.42], country: '710', value: 35 },
  { id: 'nairobi', code: 'NBO', name: 'Nairobi', position: [-1.29, 36.82], country: '404', value: 52 },
  { id: 'dubai', code: 'DXB', name: 'Dubai', position: [25.2, 55.27], country: '784', value: 81 },
  { id: 'mumbai', code: 'BOM', name: 'Mumbai', position: [19.08, 72.88], country: '356', value: 88 },
  { id: 'singapore', code: 'SIN', name: 'Singapore', position: [1.35, 103.82], country: '702', value: 73 },
  { id: 'tokyo', code: 'TYO', name: 'Tokyo', position: [35.68, 139.69], country: '392', value: 97 },
  { id: 'sydney', code: 'SYD', name: 'Sydney', position: [-33.87, 151.21], country: '036', value: 61 },
] as const;
type City = typeof CITIES[number];

const COUNTRIES = [
  { id: '616', name: 'Poland', value: 58 }, { id: '826', name: 'United Kingdom', value: 76 },
  { id: '840', name: 'United States', value: 94 }, { id: '124', name: 'Canada', value: 43 },
  { id: '076', name: 'Brazil', value: 69 }, { id: '032', name: 'Argentina', value: 28 },
  { id: '152', name: 'Chile', value: 36 }, { id: '484', name: 'Mexico', value: 47 },
  { id: '710', name: 'South Africa', value: 35 }, { id: '404', name: 'Kenya', value: 52 },
  { id: '566', name: 'Nigeria', value: 66 }, { id: '818', name: 'Egypt', value: 39 },
  { id: '784', name: 'United Arab Emirates', value: 81 }, { id: '356', name: 'India', value: 88 },
  { id: '156', name: 'China', value: 84 }, { id: '392', name: 'Japan', value: 97 },
  { id: '036', name: 'Australia', value: 61 }, { id: '360', name: 'Indonesia', value: 71 },
  { id: '410', name: 'South Korea', value: 79 }, { id: '764', name: 'Thailand', value: 55 },
  { id: '276', name: 'Germany', value: 67 }, { id: '250', name: 'France', value: 62 },
  { id: '724', name: 'Spain', value: 44 }, { id: '792', name: 'Türkiye', value: 49 },
] as const;
const SCORES: CountryDataMap = Object.fromEntries(COUNTRIES.map((entry) => [entry.id, { value: entry.value, opacity: 0.9 }]));
const SCALE: ScaleConfig = { type: 'sequential', palette: ['#6fb4ff', '#ff8a4c'], domain: [0, 100], noDataColor: '#101419' };
const RANKED_COUNTRIES = [...COUNTRIES].sort((a, b) => b.value - a.value);
const RANKED_CITIES = [...CITIES].sort((a, b) => b.value - a.value);
const STORY_CITIES = ['warsaw', 'nairobi', 'dubai', 'tokyo', 'sydney', 'san-francisco'].map((id) => CITIES.find((city) => city.id === id)!);
const VIEWS = [
  { id: 'east', label: 'Europe + Africa', position: [24, 30] },
  { id: 'west', label: 'Americas', position: [15, -78] },
  { id: 'pacific', label: 'Asia + Pacific', position: [12, 118] },
] as const;

const findCity = (id: string): City => CITIES.find((city) => city.id === id) ?? CITIES[0];
const sampleColor = (value: number): string => {
  const t = Math.max(0, Math.min(1, value / 100));
  return `rgb(${Math.round(111 + 144 * t)}, ${Math.round(180 - 42 * t)}, ${Math.round(255 - 179 * t)})`;
};
const makeMarkers = (cities: ReadonlyArray<City>): ReadonlyArray<MarkerConfig> => cities.map((city) => ({
  id: city.id, position: city.position, color: sampleColor(city.value), size: 1.45, label: city.name, pulse: false,
}));
const MARKERS = makeMarkers(CITIES);
const STORY_MARKERS = makeMarkers(STORY_CITIES);

function makeRoutes(origin: City, reducedMotion: boolean): ReadonlyArray<ArcConfig> {
  return CITIES.filter((city) => city.id !== origin.id).map((city, index) => ({
    id: `${origin.id}-${city.id}`, from: origin.position, to: city.position,
    color: index % 3 === 0 ? '#dcebff' : index % 3 === 1 ? '#6fb4ff' : '#ff8a4c',
    width: 1.6, height: 'auto', minHeight: 0.08, maxHeight: 0.34,
    animated: !reducedMotion, animationDuration: 3.2 + (index % 4) * 0.55, headEasing: 'easeInOut',
  }));
}
const STORY_ARCS: ReadonlyArray<ArcConfig> = STORY_CITIES.slice(1).map((city, index) => ({
  id: `journey-${index}`, from: STORY_CITIES[index]!.position, to: city.position,
  color: '#ff8a4c', width: 1.4, height: 'auto', minHeight: 0.08, maxHeight: 0.26, animated: false,
}));
const makeBars = (reducedMotion: boolean): BarsDataLayer => ({
  type: 'bars', data: CITIES.map((city) => ({ position: city.position, value: city.value, data: { name: city.name } })),
  scale: SCALE, width: 0.028, height: { min: 0.045, max: 0.36 },
  animateOnMount: reducedMotion ? 'none' : 'rise', mountDurationMs: reducedMotion ? 0 : 900,
});

// Seven deterministic samples around each city form a legible, reproducible density field.
const HEAT_SAMPLES = CITIES.flatMap((city) => Array.from({ length: 7 }, (_, index) => {
  const angle = index * Math.PI / 3;
  const spread = index === 0 ? 0 : 3.2;
  return {
    position: [city.position[0] + Math.sin(angle) * spread, city.position[1] + Math.cos(angle) * spread] as LatLng,
    value: city.value / 100 * (index === 0 ? 1 : 0.55),
  };
}));
const makeHeatmap = (broad: boolean): HeatmapDataLayer => ({
  type: 'heatmap', data: HEAT_SAMPLES, radius: broad ? 0.24 : 0.13, maxHeight: 0.105,
  scale: { type: 'sequential', palette: ['#203a60', '#6fb4ff', '#ff8a4c', '#ffcca3'], domain: [0, 1] },
  kernel: 'gaussian', normalize: 'peak', threshold: 0.025, intensity: 1.1,
  textureResolution: { width: 1024, height: 512 }, meshResolution: { width: 256, height: 128 },
  contours: { color: '#dcebff', opacity: 0.2, majorOpacity: 0.35, interval: 0.12 },
  grid: false, countryDomes: false, animation: false, rimFade: 0.1,
});
const makeStory = (reducedMotion: boolean): StoryConfig => ({
  autoPlay: false,
  scenes: STORY_CITIES.map((city) => ({
    id: city.id, duration: 6000, transitionDuration: reducedMotion ? 0 : 1200,
    flyTo: { position: city.position }, activeCountry: city.country, autoRotate: false,
  })),
});

function showMode(globe: GlobeInstance, mode: Mode, reducedMotion: boolean, origin: string, city: string, broad: boolean) {
  globe.setStory(null);
  globe.setActiveCountry(null);
  globe.setCountryData(null);
  globe.setDataLayer(null);
  globe.setArcs([]);
  globe.setMarkers([]);
  globe.update({ autoRotate: { enabled: false, speed: 0 } });
  if (mode === 'stories') {
    globe.setMarkers(STORY_MARKERS);
    globe.setArcs(STORY_ARCS);
    globe.setStory(makeStory(reducedMotion));
    globe.goToScene(city);
    return;
  }
  const originCity = findCity(origin);
  globe.flyTo(mode === 'routes' ? [originCity.position[0] * 0.6, originCity.position[1]] : [24, 48], undefined, { duration: reducedMotion ? 0 : 800 });
  if (mode === 'routes') {
    globe.setMarkers(MARKERS);
    globe.setArcs(makeRoutes(originCity, reducedMotion));
  } else if (mode === 'countries') globe.setCountryData(SCORES, SCALE);
  else if (mode === 'bars') globe.setDataLayer(makeBars(reducedMotion));
  else globe.setDataLayer(makeHeatmap(broad));
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Coordinates({ position }: { readonly position: LatLng }) {
  return <span>{Math.abs(position[0]).toFixed(1)}°{position[0] < 0 ? 'S' : 'N'} <span aria-hidden="true">/</span> {Math.abs(position[1]).toFixed(1)}°{position[1] < 0 ? 'W' : 'E'}</span>;
}

/** A single lazily mounted Outline instance powers every layer and view. */
export function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const near = useInViewport(sectionRef, { rootMargin: '300px 0px', once: true });
  const visible = useInViewport(sectionRef);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>('routes');
  const [origin, setOrigin] = useState<string>('warsaw');
  const [city, setCity] = useState<string>('warsaw');
  const [broad, setBroad] = useState(false);
  const [view, setView] = useState<string>('');
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [runtimeDownloadFailed, setRuntimeDownloadFailed] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const instance = useRef<GlobeInstance | null>(null);
  const subscriptions = useRef<Array<() => void>>([]);
  const initialized = useRef(false);
  const failed = useRef(false);
  const current = useRef({ mode, origin, city, broad, reducedMotion });
  current.current = { mode, origin, city, broad, reducedMotion };
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const active = MODES.find((entry) => entry.id === mode)!;
  const originCity = findCity(origin);
  const storyCity = findCity(city);
  const paused = mode === 'routes' && !reducedMotion && userPaused;
  const caption = mode === 'routes' ? `${CITIES.length} cities · ${CITIES.length - 1} routes from ${originCity.name}`
    : mode === 'countries' ? `${COUNTRIES.length} country values · scale 0–100`
    : mode === 'bars' ? `${CITIES.length} city values · scale 0–100`
    : mode === 'heatmap' ? `${HEAT_SAMPLES.length} samples · peak-normalized density`
    : `${STORY_CITIES.findIndex((entry) => entry.id === city) + 1} / ${STORY_CITIES.length} · ${storyCity.name}`;
  let statusLabel = '';
  if (near && status === 'loading') statusLabel = 'Loading globe…';
  else if (status === 'error') statusLabel = 'Preview unavailable';
  else if (status === 'ready') statusLabel = paused ? 'Animation paused' : reducedMotion ? 'Reduced motion' : 'Live example';

  const reportFailure = useCallback((error?: unknown) => {
    failed.current = true;
    initialized.current = false;
    subscriptions.current.forEach((unsubscribe) => unsubscribe());
    subscriptions.current = [];
    instance.current = null;
    setStatus('error');
    setRuntimeDownloadFailed(isGlobeRuntimeLoadError(error));
  }, []);
  const run = useCallback((action: (globe: GlobeInstance) => void) => {
    if (!initialized.current || !instance.current) return;
    try { action(instance.current); } catch { reportFailure(); }
  }, [reportFailure]);
  const handleReady = useCallback(({ instance: globe }: DecorationGlobeReadyApi) => {
    subscriptions.current.forEach((unsubscribe) => unsubscribe());
    instance.current = globe;
    initialized.current = false;
    failed.current = false;
    setStatus('loading');
    const canvas = globe.getCanvas();
    canvas.addEventListener('webglcontextlost', reportFailure);
    subscriptions.current = [
      () => canvas.removeEventListener('webglcontextlost', reportFailure),
      globe.on('ready', () => {
        if (instance.current !== globe || failed.current) return;
        initialized.current = true;
        const state = current.current;
        try {
          globe.update({ atmosphere: { color: '#6fb4ff', intensity: 0.65, radiusScale: 1.07 }, countries: { borderActive: { color: '#ff8a4c', width: 2 } } });
          showMode(globe, state.mode, state.reducedMotion, state.origin, state.city, state.broad);
        } catch { reportFailure(); }
      }),
      globe.on('sceneEnter', ({ scene }) => setCity(scene.id)),
      globe.on('error', reportFailure),
    ];
  }, [reportFailure]);

  useEffect(() => {
    const state = current.current;
    run((globe) => showMode(globe, mode, reducedMotion, state.origin, state.city, state.broad));
  }, [mode, reducedMotion, run]);
  useEffect(() => () => {
    subscriptions.current.forEach((unsubscribe) => unsubscribe());
    subscriptions.current = [];
    instance.current = null;
    initialized.current = false;
  }, []);

  const selectMode = (nextMode: Mode) => { setUserPaused(false); setView(''); setMode(nextMode); };
  const selectOrigin = (next: City) => {
    setUserPaused(false); setView(''); setOrigin(next.id);
    run((globe) => {
      globe.setArcs(makeRoutes(next, reducedMotion));
      globe.flyTo([next.position[0] * 0.6, next.position[1]], undefined, { duration: reducedMotion ? 0 : 900 });
    });
  };
  const selectCity = (next: City) => {
    setUserPaused(false); setView(''); setCity(next.id);
    run((globe) => globe.goToScene(next.id));
  };
  const selectView = (next: typeof VIEWS[number]) => {
    setUserPaused(false); setView(next.id);
    run((globe) => globe.flyTo(next.position, undefined, { duration: reducedMotion ? 0 : 900 }));
  };
  const selectSpread = (next: boolean) => {
    setBroad(next);
    run((globe) => globe.setDataLayer(makeHeatmap(next)));
  };
  const retryPreview = () => {
    failed.current = false;
    setStatus('loading');
    setRuntimeDownloadFailed(false);
    setPreviewAttempt((attempt) => attempt + 1);
  };
  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % MODES.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + MODES.length) % MODES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = MODES.length - 1;
    else return;
    event.preventDefault(); selectMode(MODES[next]!.id); tabButtons.current[next]?.focus();
  };

  return (
    <section ref={sectionRef} id="data" className="home-experience" aria-labelledby={`${panelId}-heading`}>
      <div className="home-wrap">
        <header className="home-experience-heading">
          <h2 id={`${panelId}-heading`}>Data goes<br /> <span>global.</span></h2>
          <div><p>Draw connections. Reveal patterns.<br /> Take your audience somewhere new.</p><span>Five live examples. One globe. Yours to explore.</span></div>
        </header>
        <div className="home-experience-workbench">
          <div className="home-experience-tabs" role="tablist" aria-label="Globe data examples">
            {MODES.map((entry, index) => <button key={entry.id} ref={(element) => { tabButtons.current[index] = element; }} type="button" role="tab" id={`${panelId}-${entry.id}`} aria-controls={`${panelId}-panel`} aria-selected={mode === entry.id} tabIndex={mode === entry.id ? 0 : -1} onClick={() => selectMode(entry.id)} onKeyDown={(event) => selectWithKeyboard(event, index)}><entry.icon size={19} strokeWidth={1.5} aria-hidden="true" /><span>{entry.label}</span></button>)}
          </div>
          <div id={`${panelId}-panel`} className="home-experience-scene" role="tabpanel" aria-labelledby={`${panelId}-${mode}`}>
            <div className="home-experience-scene-main">
              <div className="home-experience-scene-title"><h3>{active.title}</h3><span>{caption}</span></div>
              {(mode === 'routes' || mode === 'stories') && <label className="home-experience-mobile-select">
                <span>{mode === 'routes' ? 'Route origin' : 'Story stop'}</span>
                <select value={mode === 'routes' ? origin : city} disabled={status !== 'ready'} onChange={(event) => mode === 'routes' ? selectOrigin(findCity(event.target.value)) : selectCity(findCity(event.target.value))}>
                  {(mode === 'routes' ? CITIES : STORY_CITIES).map((entry, index) => <option key={entry.id} value={entry.id}>{mode === 'stories' ? `${index + 1}. ` : ''}{entry.name}</option>)}
                </select>
              </label>}
              <figure className="home-experience-figure" aria-busy={near && status === 'loading'}>
                <div id={`${panelId}-preview`} className="home-experience-art" role="img" aria-label={status === 'ready' ? `${active.label} on an Outline globe. ${caption}. Illustrative sample data.` : 'Outline globe preview'}>
                  {status !== 'ready' && <img src="/docs/kinds/outline.jpg" alt="" width={512} height={512} loading="lazy" decoding="async" className="home-experience-fallback" />}
                  {near && status !== 'error' && <PreviewBoundary key={previewAttempt} onError={reportFailure}><DecorationGlobe kind="outline" theme="outline-monochrome" speed={0} initialLat={31} initialLng={21} axisTilt={0} starfield={false} atmosphere framingPadding={0.16} interactive={false} resolution="low" maxFps={30} paused={status === 'ready' && (!visible || paused)} onReady={handleReady} onError={reportFailure} onLive={() => { if (initialized.current && !failed.current) setStatus('ready'); }} className={`home-experience-canvas${status === 'ready' ? ' is-ready' : ''}`} /></PreviewBoundary>}
                </div>
                <figcaption><span role="status">{statusLabel}</span><span>Illustrative sample data</span></figcaption>
              </figure>
              {status === 'error' && <div className="home-experience-retry"><p>{runtimeDownloadFailed ? 'The globe engine could not download. Reload the page to try again.' : 'The live globe could not start. You can try again or explore the example in the docs.'}</p><button type="button" onClick={runtimeDownloadFailed ? () => window.location.reload() : retryPreview}>{runtimeDownloadFailed ? 'Reload page' : 'Try live preview again'}</button></div>}
              {mode === 'routes' && !reducedMotion && status === 'ready' && <button className="home-experience-pause" type="button" aria-controls={`${panelId}-preview`} onClick={() => setUserPaused((value) => !value)}>{userPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}{userPaused ? 'Play routes' : 'Pause routes'}</button>}
              {mode !== 'stories' && <div className="home-experience-views" role="group" aria-label="Globe viewpoint"><span>View</span>{VIEWS.map((entry) => <button type="button" key={entry.id} aria-pressed={view === entry.id} disabled={status !== 'ready'} onClick={() => selectView(entry)}>{entry.label}</button>)}</div>}
            </div>
            <aside className={`home-experience-inspector home-experience-inspector--${mode}`} aria-label={`${active.label} controls and sample values`}>
              <p className="home-experience-description">{active.description}</p>
              {mode === 'routes' && <>
                <div className="home-experience-inspector-label"><h4>Choose an origin</h4><span>11 destinations</span></div>
                <div className="home-experience-origins" role="group" aria-label="Route origin">
                  {CITIES.map((entry) => <button type="button" key={entry.id} disabled={status !== 'ready'} aria-pressed={origin === entry.id} onClick={() => selectOrigin(entry)}><span className="home-experience-city-code">{entry.code}</span><span>{entry.name}</span><ArrowUpRight size={14} aria-hidden="true" /></button>)}
                </div>
                <div className="home-experience-origin-detail"><strong>{originCity.name} → the world</strong><Coordinates position={originCity.position} /></div>
              </>}
              {(mode === 'countries' || mode === 'bars') && <>
                <div className="home-experience-inspector-label"><h4>Sample intensity</h4><span>Top 6 values</span></div>
                <ol className="home-experience-ranking">{(mode === 'countries' ? RANKED_COUNTRIES : RANKED_CITIES).slice(0, 6).map((entry) => <li key={entry.id} style={{ '--sample-width': `${entry.value}%`, '--sample-color': sampleColor(entry.value) } as CSSProperties}><span>{entry.name}</span><strong>{entry.value}</strong><span className="home-experience-value-track" aria-hidden="true"><span /></span></li>)}</ol>
                <div className="home-experience-legend"><span>0</span><span className="home-experience-scale-bar" /><span>100</span></div>
                <p className="home-experience-data-note">Invented values for comparison, shared across the examples. They do not represent real-world activity.</p>
              </>}
              {mode === 'heatmap' && <>
                <div className="home-experience-inspector-label"><h4>Sample influence</h4><span>{broad ? '0.24 rad' : '0.13 rad'}</span></div>
                <div className="home-experience-spread" role="group" aria-label="Heatmap influence radius"><button type="button" aria-pressed={!broad} disabled={status !== 'ready'} onClick={() => selectSpread(false)}>Tight clusters</button><button type="button" aria-pressed={broad} disabled={status !== 'ready'} onClick={() => selectSpread(true)}>Broad reach</button></div>
                <dl className="home-experience-density-info"><div><dt>Source</dt><dd>12 city clusters</dd></div><div><dt>Samples</dt><dd>{HEAT_SAMPLES.length} weighted points</dd></div><div><dt>Kernel</dt><dd>Gaussian</dd></div><div><dt>Surface</dt><dd>Raised relief + contours</dd></div></dl>
                <div className="home-experience-legend home-experience-legend-heat"><span>Low</span><span className="home-experience-scale-bar" /><span>Peak</span></div>
                <p className="home-experience-data-note">Color shows relative density. Broader influence blends nearby samples into connected regions.</p>
              </>}
              {mode === 'stories' && <ol className="home-experience-itinerary" aria-label="Choose a story scene">{STORY_CITIES.map((entry, index) => <li key={entry.id}><button type="button" disabled={status !== 'ready'} aria-pressed={city === entry.id} onClick={() => selectCity(entry)}><span className="home-experience-stop">{String(index + 1).padStart(2, '0')}</span><span><strong>{entry.name}</strong><Coordinates position={entry.position} /></span><ArrowUpRight size={17} aria-hidden="true" /></button></li>)}</ol>}
            </aside>
          </div>
          <div className="home-experience-api"><code>{mode === 'stories' ? `globe.goToScene('${city}')` : active.method}</code><Link to={active.href}>{active.link}<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        </div>
      </div>
    </section>
  );
}

class PreviewBoundary extends Component<{ readonly children: ReactNode; readonly onError: () => void }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onError(); }
  override render() { return this.state.failed ? null : this.props.children; }
}
