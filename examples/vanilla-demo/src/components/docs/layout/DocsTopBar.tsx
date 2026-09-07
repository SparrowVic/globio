import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight, faBars, faMagnifyingGlass, faXmark } from '@fortawesome/sharp-solid-svg-icons';
import { Wordmark } from '@/components/home/landing/atoms';
import { GITHUB_URL } from '@/components/home/landing/data/links';
import { DOCS_ROOT, DOCS_TABS, DOCS_VERSION, tabHref } from '@/docs/manifest';
import { cn } from '@/lib/utils';
import { FrameworkSwitch } from '../code/FrameworkSwitch';

export interface DocsTopBarProps {
  readonly activeTabId?: string;
  readonly menuOpen: boolean;
  readonly onMenu: () => void;
  readonly onSearch: () => void;
}

/**
 * Sticky bar: wordmark, the four top-level tabs, search, the global
 * framework switch, version and the two exits (GitHub, Studio).
 */
export function DocsTopBar({ activeTabId, menuOpen, onMenu, onSearch }: DocsTopBarProps) {
  return (
    <header className="docs-topbar">
      <div className="docs-wrap flex h-16 items-center gap-4">
        <button type="button" onClick={onMenu} className="docs-iconbtn lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} className="size-4" />
        </button>

        <Link to={DOCS_ROOT} className="flex shrink-0 items-center gap-2.5" aria-label="Globio docs home">
          <Wordmark />
          <span className="docs-pill hidden sm:inline-flex" data-tone="neutral">
            docs
          </span>
        </Link>

        <nav aria-label="Documentation sections" className="docs-tabs-nav hidden lg:flex">
          {DOCS_TABS.map((t) => (
            <Link key={t.id} to={tabHref(t)} className={cn('docs-tab', activeTabId === t.id && 'is-active')} aria-current={activeTabId === t.id ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onSearch} className="docs-search-btn" aria-label="Search documentation">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="size-3.5" />
            <span className="hidden md:inline">Search</span>
            <span className="docs-kbd hidden md:inline-flex" aria-hidden="true">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
          </button>
          <FrameworkSwitch size="sm" className="hidden xl:inline-flex" />
          <span className="docs-pill hidden xl:inline-flex" data-tone="neutral" title="Package version">
            {DOCS_VERSION}
          </span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="Globio on GitHub" className="docs-iconbtn">
            <FontAwesomeIcon icon={faGithub} className="size-4" />
          </a>
          <span className="hidden md:inline-flex">
            <Link to="/studio" className="btn btn-primary btn-sm">
              Open Studio
              <FontAwesomeIcon icon={faArrowRight} className="size-2.5" />
            </Link>
          </span>
        </div>
      </div>
    </header>
  );
}
