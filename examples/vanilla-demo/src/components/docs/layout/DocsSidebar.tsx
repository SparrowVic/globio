import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { DOCS_TABS, pageHref, tabHref, type DocTab } from '@/docs/manifest';
import { cn } from '@/lib/utils';
import { FrameworkSwitch } from '../code/FrameworkSwitch';

export interface DocsSidebarProps {
  readonly tab: DocTab;
  readonly activeSlug?: string;
  readonly className?: string;
}

/** Group labels and page links for one tab. The active page carries the dot. */
export function SidebarGroups({ tab, activeSlug }: { readonly tab: DocTab; readonly activeSlug?: string }) {
  return (
    <>
      {tab.groups.map((g) => (
        <div key={g.id} className="docs-side-group">
          <span className="docs-side-label">{g.label}</span>
          <ul>
            {g.pages.map((p) => {
              const active = p.slug === activeSlug;
              return (
                <li key={p.slug}>
                  <Link to={pageHref(p.slug)} className={cn('docs-side-link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/** Desktop sidebar: sticky, scrolls on its own. */
export function DocsSidebar({ tab, activeSlug, className }: DocsSidebarProps) {
  return (
    <aside className={cn('docs-side hidden lg:block', className)} aria-label={`${tab.label} pages`}>
      <div className="docs-side-tab">
        <FontAwesomeIcon icon={tab.icon} className="size-3.5" />
        <span>{tab.label}</span>
      </div>
      <SidebarGroups tab={tab} activeSlug={activeSlug} />
    </aside>
  );
}

export interface DocsDrawerProps {
  readonly tab: DocTab;
  readonly activeSlug?: string;
  readonly activeTabId?: string;
}

/** Mobile drawer: the tabs, the framework switch and the active tab's groups. */
export function DocsDrawer({ tab, activeSlug, activeTabId }: DocsDrawerProps) {
  return (
    <div className="docs-drawer lg:hidden" role="dialog" aria-label="Documentation menu">
      <div className="docs-wrap py-5">
        <div className="docs-drawer-tabs">
          {DOCS_TABS.map((t) => (
            <Link key={t.id} to={tabHref(t)} className={cn('docs-tab', activeTabId === t.id && 'is-active')}>
              <FontAwesomeIcon icon={t.icon} className="size-3" />
              {t.label}
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <span className="docs-side-label">Code examples</span>
          <FrameworkSwitch size="sm" className="mt-2" />
        </div>
        <div className="mt-6">
          <SidebarGroups tab={tab} activeSlug={activeSlug} />
        </div>
      </div>
    </div>
  );
}
