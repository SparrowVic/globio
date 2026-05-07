import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRight,
  faBracketsCurly,
  faCube,
  faGaugeHigh,
  faGlobePointer,
  faPlay,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const PROOF: ReadonlyArray<readonly [IconDefinition, string]> = [
  [faBracketsCurly, 'TypeScript first'],
  [faCube, 'Tree-shakeable'],
  [faGaugeHigh, '60 FPS engine'],
];

export function HeroLeftRail() {
  return (
    <div className="relative z-20 flex flex-col justify-center pt-14 max-[1500px]:pt-10">
      <div className="mb-8 inline-flex w-fit overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.045] p-1 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/15 px-3 py-1.5 font-semibold uppercase tracking-[0.18em] text-emerald-300">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
          </span>
          Live
        </span>
        <span className="px-3 py-1.5">Five visual personalities</span>
      </div>

      <h1 className="max-w-[540px] text-balance text-[clamp(3.6rem,5vw,5.6rem)] font-semibold leading-[0.94] tracking-tight text-white">
        Five globes.{' '}
        <span
          style={{
            color: 'var(--hero-accent)',
            textShadow: '0 0 30px var(--hero-accent)',
            transition: 'color 280ms cubic-bezier(0.4, 0, 0.2, 1), text-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          One engine.
        </span>{' '}
        Zero ceiling.
      </h1>
      <p className="mt-7 max-w-[440px] text-base leading-relaxed text-slate-300 sm:text-lg">
        A modern WebGL globe library with five visual personalities, nine canonical layers, and a typed runtime that ships in production.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          to="/studio"
          className="group inline-flex h-[54px] items-center gap-3 overflow-hidden rounded-full px-6 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
          style={{
            background: 'var(--hero-accent)',
            boxShadow: '0 22px 70px -22px var(--hero-accent)',
            transition:
              'background 280ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1), transform 220ms ease',
          }}
        >
          <FontAwesomeIcon icon={faGlobePointer} className="size-4" />
          Open Studio
          <FontAwesomeIcon
            icon={faArrowUpRight}
            className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
        <a
          href="#kinds"
          className="inline-flex h-[54px] items-center gap-3 rounded-full border border-white/[0.13] bg-white/[0.035] px-6 text-sm font-semibold text-slate-200 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.065]"
        >
          <FontAwesomeIcon icon={faPlay} className="size-3.5 text-cyan-200" />
          Explore kinds
        </a>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-400">
        {PROOF.map(([icon, label]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={icon} className="size-3.5 text-slate-200" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
