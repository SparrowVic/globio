import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DocsLayout } from '@/components/docs';
import '@/components/home/landing/landing.css';
import '@/components/docs/docs.css';
import { findPage } from '@/docs/manifest';
import { DocsHome } from '@/docs/pages/DocsHome';
import { NotFound } from '@/docs/pages/NotFound';
import { resolvePage } from '@/docs/pages';

const slugFrom = (pathname: string): string => pathname.replace(/^\/docs\/?/, '').replace(/\/+$/, '');

/**
 * `/docs/*`. The slug after `/docs/` selects a page from the manifest; the
 * layout gets the page's tab so the sidebar and top bar light up.
 */
export default function Docs() {
  const { pathname, hash } = useLocation();
  const slug = slugFrom(pathname);
  const hit = slug ? findPage(slug) : null;

  useEffect(() => {
    document.title = hit ? `${hit.page.title} · Globio docs` : slug ? 'Not found · Globio docs' : 'Globio docs';
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
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [slug, hash]);

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
      <Page {...hit} />
    </DocsLayout>
  );
}
