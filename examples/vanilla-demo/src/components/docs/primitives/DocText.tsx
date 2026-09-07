import { Fragment, type ReactNode } from 'react';

/**
 * Renders the plain-text descriptions extracted from JSDoc: paragraphs
 * separated by blank lines, `- ` bullet lines as lists, `code` spans and
 * **bold**. Deliberately tiny; anything richer belongs in a TSX page.
 */
export function DocText({ text, inline = false }: { readonly text: string; readonly inline?: boolean }) {
  if (!text) return null;
  if (inline) return <>{renderInline(text.replace(/\s*\n\s*/g, ' '))}</>;
  const blocks = text.split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const bullets = lines.filter((l) => l.startsWith('- '));
        if (bullets.length > 0 && bullets.length === lines.length) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (bullets.length > 0) {
          const lead = lines.filter((l) => !l.startsWith('- ')).join(' ');
          return (
            <Fragment key={i}>
              <p>{renderInline(lead)}</p>
              <ul>
                {bullets.map((l, j) => (
                  <li key={j}>{renderInline(l.slice(2))}</li>
                ))}
              </ul>
            </Fragment>
          );
        }
        return <p key={i}>{renderInline(lines.join(' '))}</p>;
      })}
    </>
  );
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*)/g;

export function renderInline(text: string): ReactNode {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
