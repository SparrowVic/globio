import { useEffect, useRef, useState } from 'react';
import { useInViewport } from '../hooks/use-in-viewport';

const FACTS: ReadonlyArray<{ readonly title: string; readonly copy: string }> = [
  {
    title: 'One frame loop for every globe',
    copy: 'All globes on a page share a single requestAnimationFrame loop. Decorative globes can run at 30 fps while the hero keeps 60, and the loop stops when nothing needs a frame.',
  },
  {
    title: 'Idle costs nothing',
    copy: 'A globe that scrolls out of view, or sits in a hidden tab, pauses rendering entirely and wakes on the frame it comes back.',
  },
  {
    title: 'Quality that adapts',
    copy: 'The cinematic kind measures its own frame times and steps between ultra, high and balanced tiers with hysteresis, so it settles instead of flickering.',
  },
  {
    title: 'No compile stalls',
    copy: 'Shaders compile in parallel before the first frame. Terrain and land masks bake once and are shared, and country geometry is fetched once per page.',
  },
];

/** Real frame timing of the page you are looking at, sampled twice a second. */
function FrameMeter() {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useInViewport(ref, { rootMargin: '10% 0px' });
  const [fps, setFps] = useState<number | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return undefined;
    let raf = 0;
    let frames = 0;
    let acc = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      frames += 1;
      acc += now - last;
      last = now;
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc));
        setMs(Math.round((acc / frames) * 10) / 10);
        frames = 0;
        acc = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  return (
    <div ref={ref} className="card reveal flex flex-col justify-between p-6 md:p-8">
      <div className="flex items-center justify-between">
        <span className="t-mono text-[var(--mist)]">this page, right now</span>
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--ember)]" />
          <span className="t-mono text-[var(--mist)]">live</span>
        </span>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-6">
        <div>
          <div className="meter-value text-[var(--ice)]">{fps ?? '—'}</div>
          <div className="t-mono mt-2 text-[var(--mist)]">frames per second</div>
        </div>
        <div>
          <div className="meter-value text-[var(--ice)]">{ms ?? '—'}</div>
          <div className="t-mono mt-2 text-[var(--mist)]">ms per frame</div>
        </div>
      </div>
      <p className="t-body mt-10">
        Measured with requestAnimationFrame while this card is on screen. Two globes at most are
        rendering on this page at any moment; the rest are paused or static.
      </p>
    </div>
  );
}

export function PerformanceSection() {
  return (
    <section id="performance" className="relative py-28 md:py-36" aria-label="Performance">
      <div className="wrap">
        <span className="eyebrow reveal">performance</span>
        <h2 className="t-h2 reveal reveal-d1 mt-5 max-w-[16ch]">Fast on a page that has other things to do.</h2>
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <FrameMeter />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FACTS.map((fact, i) => (
              <li key={fact.title} className={`card reveal reveal-d${(i % 4) + 1} p-6`}>
                <h3 className="t-h3 text-[var(--ice)]">{fact.title}</h3>
                <p className="t-body mt-3">{fact.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
