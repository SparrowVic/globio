import type { GlobeKind } from '@your-globe/core';
import { cn } from '@/lib/utils';
import { ALL_KINDS, KindDot, kindLabel } from '../primitives/Pill';

export type Support = boolean | 'partial';

export interface MatrixFeature {
  readonly label: string;
  readonly support: Partial<Readonly<Record<GlobeKind, Support>>>;
  readonly note?: string;
}

export interface SupportMatrixProps {
  readonly features: ReadonlyArray<MatrixFeature>;
  readonly kinds?: ReadonlyArray<GlobeKind>;
  readonly className?: string;
}

/** Feature × kind grid. A filled dot is full support, a ring is partial, a dash is none. */
export function SupportMatrix({ features, kinds = ALL_KINDS, className }: SupportMatrixProps) {
  return (
    <div className={cn('docs-table-wrap', className)}>
      <table className="docs-table docs-matrix">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            {kinds.map((k) => (
              <th key={k} scope="col" className="docs-matrix-kind">
                <KindDot kind={k} />
                <span>{kindLabel(k)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.label}>
              <th scope="row">
                {f.label}
                {f.note && <span className="docs-matrix-note">{f.note}</span>}
              </th>
              {kinds.map((k) => {
                const s = f.support[k] ?? false;
                return (
                  <td key={k} className="docs-matrix-cell">
                    <span
                      className={cn('docs-matrix-mark', s === true && 'is-full', s === 'partial' && 'is-partial')}
                      aria-label={s === true ? 'supported' : s === 'partial' ? 'partial' : 'not supported'}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
