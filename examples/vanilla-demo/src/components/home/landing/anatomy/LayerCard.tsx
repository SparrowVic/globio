import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { GlobeKind } from '@your-globe/core';
import { KIND_ACCENT } from '../data/kind-themes';

const KINDS: ReadonlyArray<GlobeKind> = [
  'cinematic',
  'outline',
  'dotted',
  'wireframe',
  'hologram',
  'paper',
];

export interface LayerCardProps {
  readonly name: string;
  readonly contract: string;
  readonly icon: IconDefinition;
  readonly accent: string;
}

/**
 * One layer card in the 3×3 anatomy grid. Each card declares the layer's
 * canonical name, its one-line contract, and the universal indicator
 * "native in {kind dots}" — every kind implements every canonical
 * layer, just in its own renderer.
 */
export function LayerCard({ name, contract, icon, accent }: LayerCardProps) {
  return (
    <Link
      to={`/studio?layer=${name}`}
      className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.18]"
    >
      <span
        className="mb-4 flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30"
        style={{ color: accent }}
      >
        <FontAwesomeIcon icon={icon} className="size-5" />
      </span>
      <div className="font-mono text-base font-semibold text-white">{name}</div>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{contract}</p>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">native in</span>
        <div className="flex gap-1.5">
          {KINDS.map((k) => (
            <span
              key={k}
              className="size-1.5 rounded-full"
              style={{
                background: KIND_ACCENT[k],
                boxShadow: `0 0 8px ${KIND_ACCENT[k]}`,
              }}
              title={k}
            />
          ))}
        </div>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 30% 0%, ${accent}1f, transparent 60%)` }}
      />
    </Link>
  );
}
