import { useEffect, useState } from 'react';

const LINES: ReadonlyArray<readonly [string, string]> = [
  ['$ globe.update({ markers: { count: 42 } })', '✔ 4ms'],
  ['$ globe.setStory({ scenes: [...] })', '✔ 12ms'],
  ['$ workshop.live(arcs.glow, 0.8)', '✔ 1ms'],
  ['$ globe.update({ theme: "hologram-cyan" })', '✔ 6ms'],
];

/**
 * Terminal-style strip that cycles through fake live-update commands.
 * It's not real telemetry — it's a sales pitch for the runtime update
 * surface. The cycle interval (~2.5s) leaves enough time for someone to
 * read each line, but moves quickly enough to sell "this is live".
 */
export function LiveLogStrip() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((n) => (n + 1) % LINES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  const [cmd, status] = LINES[idx];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/55 px-4 py-2.5 font-mono text-[11px] backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <span className="truncate text-slate-300">{cmd}</span>
        <span className="text-emerald-300">{status}</span>
      </div>
    </div>
  );
}
