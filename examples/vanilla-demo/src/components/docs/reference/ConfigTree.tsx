import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { GlobeKind } from '@your-globe/core';
import { configAnchor, countKeys } from '@/docs/api';
import { featureForConfigPath } from '@/docs/features';
import type { ApiEntry } from '@/docs/generated/api-types';
import { pageHref } from '@/docs/manifest';
import { DocText } from '../primitives/DocText';
import { DocSubsection } from '../primitives/DocSection';
import { PropsTable, type PropRow } from './ApiTable';

export interface ConfigTreeProps {
  readonly entries: ReadonlyArray<ApiEntry>;
  /** Render the members of object-typed entries as nested tables below this one. */
  readonly nested?: boolean;
  /** Entries whose subtree is documented elsewhere: show a link instead of expanding. */
  readonly linkFor?: (entry: ApiEntry) => string | undefined;
  /** Show the Guide link derived from the feature registry. Default true. */
  readonly guideLinks?: boolean;
  /** Nesting depth of `entries`, for heading levels. */
  readonly depth?: number;
  readonly className?: string;
}

const isGlobeKind = (k: string): k is GlobeKind => ['cinematic', 'outline', 'dotted', 'wireframe', 'hologram', 'paper'].includes(k);

/** Rows of object-typed keys show only the opening paragraph; the nested table below carries the full text. */
const firstParagraph = (text: string): string => text.split(/\n\s*\n/)[0]?.split('\n- ')[0] ?? text;

/**
 * Tables generated from `api.json`: one row per config key, and a nested
 * table for every key whose type is an object. The description comes from
 * the JSDoc on the type; when a top-level key has none, the feature
 * registry's summary stands in.
 */
export function ConfigTree({ entries, nested = true, linkFor, guideLinks = true, depth = 0, className }: ConfigTreeProps) {
  const here = useLocation().pathname.replace(/^\/docs\/?/, '').replace(/\/+$/, '');
  const rows: PropRow[] = entries.map((e) => {
    const feature = featureForConfigPath(e.path);
    // The registry summary stands in only for the key the feature is about, never for its sub-keys.
    const ownsExactly = feature?.configPaths?.includes(e.path) ?? false;
    const showGuide = guideLinks && feature && depth === 0 && feature.docs.slug !== here;
    const external = linkFor?.(e);
    const rowText = e.children && e.description ? firstParagraph(e.description) : e.description;
    const description: ReactNode = (
      <>
        {rowText ? <DocText text={rowText} inline /> : ownsExactly ? feature?.summary : ''}
        {e.children && (
          <span className="docs-row-note">
            {external ? (
              <Link to={external}>
                {countKeys(e.children)} keys, own page
              </Link>
            ) : nested ? (
              <a href={`#${configAnchor(e.path)}`}>{countKeys(e.children)} keys below</a>
            ) : (
              <span>{countKeys(e.children)} keys</span>
            )}
          </span>
        )}
        {e.items && (
          <span className="docs-row-note">
            array of <code>{e.items}</code>
          </span>
        )}
        {showGuide && feature && (
          <span className="docs-row-note">
            <Link to={pageHref(feature.docs.slug) + (feature.docs.anchor ? `#${feature.docs.anchor}` : '')}>Guide: {feature.title}</Link>
          </span>
        )}
      </>
    );
    const kinds = e.kinds?.filter(isGlobeKind);
    return {
      name: e.name,
      id: `${configAnchor(e.path)}-row`,
      type: e.ref ? <a href={`#${configAnchor(e.path)}`}>{e.ref}</a> : e.type,
      default: e.default,
      description,
      required: !e.optional,
      since: e.since,
      deprecated: e.deprecated,
      kinds: kinds && kinds.length > 0 ? kinds : undefined,
    };
  });

  const groups = nested ? entries.filter((e) => e.children && e.children.length > 0 && !linkFor?.(e)) : [];

  return (
    <div className={className}>
      <PropsTable rows={rows} />
      {groups.map((g) =>
        depth === 0 ? (
          <DocSubsection key={g.path} id={configAnchor(g.path)} title={g.path}>
            {g.description && <DocText text={g.description} />}
            <ConfigTree entries={g.children ?? []} nested linkFor={linkFor} guideLinks={false} depth={depth + 1} />
          </DocSubsection>
        ) : (
          <section key={g.path} id={configAnchor(g.path)} className="docs-nested-group">
            <h4 className="docs-h4">
              <code>{g.path}</code>
            </h4>
            {g.description && <DocText text={g.description} />}
            <ConfigTree entries={g.children ?? []} nested linkFor={linkFor} guideLinks={false} depth={depth + 1} />
          </section>
        ),
      )}
    </div>
  );
}
