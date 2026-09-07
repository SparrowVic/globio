import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tokenAnchor } from '@/docs/api';

export interface TokenEntry {
  readonly name: string;
  readonly value: string | number;
  readonly description?: ReactNode;
}

const looksLikeColor = (v: string | number): v is string =>
  typeof v === 'string' && /^(#|rgb|hsl|oklch)/.test(v.trim());

/** Theme tokens with a swatch for colour values. One row per token path. */
export function TokenSwatches({ tokens, className }: { readonly tokens: ReadonlyArray<TokenEntry>; readonly className?: string }) {
  return (
    <ul className={cn('docs-tokens', className)}>
      {tokens.map((t) => (
        <li key={t.name} id={tokenAnchor(t.name)} className="docs-token">
          {looksLikeColor(t.value) ? (
            <span className="docs-swatch" style={{ background: t.value }} aria-hidden="true" />
          ) : (
            <span className="docs-swatch docs-swatch-num" aria-hidden="true">
              #
            </span>
          )}
          <code className="docs-token-name">{t.name}</code>
          <code className="docs-token-value">{String(t.value)}</code>
          {t.description && <span className="docs-token-desc">{t.description}</span>}
        </li>
      ))}
    </ul>
  );
}
