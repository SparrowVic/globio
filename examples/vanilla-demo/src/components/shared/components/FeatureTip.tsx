import { Component, Suspense, lazy, useEffect, useId, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Popover } from 'radix-ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faCircleQuestion } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind } from '@your-globe/core';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { DocText } from '@/components/docs/primitives/DocText';
import { loadApi } from '@/docs/api';
import { featureForConfigPath, getFeature, type FeatureDoc } from '@/docs/features';
import type { ApiEntry } from '@/docs/generated/api-types';
import { pageHref } from '@/docs/manifest';
import { cn } from '@/lib/utils';
import { findConfigTipEntry, findTypeTipEntry } from './feature-tip-data';
import './feature-tip.css';

export interface ResolveFeatureInput {
  readonly feature?: string | undefined;
  readonly configPath?: string | undefined;
  readonly scopeFeature?: string | undefined;
}

/** Explicit id first, then the owner of the config path, then the enclosing scope. */
export const resolveFeature = ({ feature, configPath, scopeFeature }: ResolveFeatureInput): FeatureDoc | undefined => {
  if (feature) return getFeature(feature);
  if (configPath) {
    const owner = featureForConfigPath(configPath.replace(/\[\]/g, ''));
    if (owner) return owner;
  }
  return scopeFeature ? getFeature(scopeFeature) : undefined;
};

export interface FeatureTipProps {
  readonly feature: FeatureDoc;
  /** The config key this control edits; adds the type, default and JSDoc line. */
  readonly configPath?: string | undefined;
  /** A public type field edited through an imperative API rather than GlobeConfig. */
  readonly typePath?: string | undefined;
  /** The control's own label, for the accessible name of the glyph. */
  readonly label?: string | undefined;
  /** Control-specific hint shown under the summary. */
  readonly note?: ReactNode;
  readonly className?: string | undefined;
}

const tipCache = new Map<string, ComponentType>();

const lazyTip = (feature: FeatureDoc): ComponentType | null => {
  const loader = feature.tip;
  if (!loader) return null;
  const cached = tipCache.get(feature.id);
  if (cached) return cached;
  const Tip = lazy(loader);
  tipCache.set(feature.id, Tip);
  return Tip;
};

const kindLabel: Readonly<Record<GlobeKind, string>> = {
  cinematic: 'Cinematic',
  outline: 'Outline',
  dotted: 'Dotted',
  wireframe: 'Wireframe',
  hologram: 'Hologram',
  paper: 'Paper',
};

/**
 * The `?` next to a Studio control. Hover or focus opens a card with the
 * feature's summary, the config key with its type and default straight
 * from the types, an optional illustrated tip, and a link into the docs.
 */
export function FeatureTip({ feature, configPath, typePath, label, note, className }: FeatureTipProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const clearTimer = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  const closeAfterDelay = () => {
    clearTimer();
    timer.current = setTimeout(() => {
      const active = document.activeElement;
      if (active !== trigger.current && !content.current?.contains(active)) setOpen(false);
    }, 140);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          className={cn('feature-tip-glyph', className)}
          aria-label={`About ${label ?? feature.title}`}
          onPointerEnter={(event) => {
            if (event.pointerType === 'touch') return;
            clearTimer();
            timer.current = setTimeout(() => setOpen(true), 180);
          }}
          onPointerLeave={closeAfterDelay}
          onFocus={() => { clearTimer(); setOpen(true); }}
          onClick={(event) => {
            // Focus/hover may already have opened the card. Keep the first
            // activation open and move into its documentation link.
            event.preventDefault();
            clearTimer();
            setOpen(true);
            requestAnimationFrame(() => content.current?.querySelector('a')?.focus());
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              clearTimer();
              setOpen(false);
            } else if ((event.key === 'Tab' && !event.shiftKey && open) || event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() => content.current?.querySelector('a')?.focus());
            }
          }}
        >
          <FontAwesomeIcon icon={faCircleQuestion} className="size-3" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={content}
          side="left" align="start" sideOffset={10} collisionPadding={12} className="feature-tip"
          aria-labelledby={titleId}
          onPointerEnter={clearTimer}
          onPointerLeave={closeAfterDelay}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={() => { clearTimer(); trigger.current?.focus(); }}
        >
          {open && <FeatureTipBody key={`${feature.id}:${configPath ?? typePath ?? ''}`} feature={feature} configPath={configPath} typePath={typePath} note={note} titleId={titleId} />}
          <Popover.Arrow className="feature-tip-arrow" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FeatureTipBody({ feature, configPath, typePath, note, titleId }: Pick<FeatureTipProps, 'feature' | 'configPath' | 'typePath' | 'note'> & { readonly titleId: string }) {
  const [entry, setEntry] = useState<ApiEntry | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const Tip = useMemo(() => lazyTip(feature), [feature]);

  useEffect(() => {
    if (!configPath && !typePath) {
      setEntry(null);
      return undefined;
    }
    let alive = true;
    void loadApi().then((api) => {
      if (alive) setEntry((configPath ? findConfigTipEntry(api, configPath) : findTypeTipEntry(api, typePath!)) ?? null);
    }).catch(() => {
      if (alive) { setEntry(null); setLoadFailed(true); }
    });
    return () => {
      alive = false;
    };
  }, [configPath, typePath]);

  const href = pageHref(feature.docs.slug) + (feature.docs.anchor ? `#${feature.docs.anchor}` : '');
  const kinds = feature.kinds === 'all' ? null : feature.kinds;

  return (
    <div className="feature-tip-body">
      <div className="feature-tip-head">
        <span id={titleId} className="feature-tip-title">{feature.title}</span>
        {kinds ? (
          <span className="feature-tip-kinds" aria-label={`Available in ${kinds.map((k) => kindLabel[k]).join(', ')}`} title={kinds.map((k) => kindLabel[k]).join(', ')}>
            {kinds.map((k) => (
              <span key={k} aria-hidden="true" className="feature-tip-kind" style={{ background: KIND_THEMES[k][0]?.swatch ?? '#8a94a6' }} />
            ))}
          </span>
        ) : (
          <span className="feature-tip-all">all kinds</span>
        )}
      </div>
      {!entry?.description && <p className="feature-tip-summary">{feature.summary}</p>}
      {note && note !== feature.summary && note !== entry?.description && <div className="feature-tip-note">{note}</div>}
      {(configPath || typePath) && (
        <div className="feature-tip-key" aria-busy={entry === undefined}>
          <code className="feature-tip-path">{configPath ?? typePath}</code>
          {loadFailed && <span className="feature-tip-doc">Reference details could not load. Open the docs below to read them.</span>}
          {entry && (
            <>
              <span className="feature-tip-type">
                {entry.type}
                {entry.default !== undefined && (
                  <>
                    {' · '}default <code>{entry.default}</code>
                  </>
                )}
              </span>
              {entry.description && (
                <div className="feature-tip-doc">
                  <DocText text={entry.description} />
                </div>
              )}
            </>
          )}
        </div>
      )}
      {Tip && (
        <IllustrationBoundary>
          <Suspense fallback={<div className="feature-tip-illustration" aria-busy="true" />}>
            <div className="feature-tip-illustration"><Tip /></div>
          </Suspense>
        </IllustrationBoundary>
      )}
      <a href={href} target="_blank" rel="noreferrer" className="feature-tip-link">
        Read in the docs
        <span className="sr-only"> (opens in a new tab)</span>
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="size-2.5" />
      </a>
    </div>
  );
}

/** Optional artwork must never take down the Studio if its chunk fails to load. */
class IllustrationBoundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}
