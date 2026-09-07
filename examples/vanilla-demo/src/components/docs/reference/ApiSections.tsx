import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { findEntry, loadApi, useApi } from '@/docs/api';
import { featureForEvent, featureForMethod } from '@/docs/features';
import type { ApiEntry } from '@/docs/generated/api-types';
import { pageHref } from '@/docs/manifest';
import { DocText } from '../primitives/DocText';
import { EventsTable, MethodsTable } from './ApiTable';
import { ConfigTree } from './ConfigTree';
import { TypeReference } from './TypeReference';

/** Placeholder rows while `api.json` loads. */
export function ApiLoading() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadApi().catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  if (failed) return <p role="alert">The API reference could not load. Reload this page to try again.</p>;
  return <div className="docs-api-loading" aria-busy="true" />;
}

export interface ConfigKeysProps {
  /** Dot path of the entry whose members to show; omit for the top level. */
  readonly path?: string;
  /** Show only these child names. */
  readonly only?: ReadonlyArray<string>;
  readonly nested?: boolean;
  readonly linkFor?: (entry: ApiEntry) => string | undefined;
  /** Intro text from the JSDoc of the entry itself. Default true. */
  readonly intro?: boolean;
  readonly children?: ReactNode;
}

/** The members of one config section, straight from the types. */
export function ConfigKeys({ path, only, nested = true, linkFor, intro = true, children }: ConfigKeysProps) {
  const api = useApi();
  if (!api) return <ApiLoading />;
  const entry = path ? findEntry(api.config, path) : undefined;
  let entries: ReadonlyArray<ApiEntry> = path ? entry?.children ?? [] : api.config;
  if (only) entries = entries.filter((e) => only.includes(e.name));
  return (
    <>
      {intro && entry?.description && <DocText text={entry.description} />}
      {children}
      <ConfigTree entries={entries} nested={nested} linkFor={linkFor} />
    </>
  );
}

const guideLink = (slug: string, anchor: string | undefined, title: string) => (
  <span className="docs-row-note">
    <Link to={pageHref(slug) + (anchor ? `#${anchor}` : '')}>Guide: {title}</Link>
  </span>
);

/** Instance methods by name, in the order given, with their JSDoc. */
export function Methods({ names, guide = true }: { readonly names: ReadonlyArray<string>; readonly guide?: boolean }) {
  const api = useApi();
  if (!api) return <ApiLoading />;
  const rows = names
    .map((n) => api.instance.find((m) => m.name === n))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => {
      const feature = featureForMethod(m.name);
      return {
        name: m.name,
        signature: m.signature,
        description: (
          <>
            {m.description ? <DocText text={m.description} inline /> : feature?.summary ?? ''}
            {guide && feature && guideLink(feature.docs.slug, feature.docs.anchor, feature.title)}
          </>
        ),
      };
    });
  return <MethodsTable rows={rows} />;
}

/** Events by name (all when omitted), with their JSDoc. */
export function Events({ names, guide = true }: { readonly names?: ReadonlyArray<string>; readonly guide?: boolean }) {
  const api = useApi();
  if (!api) return <ApiLoading />;
  const list = names ? names.map((n) => api.events.find((e) => e.name === n)).filter((e): e is NonNullable<typeof e> => Boolean(e)) : api.events;
  const rows = list.map((e) => {
    const feature = featureForEvent(e.name);
    return {
      name: e.name,
      payload: e.payload,
      description: (
        <>
          {e.description ? <DocText text={e.description} inline /> : feature?.summary ?? ''}
          {guide && feature && guideLink(feature.docs.slug, feature.docs.anchor, feature.title)}
        </>
      ),
    };
  });
  return <EventsTable rows={rows} />;
}

/** Named types, one subsection each. */
export function Types({ names }: { readonly names: ReadonlyArray<string> }) {
  const api = useApi();
  if (!api) return <ApiLoading />;
  return (
    <>
      {names.map((n) => {
        const t = api.types[n];
        return t ? <TypeReference key={n} type={t} /> : null;
      })}
    </>
  );
}
