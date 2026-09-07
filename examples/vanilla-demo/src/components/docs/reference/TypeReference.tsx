import type { ApiType } from '@/docs/generated/api-types';
import { DocText } from '../primitives/DocText';
import { DocSubsection } from '../primitives/DocSection';
import { Pill } from '../primitives/Pill';
import { ConfigTree } from './ConfigTree';
import { Signature } from './Signature';

export interface TypeReferenceProps {
  readonly type: ApiType;
  /** Render as an h3 subsection (default) or without a heading. */
  readonly heading?: boolean;
}

/** One named type from `api.json`: an interface as a members table, an alias as its definition. */
export function TypeReference({ type, heading = true }: TypeReferenceProps) {
  const body =
    type.kind === 'interface' ? (
      <>
        {type.extends.length > 0 && (
          <p className="docs-type-extends">
            extends{' '}
            {type.extends.map((e) => (
              <Pill key={e}>{e}</Pill>
            ))}
          </p>
        )}
        {type.description && <DocText text={type.description} />}
        <ConfigTree entries={type.members} nested guideLinks={false} depth={1} anchorPrefix={`type-${type.name}`} />
      </>
    ) : (
      <>
        {type.description && <DocText text={type.description} />}
        <Signature code={`type ${type.name} = ${type.type}`} />
      </>
    );
  if (!heading) return body;
  return (
    <DocSubsection id={`type-${type.name}`} title={type.name}>
      {body}
    </DocSubsection>
  );
}
