import { useEffect, useState, type RefObject } from 'react';

export interface UseInViewportOptions {
  readonly rootMargin?: string;
  readonly threshold?: number | ReadonlyArray<number>;
  /** Once true, stay true (mount-once semantics for heavy children). */
  readonly once?: boolean;
}

/**
 * Track whether `ref` intersects the viewport. Gates the expensive parts of
 * the page — a globe only mounts when its section is near the screen.
 */
export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewportOptions = {},
): boolean {
  const [inView, setInView] = useState(false);
  const { rootMargin = '0px', threshold = 0, once = false } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold: threshold as number | number[] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, once]);

  return inView;
}
