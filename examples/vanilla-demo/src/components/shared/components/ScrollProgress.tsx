import { useEffect, useState } from 'react';

/**
 * Page-progress bar pinned to the top of the viewport. Pure scroll-driven
 * — no IntersectionObserver, no rAF — just a passive `scroll` listener
 * that maps `scrollY / (scrollHeight - innerHeight)` to a width %.
 *
 * Reusable on any page that scrolls; mounts once at the route root.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? window.scrollY / max : 0;
      setProgress(Math.min(1, Math.max(0, next)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]">
      <div
        className="h-full origin-left bg-gradient-to-r from-amber-200 via-orange-200 to-amber-200 shadow-[0_0_18px_rgba(255,200,90,0.6)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
