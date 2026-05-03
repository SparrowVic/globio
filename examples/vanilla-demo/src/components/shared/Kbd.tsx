import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface KbdProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * macOS-style keyboard chip. 20px tall, monospace, hairline border. Use
 * inline as `<Kbd>⌘</Kbd><Kbd>K</Kbd>` to hint at chord shortcuts.
 */
export function Kbd({ children, className }: KbdProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px] tabular-nums text-slate-300',
        className,
      )}
    >
      {children}
    </span>
  );
}
