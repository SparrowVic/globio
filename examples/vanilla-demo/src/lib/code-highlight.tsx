import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Regex tokenizer shared by every code surface in the demo (landing code
 * cards, docs code panels). It is deliberately small: enough colour for
 * TypeScript, JSX/Vue templates and Angular decorators to read well, no
 * grammar to maintain.
 */
const TOKEN_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g, 'comment'],
  [/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, 'string'],
  [/(@[A-Z][A-Za-z]*)\b/g, 'decorator'],
  [
    /\b(import|from|export|const|let|var|function|return|type|interface|true|false|null|undefined|new|class|extends|implements|if|else|for|while|await|async|of|in|as|default|readonly)\b/g,
    'keyword',
  ],
  [
    /\b(GlobeConfig|GlobeInstance|GlobeKind|ThemePresetName|ScaleConfig|StoryConfig|MarkerConfig|ArcConfig|CountryEvent|Component|Globe|VueGlobe|GlobeComponent|GlobeHandle)\b/g,
    'type',
  ],
  [/(<\/?[a-zA-Z][\w.-]*|\/?>)/g, 'tag'],
  [/\b(\d+(?:\.\d+)?)\b/g, 'number'],
];

const TOKEN_COLOR: Readonly<Record<string, string>> = {
  keyword: 'text-[#9fc7ff]',
  string: 'text-[#ffb98f]',
  comment: 'text-[#6b7686] italic',
  number: 'text-[#c9d6ff]',
  type: 'text-[#e6c8ff]',
  decorator: 'text-[#e6c8ff]',
  tag: 'text-[#8fd6c7]',
  plain: 'text-[#c8d4e6]',
};

export interface CodeToken {
  readonly kind: string;
  readonly text: string;
}

export function tokenizeLine(line: string): ReadonlyArray<CodeToken> {
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
  const tokens: CodeToken[] = [];
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

function renderTokens(tokens: ReadonlyArray<CodeToken>): ReactNode {
  return tokens.map((t, i) => (
    <span key={i} className={TOKEN_COLOR[t.kind] ?? TOKEN_COLOR.plain}>
      {t.text}
    </span>
  ));
}

export interface HighlightedCodeProps {
  readonly code: string;
  /** Show a gutter with line numbers. Default true. */
  readonly lineNumbers?: boolean;
  /** 1-based line numbers to emphasise (the rest dims slightly). */
  readonly highlightLines?: ReadonlyArray<number>;
  readonly maxHeight?: number;
  readonly className?: string;
}

/**
 * The `<pre>` body of a code surface: tokenised lines, optional gutter and
 * highlighted rows. Headers, tabs and copy buttons belong to the caller.
 */
export function HighlightedCode({ code, lineNumbers = true, highlightLines, maxHeight, className }: HighlightedCodeProps) {
  const lines = useMemo(() => code.split('\n'), [code]);
  const tokenized = useMemo(() => lines.map(tokenizeLine), [lines]);
  const emphasised = highlightLines && highlightLines.length > 0 ? new Set(highlightLines) : null;

  const rowClass = (i: number) =>
    cn('code-line', emphasised && (emphasised.has(i + 1) ? 'is-hl' : 'is-dim'));

  return (
    <pre
      className={cn('overflow-auto p-4 font-mono text-[12.5px] leading-[1.7]', className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {lineNumbers ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-5">
          <div aria-hidden="true" className="select-none text-right text-[#3d4655]">
            {lines.map((_, i) => (
              <div key={i} className={rowClass(i)}>
                {i + 1}
              </div>
            ))}
          </div>
          <code>
            {tokenized.map((tokens, i) => (
              <div key={i} className={rowClass(i)}>
                {renderTokens(tokens)}
              </div>
            ))}
          </code>
        </div>
      ) : (
        <code>
          {tokenized.map((tokens, i) => (
            <div key={i} className={rowClass(i)}>
              {renderTokens(tokens)}
            </div>
          ))}
        </code>
      )}
    </pre>
  );
}
