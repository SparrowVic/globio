import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowUpRight,
  faCircleSmall,
  faGlobePointer,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { StarfieldConfig } from '@your-globe/core';

import { Aurora, Magnet } from '@/components/reactbits';
import { DecorationGlobe } from '@/components/shared';
import { UseCaseChips } from './atoms';

const ctaStarfield: StarfieldConfig = {
  enabled: true,
  density: 900,
  size: 1,
  sizeVariety: 0.7,
  palette: ['#ffffff', '#ffe9c4', '#f472b6', '#67e8f9'],
  twinkle: { enabled: true, intensity: 0.5, speed: 0.38 },
};

const footerLinks: ReadonlyArray<{
  readonly label: string;
  readonly href: string;
  readonly internal?: boolean;
}> = [
  { label: 'Studio', href: '/studio', internal: true },
  { label: 'Kinds', href: '#kinds' },
  { label: 'Layers', href: '#architecture' },
  { label: 'Data', href: '#data' },
  { label: 'API', href: '#api' },
  { label: 'GitHub', href: 'https://github.com' },
];

export function FinalCta() {
  return (
    <footer className="relative overflow-hidden pt-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 -z-30 bg-[#02030a]" />
      <div className="absolute inset-0 -z-20 opacity-40">
        <Aurora colorStops={['#fbbf24', '#22d3ee', '#f472b6']} amplitude={0.35} blend={0.24} speed={0.18} />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="relative min-h-[640px] overflow-hidden rounded-[2.4rem] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_40px_140px_-70px_rgba(34,211,238,0.95)] backdrop-blur-xl sm:p-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_38%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_24%_78%,rgba(251,191,36,0.14),transparent_28%)]" />
          <div className="absolute right-0 top-0 h-full w-full opacity-30 sm:opacity-45 lg:w-[62%] lg:opacity-65">
            <DecorationGlobe
              kind="hologram"
              theme="hologram-cyan"
              speed={0.022}
              initialLat={10}
              initialLng={-34}
              starfield={ctaStarfield}
              atmosphere
              framingPadding={0.06}
              className="absolute inset-0 m-auto size-[min(90vmin,840px)]"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_46%,transparent_0%,rgba(2,3,10,0.05)_42%,#02030a_92%)]" />
          </div>

          <div className="relative z-10 flex min-h-[560px] max-w-2xl flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.055] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-200">
              <FontAwesomeIcon icon={faSparkles} className="size-3" />
              production-ready visual engine
            </div>
            <h2 className="text-balance text-[clamp(3.5rem,6vw,6rem)] font-semibold leading-[0.92] tracking-tight text-white">
              Now ship a globe.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Pick a kind, tune the layers, hand the typed config off to your app. The same engine ships from preview to production.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Magnet padding={56} magnetStrength={3.2}>
                <Link
                  to="/studio"
                  className="group inline-flex h-[58px] items-center justify-center gap-3 overflow-hidden rounded-full bg-amber-200 px-7 text-sm font-semibold text-slate-950 shadow-[0_22px_70px_-22px_rgba(251,191,36,0.95)] transition-all hover:-translate-y-0.5"
                >
                  <FontAwesomeIcon icon={faGlobePointer} className="size-4" />
                  Open Studio
                  <FontAwesomeIcon
                    icon={faArrowUpRight}
                    className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </Magnet>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[58px] items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/[0.18] hover:bg-white/[0.07]"
              >
                <FontAwesomeIcon icon={faGithub} className="size-4" />
                Source
              </a>
            </div>

            <UseCaseChips variant="expanded" className="mt-10 max-w-xl" />
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-white/[0.08] py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="inline-flex items-center gap-3 text-white">
            <span className="flex size-8 items-center justify-center rounded-full bg-amber-200 text-slate-950">
              <FontAwesomeIcon icon={faGlobePointer} className="size-3.5" />
            </span>
            <span className="font-semibold tracking-tight">Globio</span>
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link) =>
              link.internal ? (
                <Link key={link.label} to={link.href} className="transition-colors hover:text-white">
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.16em]">
            <FontAwesomeIcon icon={faCircleSmall} className="size-1.5 text-emerald-300" />
            live demo
          </div>
        </div>
      </div>
    </footer>
  );
}
