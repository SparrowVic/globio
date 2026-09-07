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
 * Scroll to a hash target when it appears: reference tables render once
 * api.json has loaded, so the element may not exist on the first frame.
 */
const scrollToHash = (hash: string): (() => void) => {
  let id = hash.slice(1);
  try { id = decodeURIComponent(id); } catch { /* Keep malformed hashes literal. */ }
  let observer: MutationObserver | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    observer?.disconnect();
    if (timeout !== undefined) clearTimeout(timeout);
  };
  const attempt = (): boolean => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      cancel();
      return true;
    }
    return false;
  };
  if (!attempt()) {
    observer = new MutationObserver(attempt);
    observer.observe(document.body, { childList: true, subtree: true });
    timeout = setTimeout(cancel, 10_000);
  }
  return cancel;
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
    const previousScheme = root.style.colorScheme;
    const previousScroll = root.style.scrollBehavior;
    root.style.colorScheme = 'dark';
    root.style.scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    return () => {
      root.style.colorScheme = previousScheme;
      root.style.scrollBehavior = previousScroll;
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
