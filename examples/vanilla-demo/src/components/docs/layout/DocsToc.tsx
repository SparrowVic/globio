import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToc, type TocEntry } from './toc-context';

const byDocumentOrder = (a: TocEntry, b: TocEntry): number => {
  const ea = document.getElementById(a.id);
  const eb = document.getElementById(b.id);
  if (!ea || !eb) return 0;
  return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
};

/** "On this page": the registered h2/h3 entries with a scroll-spied active state. */
export function DocsToc({ className }: { readonly className?: string }) {
  const raw = useToc();
  const entries = useMemo(() => [...raw].sort(byDocumentOrder), [raw]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = entries[0]?.id ?? null;
      for (const e of entries) {
        const el = document.getElementById(e.id);
        if (el && el.getBoundingClientRect().top <= 120) current = e.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [entries]);

  return (
    <aside className={cn('docs-toc hidden xl:block', className)} aria-label="On this page">
      {entries.length > 0 && (
        <>
          <span className="docs-side-label">On this page</span>
          <ul>
            {entries.map((e) => (
              <li key={e.id}>
                <a href={`#${e.id}`} className={cn('docs-toc-link', e.level === 3 && 'is-nested', activeId === e.id && 'is-active')}>
                  {e.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
