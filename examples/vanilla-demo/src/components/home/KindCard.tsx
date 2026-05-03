import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRight } from '@fortawesome/sharp-solid-svg-icons';

import { cn } from '@/lib/utils';

export interface KindCardProps {
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly accent: string;
  readonly preview: ReactNode;
  /**
   * Optional emphasis flag — when true the card spans more grid space
   * and gets the rotating-border treatment to stand out as "featured".
   */
  readonly featured?: boolean;
}

/**
 * Card with three layered micro-interactions:
 *
 *  1. **Cursor spotlight** — a soft radial glow follows the cursor
 *     inside the card. Fades on enter/leave instead of binary toggle.
 *  2. **3D tilt** — the card's transform tracks cursor proximity, like
 *     a physical card lifting toward the cursor. Springs back on leave.
 *  3. **Inner zoom** — the *content* (preview + text) translates
 *     slightly toward the cursor. Lift, not scale — so the silhouette
 *     stays put, only the inner reading order shifts.
 *
 * On top of that: an animated conic-gradient border (only when
 * `featured`) and a per-kind preview slot that hosts whatever animated
 * mini-illustration the kind ships.
 */
export function KindCard({
  index,
  id,
  name,
  tagline,
  accent,
  preview,
  featured = false,
}: KindCardProps) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  // Cursor coords in card-local space (0..1 each axis), null when off-card.
  const [coords, setCoords] = useState<{ readonly x: number; readonly y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const onMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  // Map cursor position to a small parallax & tilt. Falls back to neutral
  // values when the cursor isn't on the card so transitions feel natural.
  const x = coords?.x ?? 0.5;
  const y = coords?.y ?? 0.5;
  const tiltX = (0.5 - y) * 8; // degrees
  const tiltY = (x - 0.5) * 8;
  const innerShiftX = (x - 0.5) * 14; // px
  const innerShiftY = (y - 0.5) * 10;

  const cardStyle: CSSProperties = hovered
    ? {
        transform: `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        transition: 'transform 80ms ease-out',
      }
    : {
        transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)',
        transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
      };

  return (
    <Link
      ref={ref}
      to={`/studio?kind=${id}`}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCoords(null);
      }}
      className={cn(
        'group relative isolate flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl',
        'border border-white/[0.07] bg-[#06080f]/85 backdrop-blur-md',
        'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]',
        'transition-[border-color,box-shadow] duration-500',
        'hover:border-white/[0.18]',
        featured && 'lg:col-span-2',
      )}
      style={{
        ...cardStyle,
        // Featured card hosts the rotating conic border. The CSS uses
        // background-clip + a content layer to keep the border without
        // affecting padding.
        ...(featured
          ? ({
              backgroundImage: `conic-gradient(from var(--border-angle), ${accent}55, transparent 30%, transparent 70%, ${accent}55), linear-gradient(#06080f, #06080f)`,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              borderColor: 'transparent',
            } as CSSProperties)
          : {}),
      }}
    >
      {featured && <span aria-hidden="true" className="animate-border-spin" />}

      {/* Cursor spotlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(380px circle at ${x * 100}% ${y * 100}%, ${accent}26, transparent 55%)`,
        }}
      />

      {/* Soft top sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1/2"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Content layer (subtle parallax inward toward cursor) */}
      <div
        className="relative z-10 flex h-full flex-col p-6 transition-transform duration-200 ease-out"
        style={{
          transform: hovered
            ? `translate3d(${innerShiftX}px, ${innerShiftY}px, 0)`
            : 'translate3d(0,0,0)',
        }}
      >
        {/* Header row */}
        <div className="mb-5 flex items-center justify-between">
          <span
            className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-slate-400"
          >
            {String(index).padStart(2, '0')}
          </span>
          <span
            className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-300"
            style={{
              borderColor: `${accent}33`,
              color: hovered ? accent : `${accent}cc`,
              backgroundColor: hovered ? `${accent}14` : 'transparent',
            }}
          >
            kind
          </span>
        </div>

        {/* Mini preview */}
        <div
          className={cn(
            'relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06]',
            'bg-[#02040a]/80',
          )}
        >
          {preview}
          {/* Bottom fade so preview blends into card */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background:
                'linear-gradient(0deg, rgba(2,4,10,0.8) 0%, transparent 100%)',
            }}
          />
        </div>

        {/* Title + tagline */}
        <div className="mt-5 flex-1">
          <h3 className="relative inline-block text-2xl font-semibold tracking-tight text-white">
            {name}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-px transition-all duration-500"
              style={{
                width: hovered ? '100%' : '0%',
                background: `linear-gradient(90deg, ${accent}, transparent)`,
              }}
            />
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{tagline}</p>
        </div>

        {/* Footer link */}
        <div className="mt-5 flex items-center gap-2 text-xs">
          <span
            className="font-medium text-slate-300 transition-colors duration-300 group-hover:text-white"
            style={{ color: hovered ? accent : undefined }}
          >
            Open in Studio
          </span>
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full border transition-all duration-300',
              'border-white/10 bg-white/[0.04]',
            )}
            style={{
              transform: hovered ? 'translate(2px, -2px)' : 'translate(0,0)',
              borderColor: hovered ? `${accent}55` : undefined,
            }}
          >
            <FontAwesomeIcon icon={faArrowUpRight} className="size-2.5 text-slate-300" />
          </span>
        </div>
      </div>
    </Link>
  );
}
