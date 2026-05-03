import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGithub,
  faReact,
  faVuejs,
  faAngular,
  faJs,
} from '@fortawesome/free-brands-svg-icons';
import {
  faArrowDown,
  faArrowUpRight,
  faBolt,
  faCubes,
  faGlobePointer,
  faPalette,
  faShieldCheck,
  faSparkles,
  faTreeDeciduous,
  faWandMagicSparkles,
  faCircleDashed,
  faGrid2,
  faGrid,
  faScrollOld,
  faRadar,
  faCircleSmall,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { HeroGlobe } from '@/components/home/HeroGlobe';
import { Nav } from '@/components/home/Nav';
import Aurora from '@/components/Aurora';
import ClickSpark from '@/components/ClickSpark';
import CountUp from '@/components/CountUp';
import DotGrid from '@/components/DotGrid';
import FadeContent from '@/components/FadeContent';
import GradientText from '@/components/GradientText';
import Magnet from '@/components/Magnet';
import ScrollVelocity from '@/components/ScrollVelocity';
import ShinyText from '@/components/ShinyText';
import SplitText from '@/components/SplitText';
import { cn } from '@/lib/utils';

export default function Home() {
  // Smooth scroll for in-page anchors. Native CSS handles most cases but
  // some browsers ignore it on programmatic clicks — explicit handler
  // covers both.
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <ClickSpark
      sparkColor="#ffd57a"
      sparkSize={9}
      sparkRadius={20}
      sparkCount={10}
      duration={520}
    >
      <div className="relative min-h-screen overflow-x-clip bg-[#03050d] text-slate-100">
        <ScrollProgress />
        <NoiseOverlay />
        <Nav />

        <Hero />

        <StatsRow />

        <KindsShowcase />

        <CodePreview />

        <FrameworksMarquee />

        <FeaturesGrid />

        <CtaSection />

        <Footer />
      </div>
    </ClickSpark>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero() {
  return (
    <section className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden">
      {/* Layer 0 — animated aurora gradient way back */}
      <div className="absolute inset-0 -z-30 opacity-[0.55]">
        <Aurora
          colorStops={['#3a1c71', '#d76d77', '#ffaf7b']}
          amplitude={0.9}
          blend={0.6}
          speed={0.4}
        />
      </div>
      {/* Layer 1 — radial darkening so center pops */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,rgba(3,5,13,0)_0%,#03050d_72%)]" />
      {/* Layer 2 — actual decoration globe, full bleed behind text */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <HeroGlobe className="size-[min(95vmin,1100px)]" kind="dotted" theme="dotted-dark" />
      </div>
      {/* Layer 3 — subtle vignette + grid noise overlay */}
      <div className="pointer-events-none absolute inset-0 -z-[5] [background:radial-gradient(circle_at_50%_30%,transparent_0%,#03050d_85%)]" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-32 pb-20 text-center">
        {/* Eyebrow */}
        <FadeContent duration={700} delay={120}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 backdrop-blur-md">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            <span>v0.1 · early access · five visual kinds shipping</span>
          </div>
        </FadeContent>

        {/* Headline — dual-line, second line gradient */}
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.25rem]">
          <SplitText
            text="Build memorable"
            tag="span"
            delay={40}
            duration={0.7}
            from={{ opacity: 0, y: 28 }}
            to={{ opacity: 1, y: 0 }}
            ease="power3.out"
            className="block"
          />
          <span className="block">
            <GradientText
              colors={['#ffe9c4', '#ffd57a', '#fbbf24', '#ffd57a', '#ffe9c4']}
              animationSpeed={6}
              className="bg-clip-text text-transparent"
            >
              globes.
            </GradientText>
          </span>
        </h1>

        {/* Sub */}
        <FadeContent duration={700} delay={500}>
          <p className="mt-7 max-w-2xl text-balance text-base leading-relaxed text-slate-300 sm:text-lg">
            A modern 3D globe library for the web. Five visual kinds, deep theme tokens,
            framework-agnostic. Drop one in as a hero showcase, an interactive map,
            or a tiny animated icon — same engine, right size for the job.
          </p>
        </FadeContent>

        {/* CTAs */}
        <FadeContent duration={700} delay={700}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Magnet padding={48} magnetStrength={3.5}>
              <Link
                to="/studio"
                className={cn(
                  'group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold tracking-tight',
                  'bg-amber-200 text-slate-950',
                  'shadow-[0_10px_40px_-12px_rgba(255,200,90,0.65)] transition-all',
                  'hover:shadow-[0_18px_56px_-12px_rgba(255,200,90,0.85)]',
                )}
              >
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-amber-300 via-orange-200 to-amber-300 opacity-0 transition-opacity group-hover:opacity-100" />
                <FontAwesomeIcon icon={faGlobePointer} className="size-4" />
                <span>Open Studio</span>
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
              className={cn(
                'group inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-slate-200 backdrop-blur-md',
                'transition-all hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.06]',
              )}
            >
              <FontAwesomeIcon icon={faGithub} className="size-4" />
              <span>View on GitHub</span>
              <span className="ml-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300">
                ★ 0
              </span>
            </a>
          </div>
        </FadeContent>

        {/* Scroll cue */}
        <FadeContent duration={900} delay={1100}>
          <a
            href="#stats"
            className="mt-20 inline-flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-slate-300"
          >
            <span>Scroll</span>
            <span className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.02]">
              <FontAwesomeIcon
                icon={faArrowDown}
                className="size-3 animate-[bounce_1.6s_ease-in-out_infinite]"
              />
            </span>
          </a>
        </FadeContent>
      </div>
    </section>
  );
}

/* ───────────────────────── STATS ───────────────────────── */

const stats: ReadonlyArray<{
  readonly value: number;
  readonly suffix?: string;
  readonly prefix?: string;
  readonly label: string;
  readonly hint: string;
}> = [
  { value: 5, label: 'Visual kinds', hint: 'outline · dotted · wireframe · paper · hologram' },
  { value: 200, suffix: '+', label: 'Countries', hint: 'with multi-resolution borders' },
  { value: 4, label: 'Framework wraps', hint: 'vanilla · react · vue · angular' },
  { value: 40, suffix: 'KB', prefix: '<', label: 'Icon mode', hint: 'gzipped, tree-shakeable' },
];

function StatsRow() {
  return (
    <section id="stats" className="relative border-y border-white/[0.06] bg-white/[0.015] py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {stats.map((stat, idx) => (
          <FadeContent key={stat.label} duration={700} delay={idx * 90}>
            <div className="flex flex-col items-start gap-2 border-l border-amber-200/20 pl-5">
              <div className="font-mono text-4xl font-medium tracking-tight text-white sm:text-5xl">
                {stat.prefix && <span className="text-slate-500">{stat.prefix}</span>}
                <CountUp
                  to={stat.value}
                  duration={2.4}
                  delay={0.3 + idx * 0.08}
                  separator=","
                />
                {stat.suffix && <span className="text-amber-200">{stat.suffix}</span>}
              </div>
              <div className="text-sm font-medium text-slate-200">{stat.label}</div>
              <div className="text-xs text-slate-500">{stat.hint}</div>
            </div>
          </FadeContent>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── KINDS SHOWCASE ───────────────────────── */

const kinds = [
  {
    id: 'outline',
    name: 'Outline',
    tagline: 'Crisp country borders. Tron-style focus pulse. Editorial.',
    icon: faCircleDashed,
    accent: '#fbbf24',
    theme: 'outline-dark' as const,
  },
  {
    id: 'dotted',
    name: 'Dotted',
    tagline: 'Stippled relief. Reads as data without being one. Playful.',
    icon: faGrid,
    accent: '#67e8f9',
    theme: 'dotted-dark' as const,
  },
  {
    id: 'wireframe',
    name: 'Wireframe',
    tagline: 'Pure topology. Cyberpunk grid. The skeleton is the design.',
    icon: faGrid2,
    accent: '#a78bfa',
    theme: 'wireframe-tron' as const,
  },
  {
    id: 'paper',
    name: 'Paper',
    tagline: 'Cream stock. Warm ink. Cartographic. Smells like an atlas.',
    icon: faScrollOld,
    accent: '#fbbf24',
    theme: 'paper-default' as const,
  },
  {
    id: 'hologram',
    name: 'Hologram',
    tagline: 'Cyan rim Fresnel. Mission-control sci-fi. Always-on radar.',
    icon: faRadar,
    accent: '#22d3ee',
    theme: 'hologram-cyan' as const,
  },
] as const;

function KindsShowcase() {
  return (
    <section id="kinds" className="relative py-32">
      {/* Background dot grid — subtle, faded toward center */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <DotGrid
          dotSize={1.6}
          gap={28}
          baseColor="#1e293b"
          activeColor="#fbbf24"
          proximity={120}
          shockRadius={180}
          shockStrength={4}
          resistance={750}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Five flavors"
          title="One engine, five visual kinds."
          sub="Switch between them with a single config flag. Themes layer on top — bring your own palette or pick from the built-ins."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {kinds.map((kind, idx) => (
            <FadeContent key={kind.id} duration={700} delay={idx * 80}>
              <Link
                to={`/studio?kind=${kind.id}`}
                className={cn(
                  'group relative flex h-full min-h-[260px] flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md',
                  'transition-all duration-300',
                  'hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.04]',
                )}
                style={{
                  boxShadow: `0 0 0 0 ${kind.accent}00`,
                }}
              >
                {/* Hover spotlight */}
                <div
                  className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(400px circle at 50% 0%, ${kind.accent}22, transparent 60%)`,
                  }}
                />

                <div className="flex items-center justify-between">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-transform duration-300 group-hover:scale-110"
                    style={{ boxShadow: `0 0 24px -8px ${kind.accent}66` }}
                  >
                    <FontAwesomeIcon
                      icon={kind.icon}
                      className="size-4"
                      style={{ color: kind.accent }}
                    />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-white">
                    {kind.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {kind.tagline}
                  </p>
                </div>

                <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-slate-300 transition-colors group-hover:text-white">
                  <span>Open in Studio</span>
                  <FontAwesomeIcon
                    icon={faArrowUpRight}
                    className="size-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </Link>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CODE PREVIEW ───────────────────────── */

function CodePreview() {
  return (
    <section id="code" className="relative py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="Drop-in API"
            title="Three lines to a globe."
            sub="The full `createGlobe()` API has 30+ knobs — but you only touch the ones you need. Sensible defaults do the rest."
            align="left"
          />
          <ul className="mt-8 space-y-4 text-sm text-slate-300">
            {[
              {
                icon: faShieldCheck,
                label: 'TypeScript-first',
                desc: 'Full inference on every config field. No "any" gotchas.',
              },
              {
                icon: faTreeDeciduous,
                label: 'Tree-shakeable',
                desc: "Import only the kinds and modes you use. Don't pay for hexbin if you don't render hexbin.",
              },
              {
                icon: faPalette,
                label: 'Token-driven theming',
                desc: 'Every colour, size, and animation timing lives in a flat token map. Swap presets or define your own.',
              },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-amber-200/20 bg-amber-200/[0.05]">
                  <FontAwesomeIcon icon={item.icon} className="size-3 text-amber-200" />
                </span>
                <div>
                  <div className="font-medium text-white">{item.label}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {item.desc}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <FadeContent duration={800}>
          <div className="relative">
            {/* Glow halo behind block */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-amber-300/20 via-amber-200/5 to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0d18] shadow-2xl shadow-black/40">
              {/* Title bar */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-yellow-500/70" />
                  <span className="size-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="font-mono text-[10px] text-slate-500">globe.ts</span>
                <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                  TypeScript
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed">
                <code className="block">
                  <span className="text-pink-400">import</span>
                  <span className="text-slate-200"> {'{ createGlobe }'} </span>
                  <span className="text-pink-400">from</span>
                  <span className="text-emerald-300"> {`'@your-globe/core'`}</span>
                  <span className="text-slate-500">;</span>
                  {'\n\n'}
                  <span className="text-pink-400">const</span>
                  <span className="text-slate-200"> globe </span>
                  <span className="text-slate-500">=</span>
                  <span className="text-amber-200"> createGlobe</span>
                  <span className="text-slate-300">{'({'}</span>
                  {'\n'}
                  <span className="pl-4 text-sky-300">  container</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-amber-200">document</span>
                  <span className="text-slate-300">.</span>
                  <span className="text-amber-200">getElementById</span>
                  <span className="text-slate-300">(</span>
                  <span className="text-emerald-300">{`'globe'`}</span>
                  <span className="text-slate-300">)</span>
                  <span className="text-slate-500">!,</span>
                  {'\n'}
                  <span className="pl-4 text-sky-300">  kind</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-emerald-300">{`'dotted'`}</span>
                  <span className="text-slate-500">,</span>
                  {'\n'}
                  <span className="pl-4 text-sky-300">  theme</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-emerald-300">{`'dotted-dark'`}</span>
                  <span className="text-slate-500">,</span>
                  {'\n'}
                  <span className="pl-4 text-sky-300">  autoRotate</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-slate-300">{'{ '}</span>
                  <span className="text-sky-300">enabled</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-orange-300">true</span>
                  <span className="text-slate-300">{' }'}</span>
                  <span className="text-slate-500">,</span>
                  {'\n'}
                  <span className="text-slate-300">{'});'}</span>
                  {'\n\n'}
                  <span className="text-amber-200">globe</span>
                  <span className="text-slate-300">.</span>
                  <span className="text-amber-200">mount</span>
                  <span className="text-slate-300">();</span>
                  {'\n'}
                  <span className="text-slate-600">{`// → 1 line on screen, 60fps, fully themed.`}</span>
                </code>
              </pre>
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}

/* ───────────────────────── FRAMEWORKS MARQUEE ───────────────────────── */

function FrameworksMarquee() {
  const frameworks: ReadonlyArray<{ readonly name: string; readonly icon: typeof faReact }> = [
    { name: 'React', icon: faReact },
    { name: 'Vue', icon: faVuejs },
    { name: 'Angular', icon: faAngular },
    { name: 'Vanilla TS', icon: faJs },
  ];
  // Repeat enough times to fill the marquee viewport without obvious gaps.
  const items = [...frameworks, ...frameworks, ...frameworks, ...frameworks];

  return (
    <section className="relative border-y border-white/[0.06] bg-white/[0.01] py-12">
      <div className="mx-auto max-w-7xl">
        <div className="px-6 pb-6 text-center">
          <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
            <ShinyText text="Same engine, every framework" speed={5} />
          </span>
        </div>
        <ScrollVelocity
          texts={[
            items.map((f) => f.name).join('  ·  '),
            items.map((f) => f.name).reverse().join('  ·  '),
          ]}
          velocity={36}
          numCopies={4}
          className="text-3xl font-semibold tracking-tight text-white/30 sm:text-5xl"
        />
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURES GRID ───────────────────────── */

function FeaturesGrid() {
  const features = [
    {
      icon: faBolt,
      title: 'Adaptive performance',
      desc: 'Runtime auto-tunes pixel ratio and quality based on framerate. Hits 60fps on a Pixelbook.',
      gradient: 'from-amber-300/20 to-amber-200/5',
    },
    {
      icon: faSparkles,
      title: 'Animations baked in',
      desc: 'Hover glow, focus pulse, starfield twinkle, label fade — all configurable, all animated.',
      gradient: 'from-violet-400/20 to-violet-300/5',
    },
    {
      icon: faPalette,
      title: 'Token-driven themes',
      desc: '80+ design tokens. Edit any value live, save as preset, export as JSON.',
      gradient: 'from-rose-400/20 to-rose-300/5',
    },
    {
      icon: faShieldCheck,
      title: 'Type-safe',
      desc: 'Full TypeScript inference. exactOptionalPropertyTypes-clean. Refactor without fear.',
      gradient: 'from-emerald-400/20 to-emerald-300/5',
    },
    {
      icon: faTreeDeciduous,
      title: 'Tree-shakeable',
      desc: 'Each kind, each data layer, each mode is its own entry point. Pay only for what you ship.',
      gradient: 'from-sky-400/20 to-sky-300/5',
    },
    {
      icon: faCubes,
      title: 'Framework wraps',
      desc: 'First-class wrappers for React, Vue, Angular. Same shape across all of them.',
      gradient: 'from-cyan-400/20 to-cyan-300/5',
    },
    {
      icon: faWandMagicSparkles,
      title: 'Five render kinds',
      desc: 'Outline, dotted, wireframe, paper, hologram. Drop-in swap, theme-driven defaults.',
      gradient: 'from-orange-300/20 to-orange-200/5',
    },
    {
      icon: faCircleSmall,
      title: 'Icon-class footprint',
      desc: 'Decoration mode strips interaction. Icon mode strips three.js. <40KB gzipped.',
      gradient: 'from-fuchsia-400/20 to-fuchsia-300/5',
    },
  ];

  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="What's inside"
          title="Engineered for the long haul."
          sub="Performance, types, theming, framework support — none of it bolted on. All of it considered from day one."
        />

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <FadeContent
              key={feature.title}
              duration={700}
              delay={(idx % 4) * 80}
            >
              <div
                className={cn(
                  'group relative h-full overflow-hidden bg-[#03050d] p-6 transition-colors',
                  'hover:bg-[#06091a]',
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute -top-8 -right-8 size-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500',
                    feature.gradient,
                    'group-hover:opacity-100',
                  )}
                />
                <FontAwesomeIcon
                  icon={feature.icon}
                  className="mb-5 size-5 text-amber-200"
                />
                <h3 className="text-base font-semibold tracking-tight text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {feature.desc}
                </p>
              </div>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CTA SECTION ───────────────────────── */

function CtaSection() {
  return (
    <section className="relative overflow-hidden py-32">
      {/* CTA decoration globe — different kind so it doesn't twin the hero */}
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[60%] opacity-60 lg:block">
        <HeroGlobe
          kind="outline"
          theme="outline-dark"
          speed={0.025}
          stars={false}
          atmosphere
          className="size-[min(80vmin,900px)] translate-x-[20%]"
        />
      </div>
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_70%_50%,rgba(255,200,90,0.08)_0%,transparent_55%)]" />

      <div className="mx-auto max-w-3xl px-6">
        <FadeContent duration={800}>
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Stop screenshotting <span className="text-amber-200/80">other people's</span> globes.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Open Studio, pick a kind, tune a theme, hit export. Your globe lands in
            production with a single config object. No GPU PhD required.
          </p>
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Magnet padding={48} magnetStrength={3}>
              <Link
                to="/studio"
                className={cn(
                  'group inline-flex items-center gap-2.5 rounded-xl bg-amber-200 px-6 py-3.5 text-sm font-semibold text-slate-950',
                  'shadow-[0_10px_40px_-12px_rgba(255,200,90,0.65)] transition-all',
                  'hover:shadow-[0_18px_56px_-12px_rgba(255,200,90,0.85)]',
                )}
              >
                <FontAwesomeIcon icon={faGlobePointer} className="size-4" />
                <span>Open Studio</span>
                <FontAwesomeIcon
                  icon={faArrowUpRight}
                  className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </Magnet>
            <span className="text-xs text-slate-500">
              No signup · State persists in your browser · Export as JSON
            </span>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-white/[0.01] py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            <FontAwesomeIcon icon={faGlobePointer} className="size-3 text-amber-200" />
          </span>
          <span className="text-sm font-medium text-white">Globio</span>
          <span className="text-xs text-slate-500">v0.1 · MIT</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <Link to="/studio" className="hover:text-slate-300">
            Studio
          </Link>
          <a href="#features" className="hover:text-slate-300">
            Features
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-300">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────── SCROLL PROGRESS ───────────────────────── */

/**
 * Page-progress bar pinned to the top of the viewport. Refreshes its
 * width on scroll, thickens slightly when the user is *actively*
 * scrolling — adds a "you're moving" feedback layer that sticky nav
 * alone doesn't provide.
 */
function ScrollProgress() {
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

/* ───────────────────────── NOISE OVERLAY ───────────────────────── */

/**
 * Inline-SVG turbulence overlay. Hard to notice on its own — that's
 * the point. Breaks up flat colour fields just enough that the page
 * doesn't read as "another dark Tailwind site". Pinned with mix-blend-
 * overlay so it tints rather than dimming.
 */
function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

/* ───────────────────────── SHARED HEADER ───────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  sub,
  align = 'center',
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly sub: string;
  readonly align?: 'left' | 'center';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
      )}
    >
      <span
        className={cn(
          'inline-block text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/70',
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          'max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl',
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          'max-w-xl text-balance text-sm leading-relaxed text-slate-400 sm:text-base',
        )}
      >
        {sub}
      </p>
    </div>
  );
}
