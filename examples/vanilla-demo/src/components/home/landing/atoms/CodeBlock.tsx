import { useMemo, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/sharp-solid-svg-icons';
import { cn } from '@/lib/utils';

const TOKEN_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g, 'comment'],
  [/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, 'string'],
  [
    /\b(import|from|export|const|let|var|function|return|type|interface|true|false|null|undefined|new|class|extends|implements|if|else|for|while|await|async|of|in|as|default)\b/g,
    'keyword',
  ],
  [
    /\b(GlobeConfig|GlobeInstance|GlobeKind|ThemePresetName|ScaleConfig|StoryConfig|MarkerConfig|ArcConfig|Component|Globe|VueGlobe|GlobeComponent)\b/g,
    'type',
  ],
  [/\b(\d+(?:\.\d+)?)\b/g, 'number'],
];

const TOKEN_COLOR: Readonly<Record<string, string>> = {
  keyword: 'text-[#9fc7ff]',
  string: 'text-[#ffb98f]',
  comment: 'text-[#6b7686] italic',
  number: 'text-[#c9d6ff]',
  type: 'text-[#e6c8ff]',
  plain: 'text-[#c8d4e6]',
};

interface Token {
  readonly kind: string;
  readonly text: string;
}

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
  if (tokens.length === 0) tokens.push({ kind: 'plain', text: ' ' });
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
  readonly title?: string;
  readonly lineNumbers?: boolean;
  readonly className?: string;
  readonly maxHeight?: number;
}

/** Lightweight highlighted code card with a copy button. */
export function CodeBlock({ code, title, lineNumbers = true, className, maxHeight }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.split('\n'), [code]);
  const tokenized = useMemo(() => lines.map(tokenizeLine), [lines]);

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
      <pre
        className="overflow-auto p-4 font-mono text-[12.5px] leading-[1.7]"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {lineNumbers ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-5">
            <div aria-hidden="true" className="select-none text-right text-[#3d4655]">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <code>
              {tokenized.map((tokens, i) => (
                <div key={i}>{renderTokens(tokens)}</div>
              ))}
            </code>
          </div>
        ) : (
          <code>
            {tokenized.map((tokens, i) => (
              <div key={i}>{renderTokens(tokens)}</div>
            ))}
          </code>
        )}
      </pre>
    </div>
  );
}
