import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { GlobeInstance, GlobeKind, ThemePresetName } from '@your-globe/core';
import { isGlobeRuntimeLoadError, loadGlobeRuntime } from '@/lib/globe-runtime';
import { studioHref } from '@/lib/studio-link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngular, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';
import { KIND_THEMES, defaultThemeFor } from '../data/kind-themes';
import { STAGE_ARCS, STAGE_CINEMATIC } from './stage-config';
import { useInViewport } from '../hooks/use-in-viewport';

const STYLES: ReadonlyArray<{ kind: GlobeKind; title: string; detail: string; description: string }> = [
  { kind: 'cinematic', title: 'Cinematic', detail: 'Light. Atmosphere. Earth.', description: 'An Earth with depth: textured terrain, drifting clouds, sunlit oceans and a scattering atmosphere.' },
  { kind: 'outline', title: 'Outline', detail: 'Every border tells a story.', description: 'Crisp country outlines, precise selection and the full collection of data layers. Built for the bigger picture.' },
  { kind: 'dotted', title: 'Dotted', detail: 'A world made of points.', description: 'Continents become a field of light, with ripples, responsive dots and optional constellations that follow your cursor.' },
  { kind: 'wireframe', title: 'Wireframe', detail: 'See the underlying structure.', description: 'Latitude, longitude and moving signals. A geometric globe with grid pulses and a dedicated active-country ring.' },
  { kind: 'hologram', title: 'Hologram', detail: 'A different kind of presence.', description: 'A luminous shell of scanlines, rim light and shifting signals. Give a network or an interface its own visual language.' },
  { kind: 'paper', title: 'Paper', detail: 'The feeling of an atlas.', description: 'Inky borders, pastel countries and textured paper. A softer place for exploration, education and stories.' },
];
const CINEMATIC = {
  ...STAGE_CINEMATIC,
  surface: { ...STAGE_CINEMATIC.surface, lightDirection: [-0.4, 0.65, 0.6] as const, keyIntensity: 1.1, fillIntensity: 0.2, rimIntensity: 0.7 },
  clouds: { enabled: true, coverage: 0.32, opacity: 0.6, shadows: true },
  aurora: { enabled: false },
  network: { enabled: false },
  borders: { enabled: true, intensity: 0.45 },
  sun: { ...STAGE_CINEMATIC.sun, visible: false },
  textures: { day: '/textures/earth/earth_atmos_2048.jpg', normal: '/textures/earth/earth_normal_2048.jpg', specular: '/textures/earth/earth_specular_2048.jpg', fadeMs: 500 },
};

/** One owned WebGL context; a style change keeps its poster visible while rebuilding. */
function ShowcaseGlobe({ kind, theme, paused, onStatus, onInstance }: {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly paused: boolean;
  readonly onStatus: (status: 'loading' | 'ready' | 'error', error?: unknown) => void;
  readonly onInstance: (instance: GlobeInstance | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  const instanceCallback = useRef(onInstance);
  instanceCallback.current = onInstance;
  const [live, setLive] = useState(false);
  useEffect(() => { globeRef.current?.setPaused(paused); }, [paused]);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let frame = 0;
    let globe: GlobeInstance | undefined;
    const cleanups: Array<() => void> = [];
    const release = () => {
      cancelAnimationFrame(frame);
      cleanups.splice(0).forEach((cleanup) => cleanup());
      globe?.destroy();
      globe = undefined;
      globeRef.current = null;
      instanceCallback.current(null);
    };
    const fail = (error?: unknown) => {
      if (disposed) return;
      release();
      setLive(false);
      statusRef.current('error', error);
    };
    setLive(false);
    statusRef.current('loading');
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(async () => {
        if (disposed) return;
        try {
          const { createGlobe } = await loadGlobeRuntime();
          if (disposed) return;
          globe = createGlobe({
            container, kind, theme, transparent: true,
            initialPosition: [28, -12], axisTilt: 12,
            framing: { padding: 0.04, lockZoom: true },
            countries: { resolution: 'low', hoverEnabled: true },
            autoRotate: { enabled: true, speed: 0.08 },
            atmosphere: { enabled: true }, starfield: { enabled: true, density: 1200, twinkle: { enabled: false } },
            focusPulse: { enabled: false },
            ...(kind === 'cinematic' ? { cinematic: CINEMATIC, arcs: STAGE_ARCS, postprocessing: { bloom: { strength: 0.3, radius: 0.5 }, streak: { enabled: false }, grain: { enabled: false }, vignette: { enabled: false } } } : {}),
            performance: { maxFps: 40, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), adaptiveQuality: true, pauseWhenHidden: true, antialias: kind !== 'cinematic' },
          });
          globeRef.current = globe;
          cleanups.push(globe.on('ready', () => {
            if (disposed) return;
            frame = requestAnimationFrame(() => {
              if (disposed) return;
              setLive(true);
              statusRef.current('ready');
              globe?.setPaused(pausedRef.current);
              instanceCallback.current(globe ?? null);
            });
          }));
          cleanups.push(globe.on('error', fail));
          globe.mount();
        } catch (error: unknown) {
          fail(error);
        }
      });
    });
    return () => {
      disposed = true;
      release();
    };
  }, [kind, theme]);
  return <div className="home-globe-art">
    <img src={`/home/world-${kind}.webp`} alt="" width="1200" height="1200" className={`home-globe-poster${live ? ' is-hidden' : ''}`} />
    <div ref={host} className={`home-globe-canvas${live ? ' is-live' : ''}`} aria-hidden="true" />
  </div>;
}

export function ShowcaseHero() {
  const [kind, setKind] = useState<GlobeKind>('cinematic');
  const [theme, setTheme] = useState<ThemePresetName>('cinematic-night');
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [coarsePointer] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [runtimeDownloadFailed, setRuntimeDownloadFailed] = useState(false);
  const [capture, setCapture] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const instance = useRef<GlobeInstance | null>(null);
  const mounted = useRef(true);
  const onInstance = useCallback((globe: GlobeInstance | null) => { instance.current = globe; }, []);
  const onStatus = useCallback((next: 'loading' | 'ready' | 'error', error?: unknown) => {
    setStatus(next);
    setRuntimeDownloadFailed(isGlobeRuntimeLoadError(error));
  }, []);
  const scene = useRef<HTMLDivElement>(null);
  const journey = useRef<HTMLDivElement>(null);
  const stylePicker = useRef<HTMLDivElement>(null);
  const pendingExploreFocus = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInViewport(stage, { rootMargin: '120px' });
  const current = STYLES.find((style) => style.kind === kind)!;
  const themeOptions = KIND_THEMES[kind];
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { setCapture('idle'); }, [kind, theme]);
  useEffect(() => {
    const element = journey.current;
    if (!element) return;
    const desktop = window.matchMedia('(min-width: 1101px) and (min-height: 700px)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!scene.current) return;
      const animated = desktop.matches && !reducedMotion;
      element.dataset.animated = String(animated);
      if (!animated) return;
      const bounds = element.getBoundingClientRect();
      const distance = element.offsetHeight - scene.current.offsetHeight;
      const progress = Math.max(0, Math.min(1, (80 - bounds.top) / Math.max(1, distance)));
      const eased = progress * progress * (3 - 2 * progress);
      element.style.setProperty('--journey', eased.toFixed(4));
      element.style.setProperty('--intro-opacity', String(Math.max(0, 1 - progress * 3)));
      element.style.setProperty('--picker-opacity', String(Math.max(0, Math.min(1, (progress - 0.4) / 0.3))));
      element.dataset.phase = progress > 0.4 ? 'explore' : 'intro';
      if (progress >= 0.98 && pendingExploreFocus.current) {
        pendingExploreFocus.current = false;
        stylePicker.current?.querySelector<HTMLButtonElement>('.home-style-option[aria-pressed="true"]')?.focus({ preventScroll: true });
      }
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);
  const exploreStyles = (event: MouseEvent<HTMLAnchorElement>) => {
    const element = journey.current;
    if (element?.dataset.animated !== 'true' || !scene.current) return;
    event.preventDefault();
    pendingExploreFocus.current = event.detail === 0;
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top + element.offsetHeight - scene.current.offsetHeight - 80,
      behavior: 'smooth',
    });
  };
  const captureGlobe = async () => {
    const globe = instance.current;
    if (!globe) return;
    setCapture('saving');
    try {
      const url = await globe.toImage({ width: 1200, height: 1000 });
      if (!mounted.current || instance.current !== globe) return;
      const link = document.createElement('a');
      link.href = url;
      link.download = `globio-${kind}.png`;
      link.click();
      setCapture('saved');
    } catch {
      if (mounted.current && instance.current === globe) setCapture('error');
    }
  };
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const chooseKind = (next: GlobeKind) => { setKind(next); setTheme(defaultThemeFor(next)); };

  return <section className="home-hero" aria-label="Interactive globe showcase">
    <div ref={journey} className="home-hero-journey">
    <div ref={scene} className="home-hero-main">
      <div className="home-hero-copy">
        <p className="home-intro">A little code. An entirely new perspective.</p>
        <h1>The world is<br /> <span>your canvas.</span></h1>
        <p className="home-hero-lead">Build something people want to explore.<br /> Extraordinary 3D globes for your next big idea.</p>
        <div className="home-hero-actions">
          <Link to={studioHref(kind, theme)} className="home-button home-button-accent">Create your world <span aria-hidden="true">↗</span></Link>
          <a href="#kinds" onClick={exploreStyles} className="home-button home-button-secondary">Explore six worlds <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <label className="home-mobile-preview home-wrap">
        <span>Globe style</span>
        <select value={kind} onChange={(event) => chooseKind(event.target.value as GlobeKind)}>
          {STYLES.map((style) => <option key={style.kind} value={style.kind}>{style.title}</option>)}
        </select>
      </label>
      <div ref={stage} className="home-globe-stage" aria-label={`${current.title} globe preview`}>
        <ShowcaseGlobe key={`${kind}:${theme}`} kind={kind} theme={theme} paused={paused || reducedMotion || !visible} onStatus={onStatus} onInstance={onInstance} />
      </div>
      <div className="home-hero-floor home-wrap">
        <div className="home-hero-note"><span>Rendered with Globio</span><p className="home-globe-status" role="status">{status === 'loading' ? 'Your world is loading…' : status === 'error' ? runtimeDownloadFailed ? 'The globe engine could not download. Reload the page to try again.' : 'Showing a preview. Explore this style in Studio.' : reducedMotion || paused || coarsePointer ? 'Six worlds to explore. Choose yours below.' : 'This is a real globe. Go on, give it a spin.'}</p></div>
        <div className="home-globe-caption">
          <span>{current.title}<span className="home-caption-separator">/</span>{themeOptions.find((option) => option.preset === theme)?.label}</span>
          <button type="button" onClick={() => setPaused(!paused)} disabled={reducedMotion || status !== 'ready'} aria-pressed={paused || reducedMotion} aria-label={reducedMotion ? 'Globe animation disabled for reduced motion' : paused ? 'Play globe animation' : 'Pause globe animation'}>{reducedMotion ? 'Reduced motion' : paused ? 'Play' : 'Pause'}<span aria-hidden="true">{paused || reducedMotion ? '▷' : 'Ⅱ'}</span></button>
          <button type="button" onClick={captureGlobe} disabled={status !== 'ready' || capture === 'saving'}>{capture === 'saving' ? 'Capturing…' : 'Save PNG'}<span aria-hidden="true">↓</span></button>
          {status === 'error' && runtimeDownloadFailed && <button type="button" onClick={() => window.location.reload()}>Reload page</button>}
          <span className="home-capture-status" role="status">{capture === 'saved' ? 'Your PNG is ready.' : capture === 'error' ? 'Capture unavailable. Try another style.' : ''}</span>
        </div>
      </div>
    <div ref={stylePicker} className="home-wrap home-kind-picker" id="kinds" tabIndex={-1}>
      <div className="home-picker-heading"><h2>Find your<br /> <span>point of view.</span></h2><p>One engine. Six completely different characters.<br /> Pick a world and make it yours.</p></div>
      <div className="home-style-options" role="group" aria-label="Globe style">
        {STYLES.map((style) => <button type="button" key={style.kind} className={`home-style-option${style.kind === kind ? ' is-selected' : ''}`} aria-label={style.title} aria-pressed={kind === style.kind} onClick={() => chooseKind(style.kind)}>
          <img src={`/docs/kinds/${style.kind}.jpg`} alt="" width="160" height="100" />
          <span>{style.title}<span className="home-style-check" aria-hidden="true">{style.kind === kind ? '↗' : '+'}</span></span>
        </button>)}
      </div>
      <div className="home-style-details">
        <div><h3>{current.detail}</h3><p>{current.description}</p></div>
        <div className="home-style-tools">
          {themeOptions.length > 1 && <div className="home-theme-options" role="group" aria-label={`${current.title} theme`}>
            {themeOptions.map((option) => <button key={option.preset} type="button" aria-pressed={theme === option.preset} onClick={() => setTheme(option.preset)}><span style={{ backgroundColor: option.swatch }} aria-hidden="true" />{option.label}</button>)}
          </div>}
          <Link to={studioHref(kind, theme)} className="home-text-link">Edit in Studio <span aria-hidden="true">↗</span></Link>
          <button type="button" className="home-text-link home-return-preview" onClick={() => stage.current?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })}>View this globe <span aria-hidden="true">↑</span></button>
        </div>
      </div>
    </div>
    </div>
    </div>
    <div className="home-stack-strip home-wrap">
      <p>Open source.<br /><strong>Made for the way you build.</strong></p>
      <div className="home-stack-list" aria-label="Supported frameworks">
        <span><FontAwesomeIcon icon={faJs} />JavaScript</span><span><FontAwesomeIcon icon={faReact} />React</span><span><FontAwesomeIcon icon={faVuejs} />Vue</span><span><FontAwesomeIcon icon={faAngular} />Angular</span>
      </div>
    </div>
  </section>;
}
