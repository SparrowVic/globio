import { Component, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ArcConfig, CountryDataMap, GlobeInstance, MarkerConfig, ScaleConfig, StoryConfig } from '@your-globe/core';

import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared/components/DecorationGlobe';
import { useInViewport } from '../hooks/use-in-viewport';
import './experience.css';

const MODES = [
  {
    id: 'routes', label: 'Routes', title: 'Every connection has a destination.',
    description: 'Join coordinates with arcs that follow the globe. Give each route its own color, height, and movement.',
    method: 'globe.setArcs(routes)', href: '/docs/data/arcs', link: 'Explore routes',
    caption: 'Sample network · 3 cities, 3 routes',
  },
  {
    id: 'countries', label: 'Country data', title: 'Let the surface tell the story.',
    description: 'Bind values to country IDs and turn a color scale into a map. These illustrative scores show how a few numbers change the view.',
    method: 'globe.setCountryData(values, scale)', href: '/docs/data/country-data', link: 'Explore country data',
    caption: 'Illustrative scores · 9 countries',
  },
  {
    id: 'stories', label: 'Stories', title: 'Take people somewhere.',
    description: 'Move between places with a camera flight and a country highlight. Choose a city below to enter its scene, at your own pace.',
    method: "globe.goToScene('warsaw')", href: '/docs/story/engine', link: 'Explore the story engine',
    caption: 'Manual story · 3 scenes',
  },
] as const;

type Mode = typeof MODES[number]['id'];
type PreviewStatus = 'loading' | 'ready' | 'error';

const CITIES = [
  { id: 'warsaw', name: 'Warsaw', position: [52.23, 21.01], country: '616', color: '#dcebff' },
  { id: 'tokyo', name: 'Tokyo', position: [35.68, 139.69], country: '392', color: '#ff8a4c' },
  { id: 'nairobi', name: 'Nairobi', position: [-1.29, 36.82], country: '404', color: '#6fb4ff' },
] as const;

const MARKERS: ReadonlyArray<MarkerConfig> = CITIES.map((city) => ({
  id: city.id, position: city.position, color: city.color, size: 1.6, label: city.name, pulse: false,
}));

const ROUTES: ReadonlyArray<ArcConfig> = CITIES.map((city, index) => ({
  id: `sample-${city.id}`, from: city.position, to: CITIES[(index + 1) % CITIES.length]!.position,
  color: city.color, width: 1.5, height: 'auto', minHeight: 0.1, maxHeight: 0.28,
  animated: true, animationDuration: 3 + index * 0.6, headEasing: 'easeInOut',
}));
const STATIC_ROUTES: ReadonlyArray<ArcConfig> = ROUTES.map((route) => ({ ...route, animated: false }));

// Illustrative values only; these scores do not describe a real-world dataset.
const SCORES: CountryDataMap = {
  '616': { value: 42 }, '392': { value: 88 }, '404': { value: 65 },
  '156': { value: 72 }, '356': { value: 56 }, '036': { value: 83 },
  '710': { value: 24 }, '276': { value: 33 }, '250': { value: 18 },
};
const SCALE: ScaleConfig = {
  type: 'sequential', palette: ['#6fb4ff', '#ff8a4c'], domain: [0, 100], noDataColor: '#101419',
};

const makeStory = (reducedMotion: boolean): StoryConfig => ({
  autoPlay: false,
  scenes: CITIES.map((city) => ({
    id: city.id, duration: 6000, transitionDuration: reducedMotion ? 0 : 1100,
    flyTo: { position: city.position }, activeCountry: city.country, autoRotate: false,
  })),
});

function showMode(globe: GlobeInstance, mode: Mode, reducedMotion: boolean, city: string) {
  globe.setStory(null);
  globe.setActiveCountry(null);
  globe.setCountryData(null);
  globe.setArcs([]);
  globe.setMarkers([]);
  globe.update({ autoRotate: { enabled: false, speed: 0 } });

  if (mode === 'stories') {
    globe.setMarkers(MARKERS);
    globe.setStory(makeStory(reducedMotion));
    globe.goToScene(city);
    return;
  }

  globe.flyTo([22, 55], undefined, { duration: reducedMotion ? 0 : 800 });
  if (mode === 'routes') {
    globe.setMarkers(MARKERS);
    globe.setArcs(reducedMotion ? STATIC_ROUTES : ROUTES);
  } else {
    globe.setCountryData(SCORES, SCALE);
  }
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

/** One lazily mounted globe, updated in place by every example. */
export function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const near = useInViewport(sectionRef, { rootMargin: '300px 0px', once: true });
  const visible = useInViewport(sectionRef);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>('routes');
  const [city, setCity] = useState<string>('warsaw');
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [userPaused, setUserPaused] = useState(false);
  const instance = useRef<GlobeInstance | null>(null);
  const subscriptions = useRef<Array<() => void>>([]);
  const initialized = useRef(false);
  const failed = useRef(false);
  const current = useRef({ mode, city, reducedMotion });
  current.current = { mode, city, reducedMotion };
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const active = MODES.find((entry) => entry.id === mode)!;

  const reportFailure = useCallback(() => {
    failed.current = true;
    initialized.current = false;
    subscriptions.current.forEach((unsubscribe) => unsubscribe());
    subscriptions.current = [];
    instance.current = null;
    setStatus('error');
  }, []);

  const handleReady = useCallback(({ instance: globe }: DecorationGlobeReadyApi) => {
    subscriptions.current.forEach((unsubscribe) => unsubscribe());
    instance.current = globe;
    initialized.current = false;
    failed.current = false;
    setStatus('loading');
    subscriptions.current = [
      globe.on('ready', () => {
        if (instance.current !== globe || failed.current) return;
        initialized.current = true;
        const state = current.current;
        try {
          showMode(globe, state.mode, state.reducedMotion, state.city);
        } catch {
          reportFailure();
        }
      }),
      globe.on('sceneEnter', ({ scene }) => setCity(scene.id)),
      globe.on('error', reportFailure),
    ];
  }, [reportFailure]);

  useEffect(() => {
    if (!initialized.current || !instance.current) return;
    try {
      showMode(instance.current, mode, reducedMotion, current.current.city);
    } catch {
      reportFailure();
    }
  }, [mode, reducedMotion, reportFailure]);

  useEffect(() => () => {
    subscriptions.current.forEach((unsubscribe) => unsubscribe());
    subscriptions.current = [];
    instance.current = null;
    initialized.current = false;
  }, []);

  const selectMode = (nextMode: Mode) => {
    setUserPaused(false);
    setMode(nextMode);
  };

  const selectCity = (id: string) => {
    setUserPaused(false);
    try {
      instance.current?.goToScene(id);
    } catch {
      reportFailure();
    }
  };

  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % MODES.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + MODES.length) % MODES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = MODES.length - 1;
    else return;
    event.preventDefault();
    selectMode(MODES[next]!.id);
    tabButtons.current[next]?.focus();
  };

  return (
    <section ref={sectionRef} id="data" className="home-experience" aria-labelledby={`${panelId}-heading`}>
      <div className="home-wrap home-experience-layout">
        <div className="home-experience-copy">
          <h2 id={`${panelId}-heading`}>Give your data<br />a place.</h2>
          <p className="home-experience-intro">A point. A connection. A whole new perspective.</p>

          <div className="home-experience-tabs" role="tablist" aria-label="Globe data examples">
            {MODES.map((entry, index) => (
              <button
                key={entry.id}
                ref={(element) => { tabButtons.current[index] = element; }}
                type="button"
                role="tab"
                id={`${panelId}-${entry.id}`}
                aria-controls={`${panelId}-panel`}
                aria-selected={mode === entry.id}
                tabIndex={mode === entry.id ? 0 : -1}
                onClick={() => selectMode(entry.id)}
                onKeyDown={(event) => selectWithKeyboard(event, index)}
              >{entry.label}</button>
            ))}
          </div>

          <div className="home-experience-detail" id={`${panelId}-panel`} role="tabpanel" aria-labelledby={`${panelId}-${mode}`}>
            <h3>{active.title}</h3>
            <p>{active.description}</p>
            {mode === 'stories' && (
              <div className="home-experience-cities" role="group" aria-label="Choose a story scene">
                {CITIES.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    disabled={status !== 'ready'}
                    aria-pressed={city === place.id}
                    onClick={() => selectCity(place.id)}
                  >{place.name}<span aria-hidden="true">↗</span></button>
                ))}
              </div>
            )}
            <code className="home-experience-method">{mode === 'stories' ? `globe.goToScene('${city}')` : active.method}</code>
            <Link className="home-text-link home-experience-docs" to={active.href}>
              {active.link}<span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <figure className="home-experience-figure" aria-busy={near && status === 'loading'}>
          <div id={`${panelId}-preview`} className="home-experience-art" role="img" aria-label={status === 'ready' ? `${active.label} on an Outline globe. ${mode === 'stories' ? `Current scene: ${CITIES.find((place) => place.id === city)?.name ?? city}.` : active.caption}` : 'Outline globe preview'}>
            {status !== 'ready' && <img src="/docs/kinds/outline.jpg" alt="" width={512} height={512} loading="lazy" decoding="async" className="home-experience-fallback" />}
            {near && status !== 'error' && (
              <PreviewBoundary onError={reportFailure}>
                <DecorationGlobe
                  kind="outline" theme="outline-dark" speed={0} initialLat={22} initialLng={55}
                  starfield={false} atmosphere framingPadding={0.11} interactive={false}
                  resolution="low" maxFps={30}
                  // Present the first preview before honoring viewport or user pauses.
                  paused={status === 'ready' && (!visible || (mode === 'routes' && !reducedMotion && userPaused))}
                  onReady={handleReady}
                  onLive={() => { if (initialized.current && !failed.current) setStatus('ready'); }}
                  className={`home-experience-canvas${status === 'ready' ? ' is-ready' : ''}`}
                />
              </PreviewBoundary>
            )}
          </div>
          <figcaption>
            <span>{status === 'error' ? 'Preview unavailable · explore the guides alongside' : active.caption}</span>
            {mode === 'countries' && (
              <span className="home-experience-scale" aria-label="Sample color scale from 0 to 100">
                <span>0</span><span className="home-experience-scale-bar" /><span>100</span>
              </span>
            )}
            <span className="home-experience-playback">
              <span className="home-experience-status" role="status">{near && status === 'loading' ? 'Loading preview…' : status === 'ready' ? mode === 'stories' ? CITIES.find((place) => place.id === city)?.name : mode === 'routes' && userPaused && !reducedMotion ? 'Paused' : 'Live example' : ''}</span>
              {mode === 'routes' && !reducedMotion && status !== 'error' && (
                <button
                  className="home-experience-pause"
                  type="button"
                  disabled={status !== 'ready'}
                  aria-controls={`${panelId}-preview`}
                  onClick={() => setUserPaused((paused) => !paused)}
                >
                  <span aria-hidden="true">{userPaused ? '▶' : 'Ⅱ'}</span>
                  {userPaused ? 'Play animation' : 'Pause animation'}
                </button>
              )}
            </span>
          </figcaption>
        </figure>
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
