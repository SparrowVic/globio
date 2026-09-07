import { useMemo, useRef, useState } from 'react';
import type { GlobeKind, ResolutionLevel, ThemePresetName } from '@your-globe/core';
import { cn } from '@/lib/utils';
import { Graticule, StarField } from '../atoms';
import { KIND_CHAPTERS } from '../data/kinds';
import { defaultThemeFor } from '../data/kind-themes';
import { useActiveChapter } from '../hooks/use-active-chapter';
import { useCoarsePointer } from '../hooks/use-coarse-pointer';
import { useStagePose } from '../hooks/use-stage-pose';
import { GlobeDeck, type DeckEntry } from './GlobeDeck';
import { HeroCopy } from './HeroCopy';
import { KindChapter } from './KindChapter';

// The hero cinematic globe is built once at load, so it keeps the default
// (medium) country geometry; the chapter globes are warmed later, one at a
// time, and low resolution cuts their build time roughly in half.
const resolutionFor = (kind: GlobeKind): ResolutionLevel | undefined =>
  kind === 'cinematic' ? undefined : 'low';

const initialThemes = (): Record<GlobeKind, ThemePresetName> => ({
  cinematic: defaultThemeFor('cinematic'),
  outline: defaultThemeFor('outline'),
  dotted: defaultThemeFor('dotted'),
  wireframe: defaultThemeFor('wireframe'),
  hologram: defaultThemeFor('hologram'),
  paper: defaultThemeFor('paper'),
});

/**
 * The signature of the page: one pinned stage shared by the hero and the six
 * kind chapters. Scrolling the hero morphs the globe from "planet on the
 * horizon" into the chapter frame (useStagePose); the chapter crossing the
 * middle of the viewport owns the globe (useActiveChapter); the deck keeps
 * every kind warm so a switch is a cross-fade, never a build.
 */
export function PlanetStage() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const poseRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const [themes, setThemes] = useState<Record<GlobeKind, ThemePresetName>>(initialThemes);
  const coarse = useCoarsePointer();

  useStagePose({ section: sectionRef, pose: poseRef, hero: heroRef });
  const active = useActiveChapter(chapterRefs);

  const current = KIND_CHAPTERS[active] ?? KIND_CHAPTERS[0];
  const kind = current?.kind ?? 'cinematic';
  const theme = themes[kind];
  // What the deck builds ahead of time. Desktop: every chapter, so a switch
  // is always a cross-fade. Touch devices have far less GPU memory, so they
  // keep only the next chapter warm (about four contexts at most).
  const warm = useMemo<ReadonlyArray<DeckEntry>>(() => {
    const entries = KIND_CHAPTERS.map((c) => ({ kind: c.kind, theme: themes[c.kind] }));
    if (!coarse) return entries;
    const next = entries[active + 1];
    return next ? [next] : [];
  }, [themes, coarse, active]);
  if (!current) return null;

  return (
    <section ref={sectionRef} className="stage-section" aria-label="Globe kinds">
      <div className="stage-sticky">
        <StarField className="stage-stars" />
        <div ref={poseRef} className="stage-pose">
          <div className="stage-halo" />
          <Graticule className="stage-graticule" />
          <div className="stage-enter absolute inset-0">
            <GlobeDeck
              kind={kind}
              theme={theme}
              interactive={!coarse}
              warm={warm}
              resolutionFor={resolutionFor}
            />
          </div>
        </div>
        <div className="stage-fade" />
      </div>

      <div className="stage-scroll">
        <div ref={heroRef} className="hero-block wrap">
          <HeroCopy />
        </div>

        {KIND_CHAPTERS.map((chapter, i) => (
          <div
            key={chapter.kind}
            ref={(el) => {
              chapterRefs.current[i] = el;
            }}
            data-index={i}
            id={i === 0 ? 'kinds' : undefined}
            className={cn('chapter wrap', i === active && 'is-active')}
          >
            <KindChapter
              chapter={chapter}
              theme={themes[chapter.kind]}
              onThemeChange={(next) => setThemes((prev) => ({ ...prev, [chapter.kind]: next }))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
