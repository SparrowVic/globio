import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';
import type { ThemePresetName } from '@your-globe/core';
import { cn } from '@/lib/utils';
import type { KindChapterData } from '../data/kinds';
import { KIND_THEMES } from '../data/kind-themes';

export interface KindChapterProps {
  readonly chapter: KindChapterData;
  readonly theme: ThemePresetName;
  readonly onThemeChange: (theme: ThemePresetName) => void;
}

/** Copy column of one planet-stage chapter. The globe itself lives in the stage. */
export function KindChapter({ chapter, theme, onThemeChange }: KindChapterProps) {
  const themes = KIND_THEMES[chapter.kind];

  return (
    <div className="chapter-inner">
      <span className="eyebrow">kind: '{chapter.kind}'</span>
      <h2 className="chapter-title mt-5 text-[var(--ice)]">{chapter.title}</h2>
      <p className="mt-4 text-[1.2rem] leading-snug text-[var(--ice)]/85">{chapter.tagline}</p>
      <p className="t-body mt-4 max-w-[48ch]">{chapter.description}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {chapter.traits.map((trait) => (
          <li
            key={trait}
            className="t-mono rounded-full border border-[var(--hair)] px-3 py-1 text-[var(--mist)]"
          >
            {trait}
          </li>
        ))}
      </ul>

      {themes.length > 1 && (
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <span className="t-mono text-[var(--mist)]">theme</span>
          <div className="flex items-center gap-2.5">
            {themes.map((t) => (
              <button
                key={t.preset}
                type="button"
                title={t.label}
                aria-label={`${t.label} theme`}
                aria-pressed={theme === t.preset}
                onClick={() => onThemeChange(t.preset)}
                className={cn('swatch', theme === t.preset && 'is-active')}
                style={{ background: t.swatch }}
              />
            ))}
          </div>
          <span className="t-mono text-[var(--ice)]">'{theme}'</span>
        </div>
      )}

      <Link
        to={`/studio?kind=${chapter.kind}&theme=${theme}`}
        className="link mt-8 inline-flex items-center gap-2 text-[0.95rem] font-medium"
      >
        Open {chapter.title} in Studio
        <FontAwesomeIcon icon={faArrowRight} className="size-3" />
      </Link>
    </div>
  );
}
