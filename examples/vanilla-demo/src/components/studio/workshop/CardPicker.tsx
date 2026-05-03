import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/sharp-solid-svg-icons';

import { cn } from '@/lib/utils';
import type { ConfiguratorState } from '@/configurator/types';

import {
  configuratorMeta,
  type ConfiguratorId,
  type ConfiguratorMeta,
} from './configurators';
import { CardPreview } from './card-previews';

export interface CardPickerProps {
  readonly state: ConfiguratorState;
  readonly onPick: (id: ConfiguratorId) => void;
}

/**
 * The Workshop's "home" view — pick a configurator to dive into. Renders
 * each entry from `configuratorMeta` as a richly-decorated card with:
 *
 *   - cursor-following spotlight tinted in the configurator's accent
 *   - a per-configurator animated mini-preview (CSS / SVG, see card-previews.tsx)
 *   - live status pill ("halo · 200ms" / "off" / "preview")
 *   - chevron cue + 3D tilt that tracks the cursor
 *   - stagger entrance (40ms per card)
 *
 * Layout adapts: 1 col on mobile, 2 on tablet, 3 on desktop, 4 on large
 * screens. The grid breathes — 32px gap, generous padding inside cards
 * — so the workshop feels like a curated catalogue, not a packed list.
 */
export function CardPicker({ state, onPick }: CardPickerProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 sm:px-10">
      {/* Hero copy — sets the mode's intent */}
      <div className="mb-10 max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/[0.06] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-amber-200/90">
          <span className="size-1 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]" />
          Workshop
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Pick a configurator to focus on.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
          Each subject opens a focused workspace with a dedicated preview globe
          tuned to show off exactly what the knobs do — so you can see the
          effect before committing to your main composition.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {configuratorMeta.map((meta, idx) => (
          <ConfiguratorCard
            key={meta.id}
            meta={meta}
            status={meta.status(state)}
            delay={idx * 40}
            onPick={() => onPick(meta.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── CARD ───────────────────────── */

function ConfiguratorCard({
  meta,
  status,
  delay,
  onPick,
}: {
  readonly meta: ConfiguratorMeta;
  readonly status: string;
  readonly delay: number;
  readonly onPick: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const onMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  // Tilt + content parallax — same proven recipe as InteractiveCard.
  const x = coords?.x ?? 0.5;
  const y = coords?.y ?? 0.5;
  const tiltX = (0.5 - y) * 6;
  const tiltY = (x - 0.5) * 6;
  const innerShiftX = (x - 0.5) * 12;
  const innerShiftY = (y - 0.5) * 8;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onPick}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCoords(null);
      }}
      className={cn(
        'group relative isolate flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl text-left',
        'border border-white/[0.08] bg-[#06080f]/85 backdrop-blur-md',
        'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]',
        'transition-[border-color,box-shadow] duration-500',
        'hover:border-white/[0.18]',
        '[animation:cardEnter_500ms_ease-out_both]',
      )}
      style={{
        animationDelay: `${delay}ms`,
        transform: hovered
          ? `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : 'perspective(900px) rotateX(0) rotateY(0)',
        transition: hovered ? 'transform 80ms ease-out' : 'transform 500ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Cursor spotlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(360px circle at ${x * 100}% ${y * 100}%, ${meta.accent}26, transparent 55%)`,
        }}
      />

      {/* Preview frame — 144px tall, dedicated bg, mini animation inside */}
      <div className="relative z-10 m-3 mb-0 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#02040a]/85">
        <CardPreview id={meta.id} accent={meta.accent} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: 'linear-gradient(0deg, rgba(2,4,10,0.8) 0%, transparent 100%)' }}
        />
      </div>

      {/* Body */}
      <div
        className="relative z-10 flex h-full flex-col p-5 transition-transform duration-200 ease-out"
        style={{
          transform: hovered ? `translate3d(${innerShiftX}px, ${innerShiftY}px, 0)` : undefined,
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <span
            className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] transition-transform duration-300 group-hover:scale-110"
            style={{ boxShadow: `0 0 22px -8px ${meta.accent}66` }}
          >
            <FontAwesomeIcon icon={meta.icon} className="size-4" style={{ color: meta.accent }} />
          </span>
          <span
            className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{
              borderColor: `${meta.accent}33`,
              color: `${meta.accent}cc`,
              backgroundColor: `${meta.accent}10`,
            }}
          >
            {status}
          </span>
        </div>

        <h3 className="relative inline-block text-lg font-semibold tracking-tight text-white">
          {meta.name}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-px transition-all duration-500"
            style={{
              width: hovered ? '100%' : '0%',
              background: `linear-gradient(90deg, ${meta.accent}, transparent)`,
            }}
          />
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{meta.description}</p>

        <div className="mt-auto flex items-center gap-2 pt-4 text-xs">
          <span
            className="font-medium text-slate-300 transition-colors group-hover:text-white"
            style={hovered ? { color: meta.accent } : undefined}
          >
            Open workspace
          </span>
          <span
            className="flex size-5 items-center justify-center rounded-full border bg-white/[0.04] transition-all duration-300"
            style={{
              transform: hovered ? 'translate(3px, 0)' : 'translate(0,0)',
              borderColor: hovered ? `${meta.accent}55` : 'rgba(255,255,255,0.1)',
            }}
          >
            <FontAwesomeIcon icon={faArrowRight} className="size-2.5 text-slate-300" />
          </span>
        </div>
      </div>

      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
}
