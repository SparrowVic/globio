import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/sharp-solid-svg-icons';
import { cn } from '@/lib/utils';

export interface CopyCommandProps {
  readonly command: string;
  readonly className?: string;
  readonly size?: 'sm' | 'md';
}

/** A shell command with a copy affordance. Click anywhere to copy. */
export function CopyCommand({ command, className, size = 'md' }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the text is still selectable */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : `Copy ${command}`}
      className={cn(
        'group inline-flex items-center gap-3 rounded-full border border-[var(--hair-strong)] bg-[rgba(220,235,255,0.03)] font-mono text-[var(--ice)] transition-colors hover:border-[rgba(220,235,255,0.42)] hover:bg-[rgba(220,235,255,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atm)]',
        size === 'md' ? 'h-12 px-5 text-[0.9rem]' : 'h-9 px-4 text-[0.78rem]',
        className,
      )}
    >
      <span className="text-[var(--mist)]">$</span>
      <span>{command}</span>
      <FontAwesomeIcon
        icon={copied ? faCheck : faCopy}
        className={cn('size-3 transition-colors', copied ? 'text-[var(--ember)]' : 'text-[var(--mist)] group-hover:text-[var(--ice)]')}
      />
    </button>
  );
}
