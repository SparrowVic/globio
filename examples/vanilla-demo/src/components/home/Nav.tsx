import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';
import { cn } from '@/lib/utils';
import { Wordmark } from './landing/atoms';
import { GITHUB_URL } from './landing/data/links';

const ITEMS: ReadonlyArray<{ readonly label: string; readonly href: string }> = [
  { label: 'Kinds', href: '#kinds' },
  { label: 'Data', href: '#data' },
  { label: 'Frameworks', href: '#frameworks' },
  { label: 'Performance', href: '#performance' },
  { label: 'Studio', href: '#studio' },
];

/**
 * Top bar. Transparent over the hero; once the page scrolls it picks up a
 * hairline and a blur so it reads against whatever passes underneath.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled
          ? 'border-b border-[var(--hair)] bg-[rgba(5,6,8,0.82)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="Globio home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {ITEMS.map((item) => (
            <a key={item.label} href={item.href} className="link text-[0.9rem] text-[var(--mist)] hover:text-[var(--ice)]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Globio on GitHub"
            className="inline-flex size-9 items-center justify-center rounded-full text-[var(--mist)] transition-colors hover:text-[var(--ice)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--atm)]"
          >
            <FontAwesomeIcon icon={faGithub} className="size-4" />
          </a>
          <Link to="/studio" className="btn btn-primary btn-sm">
            Open Studio
            <FontAwesomeIcon icon={faArrowRight} className="size-2.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
