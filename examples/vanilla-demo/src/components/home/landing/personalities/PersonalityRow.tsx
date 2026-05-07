import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRight } from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeKind, StarfieldConfig, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { useInViewport } from '../hooks/use-in-viewport';
import { KIND_ACCENT, KIND_THEMES } from '../data/kind-themes';
import { ThemeSwatch } from '../atoms';
import { cn } from '@/lib/utils';

const ROW_STARFIELD: StarfieldConfig = {
  enabled: true,
  density: 600,
  size: 0.95,
  sizeVariety: 0.6,
  palette: ['#ffffff', '#ffe9c4'],
  twinkle: { enabled: true, intensity: 0.4, speed: 0.28 },
};

export interface PersonalityRowProps {
  readonly kind: GlobeKind;
  readonly index: string;
  readonly tagline: string;
  readonly description: string;
  readonly mirror: boolean;
}

export function PersonalityRow({
  kind,
  index,
  tagline,
  description,
  mirror,
}: PersonalityRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  // Threshold of 0.05 — start mounting the globe as soon as a sliver
  // enters the viewport so it's already running when the user scrolls
  // into the row, not after a lag.
  const inView = useInViewport(rowRef, { threshold: 0.05 });
  const accent = KIND_ACCENT[kind];
  const themes = KIND_THEMES[kind];
  const [activeTheme, setActiveTheme] = useState<ThemePresetName>(themes[0].preset);
  const initialLng = kind === 'paper' ? -30 : -44;

  return (
    <div
      ref={rowRef}
      className={cn(
        'relative grid items-center gap-10 overflow-hidden rounded-[2.4rem] border border-white/[0.08] p-10',
        mirror ? 'lg:grid-cols-[1fr_minmax(420px,560px)]' : 'lg:grid-cols-[minmax(420px,560px)_1fr]',
      )}
      style={{
        background: `linear-gradient(135deg, ${accent}10 0%, transparent 70%), #050812`,
      }}
    >
      <div
        className={cn(
          'relative aspect-square w-full max-w-[560px]',
          mirror && 'lg:order-2',
        )}
      >
        <div
          className="absolute left-1/2 top-1/2 size-[88%] -translate-x-1/2 -translate-y-1/2"
          style={{
            WebkitMaskImage:
              'radial-gradient(circle closest-side at center, #000 0%, #000 70%, transparent 100%)',
            maskImage:
              'radial-gradient(circle closest-side at center, #000 0%, #000 70%, transparent 100%)',
          }}
        >
          {inView && (
            <DecorationGlobe
              key={`${kind}-${activeTheme}`}
              kind={kind}
              theme={activeTheme}
              speed={0.018}
              initialLat={12}
              initialLng={initialLng}
              starfield={ROW_STARFIELD}
              atmosphere
              framingPadding={0.05}
              className="absolute inset-0"
            />
          )}
        </div>
        {/* Soft kind-tinted vignette around the globe */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 60%, ${accent}26 90%)`,
          }}
        />
      </div>

      <div className={cn(mirror && 'lg:order-1')}>
        <div className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          <span style={{ color: accent }}>{index}</span>
          <span className="h-px max-w-[60px] flex-1 bg-white/[0.1]" />
          <span>{kind}</span>
        </div>
        <h3 className="text-balance text-[clamp(2rem,3vw,2.6rem)] font-semibold leading-[1.05] text-white">
          {tagline}
        </h3>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">{description}</p>

        {themes.length > 1 && (
          <div className="mt-6 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">themes</span>
            <div className="flex gap-2">
              {themes.map((t) => (
                <ThemeSwatch
                  key={t.preset}
                  color={t.swatch}
                  label={t.label}
                  active={activeTheme === t.preset}
                  size="sm"
                  onClick={() => setActiveTheme(t.preset)}
                />
              ))}
            </div>
          </div>
        )}

        <Link
          to={`/studio?kind=${kind}&theme=${activeTheme}`}
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: accent }}
        >
          Open in Studio
          <FontAwesomeIcon icon={faArrowUpRight} className="size-3" />
        </Link>
      </div>
    </div>
  );
}
