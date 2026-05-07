import { useEffect, useState, type RefObject } from 'react';

export interface UseInViewportOptions {
  readonly rootMargin?: string;
  readonly threshold?: number | ReadonlyArray<number>;
}

/**
 * Track whether `ref` is in the viewport (per IntersectionObserver). Used
 * to gate expensive work — pausing globe auto-rotate on rows that have
 * scrolled out of view, so the page doesn't burn 60 fps × 5 globes worth
 * of GPU on dormant decoration.
 */
export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewportOptions = {},
): boolean {
  const [inView, setInView] = useState(false);
  const { rootMargin = '0px', threshold = 0.15 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin, threshold: threshold as number | number[] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
}
