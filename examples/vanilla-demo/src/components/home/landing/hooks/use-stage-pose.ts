import { useEffect, type RefObject } from 'react';

export interface StagePose {
  readonly x: number;
  readonly y: number;
  readonly s: number;
}

export interface StagePoses {
  readonly hero: StagePose;
  readonly chapter: StagePose;
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
export function computeStagePoses(vw: number, vh: number, size: number): StagePoses {
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

export interface UseStagePoseRefs {
  /** The tall section whose first viewport of scroll drives the morph. */
  readonly section: RefObject<HTMLElement | null>;
  /** The transformed element carrying the globe (reads `--gx/--gy/--gs/--halo/--grat`). */
  readonly pose: RefObject<HTMLDivElement | null>;
  /** The hero copy, faded and lifted out as the morph progresses. */
  readonly hero: RefObject<HTMLDivElement | null>;
}

/**
 * Scroll-driven morph of the stage globe from its hero pose into its chapter
 * pose over the first viewport height of the section. Writes CSS custom
 * properties and inline styles directly — no React state per frame — and
 * coalesces scroll events onto animation frames.
 */
export function useStagePose({ section, pose, hero }: UseStagePoseRefs): void {
  useEffect(() => {
    const sectionEl = section.current;
    const poseEl = pose.current;
    const heroEl = hero.current;
    if (!sectionEl || !poseEl) return undefined;

    let vh = 1;
    let top = 0;
    let poses = computeStagePoses(1, 1, 1);
    let raf = 0;

    const apply = (): void => {
      raf = 0;
      const p = clamp01((window.scrollY - top) / vh);
      const e = easeInOutCubic(p);
      poseEl.style.setProperty('--gx', `${lerp(poses.hero.x, poses.chapter.x, e).toFixed(1)}px`);
      poseEl.style.setProperty('--gy', `${lerp(poses.hero.y, poses.chapter.y, e).toFixed(1)}px`);
      poseEl.style.setProperty('--gs', lerp(poses.hero.s, poses.chapter.s, e).toFixed(4));
      poseEl.style.setProperty('--halo', (1 - 0.65 * e).toFixed(3));
      poseEl.style.setProperty('--grat', (0.07 + 0.09 * e).toFixed(3));
      if (heroEl) {
        const f = clamp01((p - 0.04) / 0.42);
        heroEl.style.opacity = (1 - f).toFixed(3);
        heroEl.style.transform = `translateY(${(-56 * f).toFixed(1)}px)`;
        heroEl.style.visibility = f >= 1 ? 'hidden' : 'visible';
      }
    };
    const schedule = (): void => {
      if (raf === 0) raf = requestAnimationFrame(apply);
    };
    const measure = (): void => {
      vh = Math.max(1, window.innerHeight);
      top = sectionEl.getBoundingClientRect().top + window.scrollY;
      poses = computeStagePoses(window.innerWidth, vh, Math.max(1, poseEl.offsetWidth));
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
  }, [section, pose, hero]);
}
