import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DOCS_TABS, type DocTab } from '@/docs/manifest';
import { FrameworkProvider } from '../code/framework-context';
import { DocsDrawer, DocsSidebar } from './DocsSidebar';
import { DocsFooter } from './DocsFooter';
import { DocsSearch } from './DocsSearch';
import { DocsToc } from './DocsToc';
import { DocsTopBar } from './DocsTopBar';
import { PageNav } from './PageNav';
import { TocProvider } from './toc-context';

interface DocsUiValue {
  readonly openSearch: () => void;
}

const DocsUiContext = createContext<DocsUiValue | null>(null);

/** Shell-level actions a page may trigger (the home page has its own search button). */
export const useDocsUi = (): DocsUiValue => useContext(DocsUiContext) ?? { openSearch: () => undefined };

export interface DocsLayoutProps {
  /** The tab the current page belongs to; the home page has none and shows the Guide sidebar. */
  readonly tab?: DocTab;
  readonly slug?: string;
  readonly children: ReactNode;
}

/**
 * The documentation shell: top bar, sidebar, article column with previous/
 * next, the outline column, footer. Owns the two bits of UI state every page
 * shares — the mobile menu and the search dialog.
 */
export function DocsLayout({ tab, slug, children }: DocsLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sideTab = tab ?? DOCS_TABS[0];
  const ui = useMemo<DocsUiValue>(() => ({ openSearch: () => setSearchOpen(true) }), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [slug]);

  if (!sideTab) return null;

  return (
    <div className="docs min-h-screen">
      <FrameworkProvider>
        <DocsUiContext.Provider value={ui}>
          <DocsTopBar activeTabId={tab?.id} menuOpen={menuOpen} onMenu={() => setMenuOpen((v) => !v)} onSearch={ui.openSearch} />
          <DocsSearch open={searchOpen} onOpenChange={setSearchOpen} />
          {menuOpen && <DocsDrawer tab={sideTab} activeSlug={slug} activeTabId={tab?.id} />}
          <div className="docs-wrap docs-shell">
            <DocsSidebar tab={sideTab} activeSlug={slug} />
            <TocProvider>
              <main id="docs-main" className="docs-main">
                {children}
                {slug && <PageNav slug={slug} />}
              </main>
              <DocsToc />
            </TocProvider>
          </div>
          <DocsFooter />
        </DocsUiContext.Provider>
      </FrameworkProvider>
    </div>
  );
}
