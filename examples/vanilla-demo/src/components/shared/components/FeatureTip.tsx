import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { HoverCard } from 'radix-ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faCircleQuestion } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeKind } from '@your-globe/core';
import { KIND_THEMES } from '@/components/home/landing/data/kind-themes';
import { DocText } from '@/components/docs/primitives/DocText';
import { findEntry, loadApi } from '@/docs/api';
import { featureForConfigPath, getFeature, type FeatureDoc } from '@/docs/features';
import type { ApiEntry } from '@/docs/generated/api-types';
import { pageHref } from '@/docs/manifest';
import { cn } from '@/lib/utils';
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
    const owner = featureForConfigPath(configPath);
    if (owner) return owner;
  }
  return scopeFeature ? getFeature(scopeFeature) : undefined;
};

export interface FeatureTipProps {
  readonly feature: FeatureDoc;
  /** The config key this control edits; adds the type, default and JSDoc line. */
  readonly configPath?: string | undefined;
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
export function FeatureTip({ feature, configPath, label, note, className }: FeatureTipProps) {
  const [open, setOpen] = useState(false);
  return (
    <HoverCard.Root openDelay={180} closeDelay={140} open={open} onOpenChange={setOpen}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          className={cn('feature-tip-glyph', className)}
          aria-label={`About ${label ?? feature.title}`}
          onClick={() => setOpen((v) => !v)}
        >
          <FontAwesomeIcon icon={faCircleQuestion} className="size-3" />
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="left" align="start" sideOffset={10} collisionPadding={12} className="feature-tip">
          {open && <FeatureTipBody feature={feature} configPath={configPath} note={note} />}
          <HoverCard.Arrow className="feature-tip-arrow" width={12} height={6} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function FeatureTipBody({ feature, configPath, note }: { readonly feature: FeatureDoc; readonly configPath?: string | undefined; readonly note?: ReactNode }) {
  const [entry, setEntry] = useState<ApiEntry | null | undefined>(undefined);
  const Tip = useMemo(() => lazyTip(feature), [feature]);

  useEffect(() => {
    if (!configPath) {
      setEntry(null);
      return undefined;
    }
    let alive = true;
    void loadApi().then((api) => {
      if (alive) setEntry(findEntry(api.config, configPath) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [configPath]);

  const href = pageHref(feature.docs.slug) + (feature.docs.anchor ? `#${feature.docs.anchor}` : '');
  const kinds = feature.kinds === 'all' ? null : feature.kinds;

  return (
    <div className="feature-tip-body">
      <div className="feature-tip-head">
        <span className="feature-tip-title">{feature.title}</span>
        {kinds ? (
          <span className="feature-tip-kinds" title={kinds.map((k) => kindLabel[k]).join(', ')}>
            {kinds.map((k) => (
              <span key={k} className="feature-tip-kind" style={{ background: KIND_THEMES[k][0]?.swatch ?? '#8a94a6' }} />
            ))}
          </span>
        ) : (
          <span className="feature-tip-all">all kinds</span>
        )}
      </div>
      <p className="feature-tip-summary">{feature.summary}</p>
      {note && <p className="feature-tip-note">{note}</p>}
      {configPath && (
        <div className="feature-tip-key">
          <code className="feature-tip-path">{configPath}</code>
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
        <Suspense fallback={<div className="feature-tip-illustration" aria-busy="true" />}>
          <div className="feature-tip-illustration">
            <Tip />
          </div>
        </Suspense>
      )}
      <a href={href} target="_blank" rel="noreferrer" className="feature-tip-link">
        Read in the docs
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="size-2.5" />
      </a>
    </div>
  );
}
