import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/home/landing/atoms';
import { GITHUB_URL, NPM_URL } from '@/components/home/landing/data/links';

const LINKS: ReadonlyArray<{ readonly label: string; readonly href: string; readonly external?: boolean }> = [
  { label: 'Home', href: '/' },
  { label: 'Studio', href: '/studio' },
  { label: 'GitHub', href: GITHUB_URL, external: true },
  { label: 'npm', href: NPM_URL, external: true },
];

export function DocsFooter() {
  return (
    <footer className="docs-footer">
      <div className="docs-wrap flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
        <Link to="/" aria-label="Globio home">
          <Wordmark />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) =>
            l.external ? (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="link text-[0.9rem] text-[var(--mist)] hover:text-[var(--ice)]">
                {l.label}
              </a>
            ) : (
              <Link key={l.label} to={l.href} className="link text-[0.9rem] text-[var(--mist)] hover:text-[var(--ice)]">
                {l.label}
              </Link>
            ),
          )}
        </nav>
        <span className="t-mono text-[var(--mist)]">MIT · built on three.js</span>
      </div>
    </footer>
  );
}
