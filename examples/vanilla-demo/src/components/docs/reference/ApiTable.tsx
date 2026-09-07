import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { KindBadges } from '../primitives/Pill';
import type { GlobeKind } from '@your-globe/core';

export interface ApiColumn {
  readonly key: string;
  readonly label: string;
  readonly className?: string;
}

export interface ApiRow {
  /** Anchor id for deep links (`#prop-autoRotate`). */
  readonly id?: string;
  readonly cells: Readonly<Record<string, ReactNode>>;
}

export interface ApiTableProps {
  readonly columns: ReadonlyArray<ApiColumn>;
  readonly rows: ReadonlyArray<ApiRow>;
  readonly caption?: string;
  readonly className?: string;
}

/** The generic reference table. PropsTable, EventsTable and MethodsTable are presets over it. */
export function ApiTable({ columns, rows, caption, className }: ApiTableProps) {
  return (
    <div className={cn('docs-table-wrap', className)}>
      <table className="docs-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.className}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} id={r.id}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {r.cells[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const anchorId = (prefix: string, name: string): string => `${prefix}-${name.replace(/[^a-zA-Z0-9]+/g, '-')}`;

export interface PropRow {
  readonly name: string;
  /** Anchor id; defaults to `prop-<name>`. */
  readonly id?: string;
  readonly type: ReactNode;
  readonly default?: string;
  readonly description: ReactNode;
  readonly required?: boolean;
  readonly since?: string;
  readonly deprecated?: string;
  readonly kinds?: ReadonlyArray<GlobeKind> | 'all';
}

/** Config keys and component props: name, type, default, description. */
export function PropsTable({ rows, caption, className }: { readonly rows: ReadonlyArray<PropRow>; readonly caption?: string; readonly className?: string }) {
  return (
    <ApiTable
      caption={caption}
      className={className}
      columns={[
        { key: 'name', label: 'Name', className: 'docs-col-name' },
        { key: 'type', label: 'Type', className: 'docs-col-type' },
        { key: 'default', label: 'Default', className: 'docs-col-default' },
        { key: 'description', label: 'Description' },
      ]}
      rows={rows.map((r) => ({
        id: r.id ?? anchorId('prop', r.name),
        cells: {
          name: (
            <span className="docs-prop-name">
              <code>{r.name}</code>
              {r.required && <span className="docs-req">required</span>}
              {r.since && <span className="docs-since">{r.since}</span>}
              {r.deprecated && (
                <span className="docs-since" title={r.deprecated}>
                  deprecated
                </span>
              )}
            </span>
          ),
          type: <code className="docs-type">{r.type}</code>,
          default: r.default !== undefined ? <code className="docs-default">{r.default}</code> : <span className="docs-dash">—</span>,
          description: (
            <>
              {r.description}
              {r.kinds && <div className="mt-2"><KindBadges kinds={r.kinds} /></div>}
            </>
          ),
        },
      }))}
    />
  );
}

export interface EventRow {
  readonly name: string;
  readonly payload: string;
  readonly description: ReactNode;
}

export function EventsTable({ rows, className }: { readonly rows: ReadonlyArray<EventRow>; readonly className?: string }) {
  return (
    <ApiTable
      className={className}
      caption="Events"
      columns={[
        { key: 'name', label: 'Event', className: 'docs-col-name' },
        { key: 'payload', label: 'Payload', className: 'docs-col-type' },
        { key: 'description', label: 'Description' },
      ]}
      rows={rows.map((r) => ({
        id: anchorId('event', r.name),
        cells: {
          name: <code>{r.name}</code>,
          payload: <code className="docs-type">{r.payload}</code>,
          description: r.description,
        },
      }))}
    />
  );
}

export interface MethodRow {
  readonly name: string;
  readonly signature: string;
  readonly description: ReactNode;
}

export function MethodsTable({ rows, className }: { readonly rows: ReadonlyArray<MethodRow>; readonly className?: string }) {
  return (
    <ApiTable
      className={className}
      caption="Methods"
      columns={[
        { key: 'signature', label: 'Method', className: 'docs-col-sig' },
        { key: 'description', label: 'Description' },
      ]}
      rows={rows.map((r) => ({
        id: anchorId('method', r.name),
        cells: {
          signature: <code className="docs-sig">{r.signature}</code>,
          description: r.description,
        },
      }))}
    />
  );
}
