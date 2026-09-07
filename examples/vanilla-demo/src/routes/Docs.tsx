import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DocsLayout } from '@/components/docs';
import { DocPageProvider } from '@/components/docs/layout/page-context';
import '@/components/home/landing/landing.css';
import '@/components/docs/docs.css';
import { findPage } from '@/docs/manifest';
import { DocsHome } from '@/docs/pages/DocsHome';
import { NotFound } from '@/docs/pages/NotFound';
import { SnapshotsPage } from '@/docs/pages/Snapshots';
import { pageSource, resolvePage } from '@/docs/pages';

const slugFrom = (pathname: string): string => pathname.replace(/^\/docs\/?/, '').replace(/\/+$/, '');

/**
 * Scroll to a hash target, retrying briefly: reference tables render once
 * api.json has loaded, so the element may not exist on the first frame.
 */
const scrollToHash = (hash: string): (() => void) => {
  const id = hash.slice(1);
  let frame = 0;
  const started = performance.now();
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      return;
    }
    if (performance.now() - started < 2000) frame = window.requestAnimationFrame(attempt);
  };
  attempt();
  return () => window.cancelAnimationFrame(frame);
};

/**
 * `/docs/*`. The slug after `/docs/` selects a page from the manifest; the
 * layout gets the page's tab so the sidebar and top bar light up.
 */
export default function Docs() {
  const { pathname, hash } = useLocation();
  const slug = slugFrom(pathname);
  const hit = slug ? findPage(slug) : null;

  useEffect(() => {
    document.title = hit ? `${hit.page.title} · Globio docs` : slug === '_snapshots' ? 'Kind snapshots · Globio docs' : slug ? 'Not found · Globio docs' : 'Globio docs';
    return () => {
      document.title = 'Globio · Put a planet in your product';
    };
  }, [hit, slug]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = 'dark';
    root.style.scrollBehavior = 'smooth';
    return () => {
      root.style.colorScheme = '';
      root.style.scrollBehavior = '';
    };
  }, []);

  useEffect(() => {
    if (hash) return scrollToHash(hash);
    window.scrollTo({ top: 0 });
    return undefined;
  }, [slug, hash]);

  if (slug === '_snapshots') return <SnapshotsPage />;

  if (!slug) {
    return (
      <DocsLayout>
        <DocsHome />
      </DocsLayout>
    );
  }
  if (!hit) {
    return (
      <DocsLayout>
        <NotFound slug={slug} />
      </DocsLayout>
    );
  }
  const Page = resolvePage(slug);
  return (
    <DocsLayout tab={hit.tab} slug={slug}>
      <DocPageProvider value={{ slug, source: pageSource(slug) }}>
        <Page {...hit} />
      </DocPageProvider>
    </DocsLayout>
  );
}
