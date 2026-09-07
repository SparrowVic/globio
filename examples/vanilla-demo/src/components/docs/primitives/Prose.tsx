import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Body-copy styling (paragraphs, lists, links, inline code) for text outside a DocPage. */
export function Prose({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <div className={cn('docs-prose', className)}>{children}</div>;
}

/** Inline code with the docs treatment. Prefer plain backticks-in-prose semantics: one identifier per element. */
export function InlineCode({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <code className={cn('docs-inline-code', className)}>{children}</code>;
}
