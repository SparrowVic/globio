import { HighlightedCode } from '@/lib/code-highlight';
import { cn } from '@/lib/utils';

/** A single declaration, highlighted, without gutter or chrome: `createGlobe(config: GlobeConfig): GlobeInstance`. */
export function Signature({ code, className }: { readonly code: string; readonly className?: string }) {
  return (
    <div className={cn('docs-signature', className)}>
      <HighlightedCode code={code} lineNumbers={false} className="p-0" />
    </div>
  );
}
