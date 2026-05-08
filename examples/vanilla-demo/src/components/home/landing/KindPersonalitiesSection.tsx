import type { GlobeKind } from '@your-globe/core';
import { SectionHeader } from '@/components/shared';
import { PersonalityRow } from './personalities/PersonalityRow';

interface KindCopy {
  readonly id: GlobeKind;
  readonly index: string;
  readonly tagline: string;
  readonly description: string;
}

const KINDS: ReadonlyArray<KindCopy> = [
  {
    id: 'cinematic',
    index: '01',
    tagline: 'Marketing-grade night Earth.',
    description:
      'Physically lit oceans, warm borders, city-light constellations and native data overlays. Built for hero sections, investor decks and polished product storytelling.',
  },
  {
    id: 'outline',
    index: '02',
    tagline: 'Editorial command center.',
    description:
      'Crisp continent borders, glowing seas, sunrise terminator. The default flagship for product dashboards and reportage that needs to look like it belongs above the fold.',
  },
  {
    id: 'dotted',
    index: '03',
    tagline: 'Stippled data atlas.',
    description:
      'Continents rendered as quietly-tuned dot fields. Choropleth and tinting modes feel native, ripple animations propagate cleanly. Pairs especially well with point-data visualizations.',
  },
  {
    id: 'wireframe',
    index: '04',
    tagline: 'Pure topology.',
    description:
      'Geometric line work over a translucent shell. Made for engineering-side narratives — performance dashboards, network visualization, structural storytelling.',
  },
  {
    id: 'hologram',
    index: '05',
    tagline: 'Future-tense projection.',
    description:
      'Animated scanlines, fresnel atmospheres, subtle holographic shimmer. The cinematic option — works on dark backgrounds and looks sharper at large scale.',
  },
  {
    id: 'paper',
    index: '06',
    tagline: 'Tactile educational atlas.',
    description:
      'Hand-drawn ink, paper grain, vintage labels. The most editorial kind. Use it for storytelling, education, museum work, or anything that wants to feel earned.',
  },
];

export function KindPersonalitiesSection() {
  return (
    <section id="kinds" className="relative overflow-hidden bg-[#02050b] px-6 py-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.1),transparent_24%),radial-gradient(circle_at_74%_18%,rgba(251,191,36,0.08),transparent_28%),linear-gradient(180deg,#02050b_0%,#07111b_46%,#02050b_100%)]" />

      <div className="mx-auto mb-16 max-w-7xl">
        <SectionHeader
          eyebrow="Six personalities"
          title="Same engine. Six distinct globes."
          sub="Cinematic, outline, dotted, wireframe, hologram, paper — each one is a real renderer, not a colorway. Pick the personality that fits the story."
        />
      </div>

      <div className="mx-auto max-w-[1480px] space-y-10">
        {KINDS.map((k, i) => (
          <PersonalityRow
            key={k.id}
            kind={k.id}
            index={k.index}
            tagline={k.tagline}
            description={k.description}
            mirror={i % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}
