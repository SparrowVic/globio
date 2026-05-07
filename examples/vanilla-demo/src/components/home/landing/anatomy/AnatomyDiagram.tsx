import type { StarfieldConfig } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

const STARS: StarfieldConfig = {
  enabled: true,
  density: 1100,
  size: 1,
  sizeVariety: 0.7,
  palette: ['#ffffff', '#67e8f9', '#f472b6'],
  twinkle: { enabled: true, intensity: 0.55, speed: 0.32 },
};

const CALLOUTS: ReadonlyArray<{
  readonly label: string;
  readonly desc: string;
  readonly className: string;
}> = [
  {
    label: 'atmosphere',
    desc: 'fresnel halo at the terminator',
    className: 'left-[5%] top-[18%]',
  },
  {
    label: 'arcs',
    desc: 'animated route layer with timing curves',
    className: 'right-[5%] top-[22%]',
  },
  {
    label: 'markers',
    desc: 'pulsing point with hover state',
    className: 'left-[7%] bottom-[24%]',
  },
  {
    label: 'country-fill',
    desc: 'palette mode tinted choropleth',
    className: 'right-[6%] bottom-[20%]',
  },
];

export function AnatomyDiagram({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2.4rem] border border-white/[0.08] bg-[#050812]/85 p-10 shadow-[0_40px_140px_-80px_rgba(34,211,238,0.85)] backdrop-blur-xl',
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">
            full-body diagram
          </div>
          <h3 className="mt-2 max-w-xl text-2xl font-semibold leading-tight text-white">
            One globe. Every canonical layer turned on.
          </h3>
        </div>
        <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
          hologram preset
        </span>
      </div>

      <div className="relative mx-auto h-[560px] max-w-[1100px]">
        <DecorationGlobe
          kind="hologram"
          theme="hologram-cyan"
          speed={0.018}
          initialLat={12}
          initialLng={-32}
          starfield={STARS}
          atmosphere
          framingPadding={0.06}
          className="absolute inset-0"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(5,8,18,0.18)_52%,#050812_94%)]" />

        {CALLOUTS.map((c) => (
          <div
            key={c.label}
            className={cn(
              'absolute z-10 max-w-[220px] rounded-xl border border-white/[0.1] bg-black/65 px-3 py-2 backdrop-blur-md',
              c.className,
            )}
          >
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {c.label}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
