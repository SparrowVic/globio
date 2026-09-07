import { useEffect, useState, type MutableRefObject } from 'react';

/**
 * Index of the chapter currently crossing the middle band of the viewport.
 * Elements register through `refs` (indexed by chapter) and must carry
 * `data-index`. The band is the central 10% of the viewport, so exactly one
 * chapter owns the stage at a time and a switch happens mid-transition.
 */
export function useActiveChapter(refs: MutableRefObject<Array<HTMLElement | null>>): number {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const nodes = refs.current.filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    for (const n of nodes) observer.observe(n);
    return () => observer.disconnect();
  }, [refs]);

  return active;
}
