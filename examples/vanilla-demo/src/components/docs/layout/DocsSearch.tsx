import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DOCS_TABS, pageHref } from '@/docs/manifest';

export interface DocsSearchProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * ⌘K search over page titles and summaries. The content pass will index
 * headings and API keys too; the dialog and keyboard flow stay the same.
 */
export function DocsSearch({ open, onOpenChange }: DocsSearchProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const groups = useMemo(() => DOCS_TABS.map((tab) => ({ tab, pages: tab.groups.flatMap((g) => g.pages.map((p) => ({ ...p, group: g }))) })), []);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search documentation" description="Type a topic, a config key or a method name" className="docs-search-dialog">
      <CommandInput placeholder="Search docs — try autoRotate, markers, flyTo" />
      <CommandList className="docs-search-list">
        <CommandEmpty>No matches. Try a config key such as autoRotate, or a kind such as dotted.</CommandEmpty>
        {groups.map(({ tab, pages }) => (
          <CommandGroup key={tab.id} heading={tab.label}>
            {pages.map((p) => (
              <CommandItem
                key={p.slug}
                value={`${p.title} ${p.summary} ${p.eyebrow ?? ''} ${p.group.label}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate(pageHref(p.slug));
                }}
                className="docs-search-item"
              >
                <FontAwesomeIcon icon={tab.icon} className="size-3 opacity-60" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{p.title}</span>
                  <span className="truncate text-[0.74rem] opacity-60">{p.summary}</span>
                </span>
                {p.eyebrow && <span className="docs-search-eyebrow">{p.eyebrow}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
