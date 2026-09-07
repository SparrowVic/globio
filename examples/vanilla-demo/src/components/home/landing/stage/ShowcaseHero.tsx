import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGlobe, type GlobeInstance, type GlobeKind, type ThemePresetName } from '@your-globe/core';
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
  sun: { ...STAGE_CINEMATIC.sun, visible: false },
  textures: { day: '/textures/earth/earth_atmos_2048.jpg', normal: '/textures/earth/earth_normal_2048.jpg', specular: '/textures/earth/earth_specular_2048.jpg', fadeMs: 500 },
};

/** One owned WebGL context; a style change keeps its poster visible while rebuilding. */
function ShowcaseGlobe({ kind, theme, paused, onStatus }: {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly paused: boolean;
  readonly onStatus: (status: 'loading' | 'ready' | 'error') => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
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
    };
    const fail = () => {
      if (disposed) return;
      release();
      setLive(false);
      statusRef.current('error');
    };
    setLive(false);
    statusRef.current('loading');
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        try {
          globe = createGlobe({
            container, kind, theme, transparent: true,
            initialPosition: [20, -25], axisTilt: 12,
            framing: { padding: 0.08, lockZoom: true },
            countries: { resolution: 'low', hoverEnabled: true },
            autoRotate: { enabled: true, speed: 0.12 },
            atmosphere: { enabled: true }, starfield: { enabled: false },
            focusPulse: { enabled: false },
            ...(kind === 'cinematic' ? { cinematic: CINEMATIC, arcs: STAGE_ARCS } : {}),
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
            });
          }));
          cleanups.push(globe.on('error', fail));
          globe.mount();
        } catch {
          fail();
        }
      });
    });
    return () => {
      disposed = true;
      release();
    };
  }, [kind, theme]);
  return <div className="home-globe-art">
    <img src={`/docs/kinds/${kind}.jpg`} alt="" className={`home-globe-poster${live ? ' is-hidden' : ''}`} />
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
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInViewport(stage, { rootMargin: '120px' });
  const current = STYLES.find((style) => style.kind === kind)!;
  const themeOptions = KIND_THEMES[kind];
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const chooseKind = (next: GlobeKind) => { setKind(next); setTheme(defaultThemeFor(next)); };

  return <section className="home-hero" aria-label="Interactive globe showcase">
    <div className="home-wrap home-hero-main">
      <div className="home-hero-copy">
        <p className="home-intro">An open-source globe engine for the web</p>
        <h1>Put a world<br />in their hands<span className="home-heading-dot">.</span></h1>
        <p className="home-hero-lead">Turn a place, a dataset, or a story into something people can explore. Beautiful 3D globes, made to be part of your product.</p>
        <div className="home-hero-actions">
          <Link to="/studio" className="home-button home-button-accent">Build your globe <span aria-hidden="true">↗</span></Link>
          <Link to="/docs/start/first-globe" className="home-text-link">Read the docs <span aria-hidden="true">→</span></Link>
        </div>
        <div className="home-framework-note">
          <span>At home in your stack</span>
          <div aria-label="Vanilla JavaScript, React, Vue and Angular">
            <FontAwesomeIcon icon={faJs} title="JavaScript" /><FontAwesomeIcon icon={faReact} title="React" /><FontAwesomeIcon icon={faVuejs} title="Vue" /><FontAwesomeIcon icon={faAngular} title="Angular" />
          </div>
        </div>
      </div>
      <div ref={stage} className="home-globe-stage" aria-label={`${current.title} globe preview`}>
        <ShowcaseGlobe key={`${kind}:${theme}`} kind={kind} theme={theme} paused={paused || reducedMotion || !visible} onStatus={setStatus} />
        <div className="home-globe-caption">
          <span>{current.title}<span className="home-caption-separator">/</span>{themeOptions.find((option) => option.preset === theme)?.label}</span>
          <button type="button" onClick={() => setPaused(!paused)} disabled={reducedMotion} aria-pressed={paused || reducedMotion} aria-label={reducedMotion ? 'Globe animation disabled for reduced motion' : paused ? 'Play globe animation' : 'Pause globe animation'}>{reducedMotion ? 'Reduced motion' : paused ? 'Play animation' : 'Pause animation'}<span aria-hidden="true">{paused || reducedMotion ? '▷' : 'Ⅱ'}</span></button>
        </div>
        <p className="home-globe-status" role="status">{status === 'loading' ? 'Loading interactive globe…' : status === 'error' ? 'Showing a preview. Explore this style in Studio.' : reducedMotion || paused || coarsePointer ? 'Choose a style to explore a different world.' : 'Drag to explore. Choose a style below.'}</p>
      </div>
    </div>
    <div className="home-wrap home-kind-picker" id="kinds">
      <div className="home-picker-heading"><h2>One planet. Six personalities.</h2><span>Choose your perspective <span aria-hidden="true">↘</span></span></div>
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
          <Link to={`/docs/kinds/${kind}`} className="home-text-link">Explore {current.title} <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>
  </section>;
}
