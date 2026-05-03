import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  faCircleSmall,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { Nav } from '@/components/home/Nav';
import {
  DottedPreview,
  HologramPreview,
  OutlinePreview,
  PaperPreview,
  WireframePreview,
} from '@/components/home/KindPreviews';
import {
  DecorationGlobe,
  InteractiveCard,
  Kbd,
  NoiseOverlay,
  ScrollProgress,
  SectionHeader,
} from '@/components/shared';
import {
  Aurora,
  BlurText,
  ClickSpark,
  CountUp,
  DotGrid,
  FadeContent,
  GradientText,
  Magnet,
  ScrollVelocity,
  SpotlightCard,
  StarBorder,
} from '@/components/reactbits';
import { cn } from '@/lib/utils';

export default function Home() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <ClickSpark sparkColor="#ffd57a" sparkSize={9} sparkRadius={20} sparkCount={10} duration={520}>
      <div className="relative min-h-screen overflow-x-clip bg-[#03050d] text-slate-100 antialiased">
        <ScrollProgress />
        <NoiseOverlay />
        <Nav />

        <Hero />

        <KindsShowcase />

        <CodeSection />

        <StatsRow />

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
      {/* Layer 0 — animated aurora gradient */}
      <div className="absolute inset-0 -z-30 opacity-[0.55]">
        <Aurora colorStops={['#3a1c71', '#d76d77', '#ffaf7b']} amplitude={0.9} blend={0.6} speed={0.4} />
      </div>
      {/* Layer 1 — radial darken so the centre commands focus */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,rgba(3,5,13,0)_0%,#03050d_70%)]" />
      {/* Layer 2 — decoration globe (real renderer, no interaction) */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <DecorationGlobe className="size-[min(95vmin,1100px)]" kind="dotted" theme="dotted-dark" />
      </div>
      {/* Layer 3 — vignette to keep edges clean */}
      <div className="pointer-events-none absolute inset-0 -z-[5] [background:radial-gradient(circle_at_50%_30%,transparent_0%,#03050d_85%)]" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-32 pb-20 text-center">
        {/* Eyebrow with live status pulse */}
        <FadeContent duration={700} delay={120}>
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1.5 pr-3 text-[11px] text-slate-300 backdrop-blur-md">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              live
            </span>
            <span>v0.1 · five visual kinds shipping</span>
          </div>
        </FadeContent>

        {/* Headline — split letter-reveal + gradient accent on second line */}
        <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          <BlurText text="Build memorable" delay={60} animateBy="words" direction="top" className="block" />
          <span className="block leading-[1.05]">
            <GradientText
              colors={['#ffe9c4', '#ffd57a', '#fbbf24', '#ffd57a', '#ffe9c4']}
              animationSpeed={6}
              className="bg-clip-text text-transparent"
            >
              globes.
            </GradientText>
          </span>
        </h1>

        {/* Subhead */}
        <FadeContent duration={700} delay={500}>
          <p className="mt-7 max-w-xl text-balance text-base leading-relaxed text-slate-300 sm:text-lg">
            A modern 3D globe library for the web.{' '}
            <span className="text-white">Five visual kinds</span>, deep theme tokens,
            framework-agnostic. Drop one in as a hero showcase, an interactive map, or a tiny
            animated icon — same engine, right size for the job.
          </p>
        </FadeContent>

        {/* CTAs — primary StarBorder, secondary glass + kbd */}
        <FadeContent duration={700} delay={720}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Magnet padding={56} magnetStrength={3.5}>
              <Link
                to="/studio"
                className={cn(
                  'group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight',
                  'bg-amber-200 text-slate-950 shadow-[0_12px_44px_-14px_rgba(255,200,90,0.7)]',
                  'transition-shadow duration-300 hover:shadow-[0_18px_56px_-12px_rgba(255,200,90,0.9)]',
                )}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/45 opacity-0 transition-all duration-700 group-hover:translate-x-[300%] group-hover:opacity-100"
                />
                <FontAwesomeIcon icon={faGlobePointer} className="relative z-10 size-4" />
                <span className="relative z-10">Open Studio</span>
                <FontAwesomeIcon
                  icon={faArrowUpRight}
                  className="relative z-10 size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </Magnet>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[13px] font-medium text-slate-200 backdrop-blur-md',
                'transition-all duration-300 hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.06]',
              )}
            >
              <FontAwesomeIcon icon={faGithub} className="size-4" />
              <span>View on GitHub</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-slate-400">
                ★ 0
              </span>
            </a>

            <span className="ml-1 hidden items-center gap-1 text-[11px] text-slate-500 md:inline-flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              <span>to search</span>
            </span>
          </div>
        </FadeContent>

        {/* Tag chips below CTA — subtle reinforcement */}
        <FadeContent duration={700} delay={900}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {['Vanilla TS', 'React', 'Vue', 'Angular'].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1 rounded-full bg-amber-200/40" />
                {label}
              </span>
            ))}
          </div>
        </FadeContent>

        {/* Scroll cue */}
        <FadeContent duration={900} delay={1100}>
          <a
            href="#kinds"
            className="mt-16 inline-flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-slate-300"
          >
            <span>Scroll</span>
            <span className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.02]">
              <FontAwesomeIcon icon={faArrowDown} className="size-3 animate-[bounce_1.6s_ease-in-out_infinite]" />
            </span>
          </a>
        </FadeContent>
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
    accent: '#fbbf24',
    preview: <OutlinePreview />,
    featured: true,
  },
  {
    id: 'dotted',
    name: 'Dotted',
    tagline: 'Stippled relief. Reads as data without being one. Playful.',
    accent: '#67e8f9',
    preview: <DottedPreview />,
  },
  {
    id: 'wireframe',
    name: 'Wireframe',
    tagline: 'Pure topology. Cyberpunk grid. The skeleton is the design.',
    accent: '#a78bfa',
    preview: <WireframePreview />,
  },
  {
    id: 'paper',
    name: 'Paper',
    tagline: 'Cream stock. Warm ink. Cartographic. Smells like an atlas.',
    accent: '#fbbf24',
    preview: <PaperPreview />,
  },
  {
    id: 'hologram',
    name: 'Hologram',
    tagline: 'Cyan rim Fresnel. Mission-control sci-fi. Always-on radar.',
    accent: '#22d3ee',
    preview: <HologramPreview />,
  },
] as const;

function KindsShowcase() {
  return (
    <section id="kinds" className="relative py-32">
      {/* Faint dotgrid bg with cursor reactivity */}
      <div className="absolute inset-0 -z-10 opacity-[0.35]">
        <DotGrid
          dotSize={1.4}
          gap={26}
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

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {kinds.map((kind, idx) => (
            <FadeContent
              key={kind.id}
              duration={700}
              delay={idx * 70}
              className={'featured' in kind && kind.featured ? 'lg:col-span-2' : undefined}
            >
              <InteractiveCard
                to={`/studio?kind=${kind.id}`}
                title={kind.name}
                tagline={kind.tagline}
                accent={kind.accent}
                preview={kind.preview}
                footerText="Open in Studio"
                leadingBadge={
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-slate-400">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                }
                trailingBadge={
                  <span
                    className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{
                      borderColor: `${kind.accent}33`,
                      color: `${kind.accent}cc`,
                    }}
                  >
                    kind
                  </span>
                }
                {...('featured' in kind && kind.featured ? { featured: true } : {})}
              />
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CODE SECTION ───────────────────────── */

const codeVariants: ReadonlyArray<{
  readonly id: 'vanilla' | 'react' | 'vue';
  readonly label: string;
  readonly icon: typeof faJs;
  readonly lines: ReadonlyArray<ReactNode>;
}> = [
  {
    id: 'vanilla',
    label: 'Vanilla TS',
    icon: faJs,
    lines: [
      <Code k="kw">import</Code>,
      <Code k="punct">{' { createGlobe } '}</Code>,
      <Code k="kw">from</Code>,
      <Code k="str"> '@your-globe/core'</Code>,
      <Code k="punct">;</Code>,
      <br key="br1" />,
      <br key="br2" />,
      <Code k="kw">const</Code>,
      <Code> globe </Code>,
      <Code k="punct">=</Code>,
      <Code k="fn"> createGlobe</Code>,
      <Code k="punct">{'({'}</Code>,
      <br key="br3" />,
      <Code k="prop">{'  container'}</Code>,
      <Code k="punct">: </Code>,
      <Code k="ident">document</Code>,
      <Code k="punct">.</Code>,
      <Code k="fn">querySelector</Code>,
      <Code k="punct">(</Code>,
      <Code k="str">'#globe'</Code>,
      <Code k="punct">)!,</Code>,
      <br key="br4" />,
      <Code k="prop">  kind</Code>,
      <Code k="punct">: </Code>,
      <Code k="str">'dotted'</Code>,
      <Code k="punct">,</Code>,
      <br key="br5" />,
      <Code k="prop">  theme</Code>,
      <Code k="punct">: </Code>,
      <Code k="str">'dotted-dark'</Code>,
      <Code k="punct">,</Code>,
      <br key="br6" />,
      <Code k="prop">  autoRotate</Code>,
      <Code k="punct">: </Code>,
      <Code k="punct">{'{ '}</Code>,
      <Code k="prop">enabled</Code>,
      <Code k="punct">: </Code>,
      <Code k="bool">true</Code>,
      <Code k="punct">{' }'}</Code>,
      <Code k="punct">,</Code>,
      <br key="br7" />,
      <Code k="punct">{'});'}</Code>,
      <br key="br8" />,
      <br key="br9" />,
      <Code k="ident">globe</Code>,
      <Code k="punct">.</Code>,
      <Code k="fn">mount</Code>,
      <Code k="punct">();</Code>,
    ],
  },
  {
    id: 'react',
    label: 'React',
    icon: faReact,
    lines: [
      <Code k="kw">import</Code>,
      <Code> {'{ Globe } '}</Code>,
      <Code k="kw">from</Code>,
      <Code k="str"> '@your-globe/react'</Code>,
      <Code k="punct">;</Code>,
      <br key="br1" />,
      <br key="br2" />,
      <Code k="kw">export default function</Code>,
      <Code k="fn"> Hero</Code>,
      <Code k="punct">() {'{'}</Code>,
      <br key="br3" />,
      <Code>{'  '}</Code>,
      <Code k="kw">return</Code>,
      <Code k="punct"> (</Code>,
      <br key="br4" />,
      <Code k="punct">{'    <'}</Code>,
      <Code k="tag">Globe</Code>,
      <br key="br5" />,
      <Code>{'      '}</Code>,
      <Code k="prop">kind</Code>,
      <Code k="punct">=</Code>,
      <Code k="str">"dotted"</Code>,
      <br key="br6" />,
      <Code>{'      '}</Code>,
      <Code k="prop">theme</Code>,
      <Code k="punct">=</Code>,
      <Code k="str">"dotted-dark"</Code>,
      <br key="br7" />,
      <Code>{'      '}</Code>,
      <Code k="prop">autoRotate</Code>,
      <br key="br8" />,
      <Code k="punct">    /{'>'}</Code>,
      <br key="br9" />,
      <Code k="punct">  );</Code>,
      <br key="br10" />,
      <Code k="punct">{'}'}</Code>,
    ],
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: faVuejs,
    lines: [
      <Code k="punct">{'<'}</Code>,
      <Code k="tag">script setup</Code>,
      <Code k="punct">{'>'}</Code>,
      <br key="br1" />,
      <Code k="kw">import</Code>,
      <Code> {'{ Globe } '}</Code>,
      <Code k="kw">from</Code>,
      <Code k="str"> '@your-globe/vue'</Code>,
      <Code k="punct">;</Code>,
      <br key="br2" />,
      <Code k="punct">{'</'}</Code>,
      <Code k="tag">script</Code>,
      <Code k="punct">{'>'}</Code>,
      <br key="br3" />,
      <br key="br4" />,
      <Code k="punct">{'<'}</Code>,
      <Code k="tag">template</Code>,
      <Code k="punct">{'>'}</Code>,
      <br key="br5" />,
      <Code k="punct">{'  <'}</Code>,
      <Code k="tag">Globe</Code>,
      <br key="br6" />,
      <Code>{'    '}</Code>,
      <Code k="prop">kind</Code>,
      <Code k="punct">=</Code>,
      <Code k="str">"dotted"</Code>,
      <br key="br7" />,
      <Code>{'    '}</Code>,
      <Code k="prop">theme</Code>,
      <Code k="punct">=</Code>,
      <Code k="str">"dotted-dark"</Code>,
      <br key="br8" />,
      <Code>{'    '}</Code>,
      <Code k="prop">auto-rotate</Code>,
      <br key="br9" />,
      <Code k="punct">  /{'>'}</Code>,
      <br key="br10" />,
      <Code k="punct">{'</'}</Code>,
      <Code k="tag">template</Code>,
      <Code k="punct">{'>'}</Code>,
    ],
  },
];

function CodeSection() {
  const [tab, setTab] = useState<'vanilla' | 'react' | 'vue'>('vanilla');
  const active = codeVariants.find((v) => v.id === tab) ?? codeVariants[0]!;

  return (
    <section id="code" className="relative py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="Drop-in API"
            title="Three lines to a globe."
            sub="The full createGlobe() API has 30+ knobs — but you only touch the ones you need. Sensible defaults do the rest."
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
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <FadeContent duration={800}>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-amber-300/20 via-amber-200/5 to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0d18] shadow-2xl shadow-black/40">
              {/* Title bar with tab strip */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                <div className="flex items-center gap-1.5 pl-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-yellow-500/70" />
                  <span className="size-2.5 rounded-full bg-green-500/70" />
                </div>
                <div className="flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.02] p-0.5">
                  {codeVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setTab(variant.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors',
                        tab === variant.id
                          ? 'bg-amber-200/[0.12] text-amber-200'
                          : 'text-slate-500 hover:text-slate-200',
                      )}
                    >
                      <FontAwesomeIcon icon={variant.icon} className="size-2.5" />
                      {variant.label}
                    </button>
                  ))}
                </div>
                <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                  {active.id === 'vanilla' ? 'globe.ts' : active.id === 'react' ? 'Hero.tsx' : 'Hero.vue'}
                </span>
              </div>
              <pre
                key={active.id}
                className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed [animation:codeFadeIn_500ms_ease-out]"
              >
                <code className="block">{active.lines}</code>
              </pre>
            </div>
            <style>{`@keyframes codeFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          </div>
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
  readonly accent: string;
}> = [
  { value: 5, label: 'Visual kinds', hint: 'outline · dotted · wireframe · paper · hologram', accent: '#fbbf24' },
  { value: 200, suffix: '+', label: 'Countries', hint: 'with multi-resolution borders', accent: '#67e8f9' },
  { value: 4, label: 'Framework wraps', hint: 'vanilla · react · vue · angular', accent: '#a78bfa' },
  { value: 40, suffix: 'KB', prefix: '<', label: 'Icon mode', hint: 'gzipped, tree-shakeable', accent: '#22d3ee' },
];

function StatsRow() {
  return (
    <section id="stats" className="relative border-y border-white/[0.05] bg-white/[0.01] py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-6 md:grid-cols-4 md:gap-4">
        {stats.map((stat, idx) => (
          <FadeContent key={stat.label} duration={700} delay={idx * 90}>
            <SpotlightCard
              spotlightColor={`rgba(${hexToRgb(stat.accent)}, 0.18)` as `rgba(${number}, ${number}, ${number}, ${number})`}
              className="!rounded-2xl !border-white/[0.06] !bg-[#06080f]/85 !p-6 transition-all hover:!border-white/[0.14]"
            >
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-baseline gap-1 font-mono text-4xl font-medium tracking-tight text-white sm:text-5xl">
                  {stat.prefix && <span className="text-slate-500">{stat.prefix}</span>}
                  <CountUp to={stat.value} duration={2.4} delay={0.3 + idx * 0.08} separator="," />
                  {stat.suffix && <span style={{ color: stat.accent }}>{stat.suffix}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="block h-px w-6 transition-all duration-500"
                    style={{ background: stat.accent, opacity: 0.5 }}
                  />
                  <div className="text-sm font-medium text-slate-200">{stat.label}</div>
                </div>
                <div className="text-xs text-slate-500">{stat.hint}</div>
              </div>
            </SpotlightCard>
          </FadeContent>
        ))}
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
  const renderItems = (reverse = false) => {
    const list = reverse ? [...frameworks].reverse() : frameworks;
    return (
      <span className="inline-flex items-center gap-10">
        {list.map((f, i) => (
          <span key={`${f.name}-${i}`} className="inline-flex items-center gap-3">
            <FontAwesomeIcon icon={f.icon} className="size-7 opacity-60" />
            <span>{f.name}</span>
            <span aria-hidden="true" className="text-amber-200/40">·</span>
          </span>
        ))}
      </span>
    );
  };

  return (
    <section className="relative border-y border-white/[0.05] bg-gradient-to-b from-white/[0.01] to-transparent py-12">
      <div className="mx-auto max-w-7xl">
        <div className="px-6 pb-6 text-center">
          <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Same engine, every framework
          </span>
        </div>
        <ScrollVelocity
          texts={[renderItems(false), renderItems(true)]}
          velocity={36}
          numCopies={3}
          className="text-3xl font-semibold tracking-tight text-white/35 sm:text-4xl md:text-5xl"
        />
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURES GRID (BENTO) ───────────────────────── */

const features = [
  {
    icon: faBolt,
    title: 'Adaptive performance',
    desc: 'Runtime auto-tunes pixel ratio + quality based on framerate. Hits 60fps on a Pixelbook.',
    accent: '#fbbf24',
    span: 'lg:col-span-2',
    big: true,
  },
  {
    icon: faSparkles,
    title: 'Animations baked in',
    desc: 'Hover glow, focus pulse, starfield twinkle, label fade.',
    accent: '#a78bfa',
  },
  {
    icon: faPalette,
    title: 'Token themes',
    desc: '80+ design tokens. Live edit + JSON export.',
    accent: '#f472b6',
  },
  {
    icon: faShieldCheck,
    title: 'Type-safe',
    desc: 'Full TypeScript inference, refactor without fear.',
    accent: '#34d399',
  },
  {
    icon: faTreeDeciduous,
    title: 'Tree-shakeable',
    desc: 'Per-kind, per-mode, per-data-layer entry points.',
    accent: '#38bdf8',
    span: 'lg:col-span-2',
  },
  {
    icon: faCubes,
    title: 'Framework wraps',
    desc: 'React, Vue, Angular — same shape across all.',
    accent: '#22d3ee',
  },
  {
    icon: faWandMagicSparkles,
    title: 'Five render kinds',
    desc: 'Drop-in swap, theme-aware defaults.',
    accent: '#fb923c',
  },
  {
    icon: faCircleSmall,
    title: 'Icon-class footprint',
    desc: 'Decoration & icon modes ship lean. <40KB gzipped.',
    accent: '#e879f9',
  },
] as const;

function FeaturesGrid() {
  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="What's inside"
          title="Engineered for the long haul."
          sub="Performance, types, theming, framework support — none of it bolted on. All of it considered from day one."
        />

        <div className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, idx) => (
            <FadeContent
              key={f.title}
              duration={700}
              delay={(idx % 4) * 80}
              className={'span' in f ? f.span : undefined}
            >
              <FeatureCell {...f} />
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCell({
  icon,
  title,
  desc,
  accent,
  big,
}: {
  readonly icon: typeof faBolt;
  readonly title: string;
  readonly desc: string;
  readonly accent: string;
  readonly big?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [hover, setHover] = useState(false);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setCoords({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#06080f]/85 p-6',
        'transition-[border-color,transform] duration-500 hover:border-white/[0.16]',
        big && 'min-h-[220px]',
      )}
    >
      {/* Cursor spotlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(360px circle at ${coords.x}% ${coords.y}%, ${accent}1f, transparent 55%)`,
        }}
      />

      {/* Corner sparkle on big cells */}
      {big && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 size-12 rounded-full opacity-30 transition-opacity duration-700 group-hover:opacity-70"
          style={{
            background: `radial-gradient(circle, ${accent}66 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
        />
      )}

      <span
        className="relative mb-4 flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] transition-transform duration-300 group-hover:scale-110"
        style={{ boxShadow: `0 0 24px -8px ${accent}66` }}
      >
        <FontAwesomeIcon icon={icon} className="size-4" style={{ color: accent }} />
      </span>

      <h3
        className={cn(
          'relative font-semibold tracking-tight text-white',
          big ? 'text-xl' : 'text-base',
        )}
      >
        {title}
      </h3>
      <p className={cn('relative mt-2 text-sm leading-relaxed text-slate-400', big && 'text-[15px]')}>
        {desc}
      </p>

      {/* Bottom border accent that grows on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}88 50%, transparent 100%)`,
          transform: hover ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'center',
        }}
      />
    </div>
  );
}

/* ───────────────────────── CTA ───────────────────────── */

function CtaSection() {
  return (
    <section className="relative overflow-hidden py-32">
      {/* Decoration globe right side */}
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[55%] opacity-50 lg:block">
        <DecorationGlobe
          kind="outline"
          theme="outline-dark"
          speed={0.025}
          starfield={false}
          atmosphere
          className="size-[min(80vmin,900px)] translate-x-[18%]"
        />
      </div>
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_70%_50%,rgba(255,200,90,0.08)_0%,transparent_55%)]" />

      <div className="mx-auto max-w-5xl px-6">
        <FadeContent duration={800}>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-10 backdrop-blur-md md:p-14">
            {/* Orbiting dots — pure decoration */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 lg:block"
              style={{ width: 0, height: 0 }}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(255,200,90,0.8)] animate-orbit-slow"
                  style={{
                    width: 5,
                    height: 5,
                    ['--orbit-radius' as string]: `${140 + i * 30}px`,
                    ['--orbit-duration' as string]: `${14 + i * 4}s`,
                    animationDelay: `${i * -3}s`,
                  } as CSSProperties}
                />
              ))}
            </div>

            <div className="max-w-xl">
              <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
                Stop screenshotting <span className="text-amber-200/80">other people's</span> globes.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300 md:text-lg">
                Open Studio, pick a kind, tune a theme, hit export. Your globe lands in production
                with a single config object. No GPU PhD required.
              </p>
              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Magnet padding={56} magnetStrength={3}>
                  <StarBorder
                    as={Link}
                    to="/studio"
                    color="rgba(255,213,122,0.85)"
                    speed="5s"
                    className="text-sm font-semibold"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FontAwesomeIcon icon={faGlobePointer} className="size-4 text-amber-200" />
                      Open Studio
                      <FontAwesomeIcon icon={faArrowUpRight} className="size-3 text-amber-200" />
                    </span>
                  </StarBorder>
                </Magnet>
                <span className="text-xs text-slate-500">
                  No signup · State persists in your browser · Export as JSON
                </span>
              </div>
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-white/[0.01] py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
            <FontAwesomeIcon icon={faGlobePointer} className="size-3 text-amber-200" />
          </span>
          <span className="text-sm font-semibold text-white">Globio</span>
          <span className="text-xs text-slate-500">v0.1 · MIT</span>
        </div>
        <div className="flex items-center gap-7 text-xs text-slate-400">
          <Link to="/studio" className="transition-colors hover:text-white">
            Studio
          </Link>
          <a href="#kinds" className="transition-colors hover:text-white">
            Kinds
          </a>
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            <FontAwesomeIcon icon={faGithub} className="mr-1 size-3" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

/* Tiny syntax-highlight helpers for the code block. Keep them inline so
   the section file stays self-contained (no external highlighter dep). */
function Code({ k, children }: { readonly k?: 'kw' | 'fn' | 'str' | 'punct' | 'prop' | 'ident' | 'tag' | 'bool'; readonly children: ReactNode }) {
  const color: Record<NonNullable<typeof k>, string> = {
    kw: 'text-pink-400',
    fn: 'text-amber-200',
    str: 'text-emerald-300',
    punct: 'text-slate-500',
    prop: 'text-sky-300',
    ident: 'text-slate-200',
    tag: 'text-violet-300',
    bool: 'text-orange-300',
  };
  return <span className={k ? color[k] : 'text-slate-200'}>{children}</span>;
}

const hexToRgb = (hex: string): string => {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};
