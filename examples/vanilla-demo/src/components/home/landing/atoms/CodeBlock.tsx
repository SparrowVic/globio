import { useMemo, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { cn } from '@/lib/utils';

const TOKEN_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // Comments first so they swallow keywords inside.
  [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, 'comment'],
  // Strings: single, double, backtick. Tolerate escaped quotes inside.
  [/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, 'string'],
  [
    /\b(import|from|export|const|let|var|function|return|type|interface|true|false|null|undefined|new|class|extends|implements|if|else|for|while|do|switch|case|break|continue|async|await|of|in|as|enum|public|private|readonly|protected|static)\b/g,
    'keyword',
  ],
  [
    /\b(string|number|boolean|object|any|void|never|unknown|GlobeConfig|MarkersConfig|ArcsConfig|LabelsConfig|GlobeKind|ThemePresetName|GlobeInstance|ScaleConfig)\b/g,
    'type',
  ],
  [/\b(\d+(?:\.\d+)?)\b/g, 'number'],
];

const TOKEN_COLOR: Readonly<Record<string, string>> = {
  keyword: 'text-cyan-200',
  string: 'text-amber-200',
  comment: 'text-slate-500 italic',
  number: 'text-emerald-300',
  type: 'text-fuchsia-300',
  plain: 'text-slate-300',
};

interface Token {
  readonly kind: string;
  readonly text: string;
}

/**
 * Highlight a single line by collecting all matches across patterns,
 * sorting them by start, dropping overlaps (later matches inside earlier
 * spans are ignored), and stitching the un-tokenised plain runs back in.
 *
 * One pass per line keeps line numbers aligned without offset bookkeeping.
 */
function tokenizeLine(line: string): ReadonlyArray<Token> {
  type Match = { start: number; end: number; kind: string; text: string };
  const matches: Match[] = [];

  for (const [re, kind] of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      matches.push({ start: m.index, end: m.index + m[0].length, kind, text: m[0] });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const filtered: Match[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  const tokens: Token[] = [];
  let cursor = 0;
  for (const m of filtered) {
    if (cursor < m.start) tokens.push({ kind: 'plain', text: line.slice(cursor, m.start) });
    tokens.push({ kind: m.kind, text: m.text });
    cursor = m.end;
  }
  if (cursor < line.length) tokens.push({ kind: 'plain', text: line.slice(cursor) });
  if (tokens.length === 0) tokens.push({ kind: 'plain', text: '' });
  return tokens;
}

function renderTokens(tokens: ReadonlyArray<Token>): ReactNode {
  return tokens.map((t, i) => (
    <span key={i} className={TOKEN_COLOR[t.kind] ?? TOKEN_COLOR.plain}>
      {t.text}
    </span>
  ));
}

export interface CodeBlockProps {
  readonly code: string;
  readonly lineNumbers?: boolean;
  readonly copy?: boolean;
  readonly className?: string;
  readonly maxHeight?: number;
}

export function CodeBlock({ code, lineNumbers, copy, className, maxHeight }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.split('\n'), [code]);
  const tokenized = useMemo(() => lines.map(tokenizeLine), [lines]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.08] bg-black/45 backdrop-blur-xl',
        className,
      )}
    >
      {copy && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.045] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/25 hover:text-white"
          aria-label="Copy code"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      <pre
        className="overflow-auto p-4 font-mono text-[12px] leading-relaxed"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {lineNumbers ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-4">
            <div aria-hidden="true" className="select-none text-right text-slate-600">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <code className="text-slate-300">
              {tokenized.map((tokens, i) => (
                <div key={i}>{renderTokens(tokens)}</div>
              ))}
            </code>
          </div>
        ) : (
          <code className="text-slate-300">
            {tokenized.map((tokens, i) => (
              <div key={i}>{renderTokens(tokens)}</div>
            ))}
          </code>
        )}
      </pre>
    </div>
  );
}
