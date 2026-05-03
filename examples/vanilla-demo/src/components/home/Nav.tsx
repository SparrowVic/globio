import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faGlobePointer } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { faArrowUpRight } from '@fortawesome/sharp-solid-svg-icons';

import { cn } from '@/lib/utils';

/**
 * Sticky top nav. Starts transparent over the hero so the globe reads
 * cleanly, then morphs to a frosted-glass surface once the user scrolls
 * past 24px so it stays legible against any background colour. Scroll
 * threshold is intentionally tiny — the morph fires almost as soon as
 * you start scrolling and feels like the nav "reacts" to the page.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled
          ? 'border-b border-white/[0.08] bg-[#03050d]/65 backdrop-blur-xl backdrop-saturate-150'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]',
              'shadow-[0_0_20px_-6px_rgba(255,200,90,0.4)] transition-shadow group-hover:shadow-[0_0_24px_-4px_rgba(255,200,90,0.6)]',
            )}
          >
            <FontAwesomeIcon icon={faGlobePointer} className="size-4 text-amber-200" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            Globio
          </span>
          <span className="hidden rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:inline">
            β
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#kinds"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            Kinds
          </a>
          <a
            href="#features"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#code"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            Code
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            <FontAwesomeIcon icon={faGithub} className="mr-1 size-3.5" />
            GitHub
          </a>
        </div>

        <Link
          to="/studio"
          className={cn(
            'group inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium',
            'bg-amber-200 text-slate-950 transition-all',
            'hover:-translate-y-px hover:shadow-[0_8px_28px_-8px_rgba(255,200,90,0.55)]',
          )}
        >
          <span>Open Studio</span>
          <FontAwesomeIcon
            icon={faArrowUpRight}
            className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>
    </nav>
  );
}
