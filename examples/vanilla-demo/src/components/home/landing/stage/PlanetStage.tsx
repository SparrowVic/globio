import { useEffect, useRef, useState } from 'react';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import { cn } from '@/lib/utils';
import { Graticule, StarField } from '../atoms';
import { KIND_CHAPTERS } from '../data/kinds';
import { defaultThemeFor } from '../data/kind-themes';
import { useCoarsePointer } from '../hooks/use-coarse-pointer';
import { GlobeCrossfade } from './GlobeCrossfade';
import { HeroCopy } from './HeroCopy';
import { KindChapter } from './KindChapter';

interface Pose {
  readonly x: number;
  readonly y: number;
  readonly s: number;
}

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Where the globe sits in the hero (a planet rising past the bottom edge,
 * only its cap visible) and in the chapters (a full disc beside the copy).
 * `size` is the CSS box of the canvas; scale keeps the canvas resolution
 * constant while the pose changes.
 */
function computePoses(vw: number, vh: number, size: number): { hero: Pose; chapter: Pose } {
  if (vw < 1024) {
    const s = Math.min(1.05, Math.max(0.8, (vw * 1.25) / size));
    const d = size * s;
    const cap = Math.min(0.42 * d, 0.34 * vh);
    return {
      hero: { x: 0, y: vh / 2 + d / 2 - cap, s },
      chapter: { x: 0, y: -vh * 0.24, s: Math.min(0.6, (vw * 0.72) / size) },
    };
  }
  const s = Math.min(1.35, Math.max(1, (vw * 0.82) / size));
  const d = size * s;
  const cap = Math.min(0.42 * d, 0.4 * vh);
  return {
    hero: { x: 0, y: vh / 2 + d / 2 - cap, s },
    chapter: { x: vw * 0.21, y: 0, s: Math.min(0.7, Math.min(vw * 0.44, 700) / size) },
  };
}

const initialThemes = (): Record<GlobeKind, ThemePresetName> => ({
  cinematic: defaultThemeFor('cinematic'),
  outline: defaultThemeFor('outline'),
  dotted: defaultThemeFor('dotted'),
  wireframe: defaultThemeFor('wireframe'),
  hologram: defaultThemeFor('hologram'),
  paper: defaultThemeFor('paper'),
});

/**
 * The signature of the page: one live globe shared by the hero and the six
 * kind chapters. It is pinned for the whole section; scrolling the hero
 * morphs it from "planet on the horizon" into the chapter frame, and each
 * chapter that crosses the middle of the viewport re-renders it as its kind.
 */
export function PlanetStage() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const poseRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);
  const [themes, setThemes] = useState<Record<GlobeKind, ThemePresetName>>(initialThemes);
  const coarse = useCoarsePointer();

  // Scroll-driven pose: hero → chapter over the first viewport of scroll.
  useEffect(() => {
    const section = sectionRef.current;
    const pose = poseRef.current;
    const hero = heroRef.current;
    if (!section || !pose) return undefined;

    let vh = 1;
    let top = 0;
    let poses = computePoses(1, 1, 1);
    let raf = 0;

    const apply = (): void => {
      raf = 0;
      const p = clamp01((window.scrollY - top) / vh);
      const e = easeInOutCubic(p);
      pose.style.setProperty('--gx', `${lerp(poses.hero.x, poses.chapter.x, e).toFixed(1)}px`);
      pose.style.setProperty('--gy', `${lerp(poses.hero.y, poses.chapter.y, e).toFixed(1)}px`);
      pose.style.setProperty('--gs', lerp(poses.hero.s, poses.chapter.s, e).toFixed(4));
      pose.style.setProperty('--halo', (1 - 0.65 * e).toFixed(3));
      pose.style.setProperty('--grat', (0.07 + 0.09 * e).toFixed(3));
      if (hero) {
        const f = clamp01((p - 0.04) / 0.42);
        hero.style.opacity = (1 - f).toFixed(3);
        hero.style.transform = `translateY(${(-56 * f).toFixed(1)}px)`;
        hero.style.visibility = f >= 1 ? 'hidden' : 'visible';
      }
    };
    const schedule = (): void => {
      if (raf === 0) raf = requestAnimationFrame(apply);
    };
    const measure = (): void => {
      vh = Math.max(1, window.innerHeight);
      top = section.getBoundingClientRect().top + window.scrollY;
      poses = computePoses(window.innerWidth, vh, Math.max(1, pose.offsetWidth));
      apply();
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, []);

  // The chapter crossing the middle band of the viewport owns the globe.
  useEffect(() => {
    const nodes = chapterRefs.current.filter((n): n is HTMLDivElement => n !== null);
    if (nodes.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    for (const n of nodes) observer.observe(n);
    return () => observer.disconnect();
  }, []);

  const current = KIND_CHAPTERS[active] ?? KIND_CHAPTERS[0];
  if (!current) return null;
  const kind = current.kind;
  const theme = themes[kind];

  return (
    <section ref={sectionRef} className="stage-section" aria-label="Globe kinds">
      <div className="stage-sticky">
        <StarField className="stage-stars" />
        <div ref={poseRef} className="stage-pose">
          <div className="stage-halo" />
          <Graticule className="stage-graticule" />
          <div className="stage-enter absolute inset-0">
            <GlobeCrossfade kind={kind} theme={theme} interactive={!coarse} />
          </div>
        </div>
        <div className="stage-fade" />
      </div>

      <div className="stage-scroll">
        <div ref={heroRef} className="hero-block wrap">
          <HeroCopy />
        </div>

        {KIND_CHAPTERS.map((chapter, i) => (
          <div
            key={chapter.kind}
            ref={(el) => {
              chapterRefs.current[i] = el;
            }}
            data-index={i}
            id={i === 0 ? 'kinds' : undefined}
            className={cn('chapter wrap', i === active && 'is-active')}
          >
            <KindChapter
              chapter={chapter}
              theme={themes[chapter.kind]}
              onThemeChange={(next) => setThemes((prev) => ({ ...prev, [chapter.kind]: next }))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
