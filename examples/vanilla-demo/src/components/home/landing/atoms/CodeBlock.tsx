import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/sharp-solid-svg-icons';
import { HighlightedCode } from '@/lib/code-highlight';
import { cn } from '@/lib/utils';

export interface CodeBlockProps {
  readonly code: string;
  readonly title?: string;
  readonly lineNumbers?: boolean;
  readonly className?: string;
  readonly maxHeight?: number;
}

/** Lightweight highlighted code card with a copy button. */
export function CodeBlock({ code, title, lineNumbers = true, className, maxHeight }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-[var(--hair)] bg-[#090b10]', className)}>
      <div className="flex h-11 items-center justify-between border-b border-[var(--hair)] px-4">
        <span className="t-mono text-[var(--mist)]">{title ?? 'main.ts'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.72rem] text-[var(--mist)] transition-colors hover:text-[var(--ice)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--atm)]"
          aria-label="Copy code"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <HighlightedCode code={code} lineNumbers={lineNumbers} maxHeight={maxHeight} />
    </div>
  );
}
