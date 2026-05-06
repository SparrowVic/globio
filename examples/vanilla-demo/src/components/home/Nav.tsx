import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faGlobePointer } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { faArrowUpRight } from '@fortawesome/sharp-solid-svg-icons';

import { cn } from '@/lib/utils';

const navItems: ReadonlyArray<{ readonly label: string; readonly href: string }> = [
  { label: 'Kinds', href: '#kinds' },
  { label: 'Layers', href: '#architecture' },
  { label: 'Studio', href: '#studio' },
  { label: 'API', href: '#api' },
  { label: 'GitHub', href: 'https://github.com' },
];

/**
 * Floating glass pill nav. Two refinements over the usual top-bar pattern:
 *
 * 1. **Sliding indicator** — the highlighted item is a positioned div that
 *    tweens its `transform` and `width` to match whatever item the cursor
 *    is over. No layout shift; the indicator literally chases the cursor
 *    between items, segmented-control style.
 *
 * 2. **Logo dotted halo** — a thin dotted-ring SVG slow-rotates around the
 *    Globio mark, so the brand reads as "globe" even at glance.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  // Index of the currently-hovered nav item, or null when nothing is
  // hovered (indicator collapses out of view).
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  // Cached bounding rects for each item so the indicator sizes itself
  // to whatever the largest text happens to be.
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState<{
    readonly left: number;
    readonly width: number;
  } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (hoverIdx === null) {
      setIndicator(null);
      return;
    }
    const el = itemRefs.current[hoverIdx];
    if (!el) return;
    const parentRect = el.parentElement?.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (!parentRect) return;
    setIndicator({
      left: elRect.left - parentRect.left,
      width: elRect.width,
    });
  }, [hoverIdx]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          'pointer-events-auto relative flex h-12 items-center gap-1 rounded-full pl-2 pr-1.5 transition-all duration-500',
          'border border-white/[0.08] backdrop-blur-2xl backdrop-saturate-150',
          scrolled
            ? 'bg-white/[0.06] shadow-[0_18px_60px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'bg-white/[0.025] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.04)]',
        )}
      >
        {/* Subtle iridescent edge — barely-there gradient that breathes */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-40 [mask:linear-gradient(white,transparent_60%)]"
          style={{
            background:
              'linear-gradient(120deg, rgba(255,200,90,0.15) 0%, rgba(255,255,255,0) 35%, rgba(120,180,255,0.12) 70%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Logo */}
        <Link
          to="/"
          aria-label="Globio home"
          className="group relative flex h-9 items-center gap-2 rounded-full px-2.5 transition-colors hover:bg-white/[0.04]"
        >
          <span className="relative flex size-7 items-center justify-center">
            {/* Slow-rotating dotted halo */}
            <svg
              viewBox="0 0 28 28"
              className="absolute inset-0 size-full animate-[spin_18s_linear_infinite] text-amber-200/70"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="14"
                cy="14"
                r="12"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeDasharray="1.2 2.6"
              />
            </svg>
            <span
              className={cn(
                'relative z-10 flex size-5 items-center justify-center rounded-full',
                'bg-gradient-to-br from-amber-200 to-orange-300 text-slate-950',
                'shadow-[0_0_20px_-2px_rgba(255,200,90,0.7)] transition-shadow group-hover:shadow-[0_0_28px_0_rgba(255,200,90,0.9)]',
              )}
            >
              <FontAwesomeIcon icon={faGlobePointer} className="size-2.5" />
            </span>
          </span>
          <span className="text-[13px] font-semibold tracking-tight text-white">Globio</span>
          <span
            className={cn(
              'rounded-full border border-amber-200/30 bg-amber-200/[0.04] px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.18em] text-amber-200/80',
            )}
          >
            β
          </span>
        </Link>

        {/* Divider */}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/[0.08]" />

        {/* Items rail */}
        <div
          className="relative hidden items-center px-1 sm:flex"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Sliding indicator */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 h-8 -translate-y-1/2 rounded-full transition-all duration-300 ease-out',
              indicator
                ? 'bg-white/[0.06] opacity-100 backdrop-blur-md'
                : 'opacity-0',
            )}
            style={
              indicator
                ? { left: indicator.left, width: indicator.width }
                : undefined
            }
          />
          {navItems.map((item, idx) => {
            const isExternal = item.href.startsWith('http');
            const Comp: React.ElementType = isExternal ? 'a' : 'a';
            return (
              <Comp
                key={item.label}
                ref={(el: HTMLAnchorElement | null) => {
                  itemRefs.current[idx] = el;
                }}
                href={item.href}
                {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
                onMouseEnter={() => setHoverIdx(idx)}
                onFocus={() => setHoverIdx(idx)}
                className={cn(
                  'relative inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium tracking-tight transition-colors',
                  'text-slate-300 hover:text-white focus-visible:text-white focus-visible:outline-none',
                )}
              >
                {item.label === 'GitHub' && (
                  <FontAwesomeIcon icon={faGithub} className="size-3 opacity-80" />
                )}
                <span>{item.label}</span>
                {isExternal && (
                  <FontAwesomeIcon
                    icon={faArrowUpRight}
                    className="size-2 opacity-50 transition-opacity group-hover:opacity-100"
                  />
                )}
              </Comp>
            );
          })}
        </div>

        {/* Divider */}
        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-white/[0.08] sm:block" />

        {/* CTA */}
        <Link
          to="/studio"
          className={cn(
            'group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full px-3.5 text-[12.5px] font-semibold tracking-tight',
            'bg-amber-200 text-slate-950 transition-all duration-300',
            'hover:scale-[1.02] hover:shadow-[0_8px_28px_-8px_rgba(255,200,90,0.65)]',
          )}
        >
          {/* Inner shine that sweeps once on hover */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/40',
              'translate-x-0 opacity-0 transition-all duration-700',
              'group-hover:translate-x-[300%] group-hover:opacity-100',
            )}
          />
          <FontAwesomeIcon icon={faGlobePointer} className="relative z-10 size-3" />
          <span className="relative z-10">Open Studio</span>
          <FontAwesomeIcon
            icon={faArrowUpRight}
            className="relative z-10 size-2.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </nav>
    </header>
  );
}
