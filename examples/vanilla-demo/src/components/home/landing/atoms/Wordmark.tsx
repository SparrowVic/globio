import { cn } from '@/lib/utils';

/** The Globio mark: a globe with one meridian and its equator. */
export function GlobeMark({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9.5" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" />
    </svg>
  );
}

export function Wordmark({ className }: { readonly className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <GlobeMark className="size-[22px] text-[var(--ice)]" />
      <span className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--ice)]">Globio</span>
    </span>
  );
}
