import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { CopyCommand, Wordmark } from '../atoms';
import { GITHUB_URL, INSTALL_COMMAND, NPM_URL } from '../data/links';

const LINKS: ReadonlyArray<{ readonly label: string; readonly href: string; readonly external?: boolean }> = [
  { label: 'Kinds', href: '#kinds' },
  { label: 'Data', href: '#data' },
  { label: 'Frameworks', href: '#frameworks' },
  { label: 'Performance', href: '#performance' },
  { label: 'Docs', href: '/docs' },
  { label: 'GitHub', href: GITHUB_URL, external: true },
  { label: 'npm', href: NPM_URL, external: true },
];

export function Footer() {
  return (
    <footer className="relative">
      <div className="wrap">
        <div className="rule" />
        <div className="flex flex-col items-center py-28 text-center md:py-36">
          <span className="eyebrow reveal">createGlobe()</span>
          <h2 className="t-display reveal reveal-d1 mt-6 max-w-[12ch]">Ready when you are.</h2>
          <div className="reveal reveal-d2 mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/studio" className="btn btn-primary">
              Open Studio
              <FontAwesomeIcon icon={faArrowRight} className="size-3" />
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <FontAwesomeIcon icon={faGithub} className="size-4" />
              Source on GitHub
            </a>
          </div>
          <CopyCommand command={INSTALL_COMMAND} className="reveal reveal-d3 mt-6" />
        </div>
        <div className="rule" />
        <div className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <Link to="/" aria-label="Globio home">
            <Wordmark />
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((l) =>
              l.href.startsWith('/') ? (
                <Link key={l.label} to={l.href} className="link text-[0.9rem] text-[var(--mist)] hover:text-[var(--ice)]">
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="link text-[0.9rem] text-[var(--mist)] hover:text-[var(--ice)]"
                >
                  {l.label}
                </a>
              ),
            )}
          </nav>
          <span className="t-mono text-[var(--mist)]">MIT · built on three.js</span>
        </div>
      </div>
    </footer>
  );
}
