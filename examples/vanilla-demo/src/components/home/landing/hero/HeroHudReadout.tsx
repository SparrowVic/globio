import { useEffect, useState } from 'react';

/**
 * Mono HUD readout in the corner of the hero stage. The fps value is
 * a deliberate fake fluctuation (60 ± 1) — it sells the "this is alive"
 * feeling without forcing us to thread real renderer telemetry through
 * DecorationGlobe just to display two digits.
 */
export function HeroHudReadout() {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFps(58 + Math.floor(Math.random() * 3));
    }, 800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute right-6 top-6 z-30 rounded-lg border border-white/[0.1] bg-black/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur-md">
      <div>lat: 32.0°N</div>
      <div>lng: -66.0°W</div>
      <div className="mt-0.5 text-amber-200/85">{fps} fps</div>
    </div>
  );
}
