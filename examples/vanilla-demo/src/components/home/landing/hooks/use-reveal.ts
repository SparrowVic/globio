import { useEffect, type RefObject } from 'react';

/**
 * Adds `is-in` to every `.reveal` descendant of `root` the first time it
 * scrolls into view. One observer for the whole page; elements are
 * unobserved once revealed so idle cost is zero.
 */
export function useReveal(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const targets = Array.from(el.querySelectorAll<HTMLElement>('.reveal'));
    if (targets.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [root]);
}
