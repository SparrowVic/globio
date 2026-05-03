import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags } from '@fortawesome/sharp-duotone-solid-svg-icons';

import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  /**
   * Small accent eyebrow above the title (uppercase, letter-spaced).
   * Pass an `eyebrowIcon` to override the default tag glyph, or `null`
   * to drop the icon entirely.
   */
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly sub?: ReactNode;
  readonly align?: 'left' | 'center';
  readonly eyebrowIcon?: typeof faTags | null;
  readonly className?: string;
}

/**
 * Three-line section header used by the marketing home and reusable for
 * any future section with an eyebrow + headline + subhead pattern.
 * Defaults match the home page styling; tweak `align` / icon to fit
 * narrower contexts (e.g. a left-aligned settings section header).
 */
export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = 'center',
  eyebrowIcon = faTags,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/70">
        {eyebrowIcon && <FontAwesomeIcon icon={eyebrowIcon} className="size-2.5" />}
        {eyebrow}
      </span>
      <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {sub && (
        <p className="max-w-xl text-balance text-sm leading-relaxed text-slate-400 sm:text-base">
          {sub}
        </p>
      )}
    </div>
  );
}
