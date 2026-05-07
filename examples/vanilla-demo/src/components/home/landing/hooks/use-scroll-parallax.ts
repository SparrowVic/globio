import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns a scroll-driven Y offset relative to the viewport center,
 * scaled by `factor` and clamped to ±`maxAbs`. Use to drift orbit
 * rings, atmospheric layers, or background art slightly opposite the
 * scroll direction without leaving the section's painted area.
 */
export function useScrollParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
  factor: number,
  maxAbs: number,
): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const next = (center - viewportCenter) * factor;
      const clamped = Math.max(-maxAbs, Math.min(maxAbs, next));
      setOffset(clamped);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, factor, maxAbs]);

  return offset;
}
