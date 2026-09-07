import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/sharp-solid-svg-icons';
import { FRAMEWORKS, frameworkMeta, type FrameworkCode, type FrameworkId } from '@/docs/frameworks';
import { HighlightedCode } from '@/lib/code-highlight';
import { cn } from '@/lib/utils';
import { FrameworkSwitch } from './FrameworkSwitch';
import { useFramework } from './framework-context';

export interface CodePanelProps {
  /** One snippet per framework. Missing frameworks get no tab. */
  readonly code: FrameworkCode;
  /** File name per framework; falls back to the framework's default. */
  readonly files?: Partial<Readonly<Record<FrameworkId, string>>>;
  /** Caption under the header, e.g. what the snippet demonstrates. */
  readonly caption?: string;
  readonly lineNumbers?: boolean;
  readonly highlightLines?: ReadonlyArray<number>;
  readonly maxHeight?: number;
  /** Pin the panel to one framework and hide the tabs (framework pages). */
  readonly pinned?: FrameworkId;
  readonly className?: string;
}

/**
 * The docs' code surface: framework tabs synced with the global switch, a
 * file name, copy-to-clipboard and highlighted lines. When the global
 * framework has no snippet here the panel shows the first one it has
 * without touching the global choice.
 */
export function CodePanel({ code, files, caption, lineNumbers = true, highlightLines, maxHeight, pinned, className }: CodePanelProps) {
  const { framework } = useFramework();
  const available = useMemo(() => FRAMEWORKS.map((f) => f.id).filter((id) => code[id] !== undefined), [code]);
  const resolve = (wanted: FrameworkId): FrameworkId | undefined =>
    available.includes(wanted) ? wanted : available[0];

  const [local, setLocal] = useState<FrameworkId | undefined>(() => resolve(pinned ?? framework));
  useEffect(() => {
    setLocal(resolve(pinned ?? framework));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework, pinned, available.join(',')]);

  const [copied, setCopied] = useState(false);
  const active = local ?? available[0];
  const snippet = active ? code[active] ?? '' : '';
  const file = active ? files?.[active] ?? frameworkMeta(active).file : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!active) return null;
  const showTabs = !pinned && available.length > 1;

  return (
    <figure className={cn('docs-code', className)}>
      <div className={cn('docs-code-head', showTabs && 'has-tabs')}>
        {showTabs ? (
          <FrameworkSwitch only={available} value={active} onChange={setLocal} size="sm" />
        ) : (
          <span className="docs-code-file">{file}</span>
        )}
        <div className="docs-code-actions">
          {showTabs && <span className="docs-code-file">{file}</span>}
          <button type="button" onClick={copy} className="docs-copy" aria-label="Copy code">
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3" />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <HighlightedCode code={snippet} lineNumbers={lineNumbers} highlightLines={highlightLines} maxHeight={maxHeight} />
      {caption && <figcaption className="docs-code-caption">{caption}</figcaption>}
    </figure>
  );
}
