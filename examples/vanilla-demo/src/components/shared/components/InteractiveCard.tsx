import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRight } from '@fortawesome/sharp-solid-svg-icons';

import { cn } from '@/lib/utils';

export interface InteractiveCardProps {
  /** Render as a `<Link>` with `to`. Mutually exclusive with `href` / `onClick`. */
  readonly to?: string;
  /** Render as `<a href>` (e.g. for external links). */
  readonly href?: string;
  /** Render as a `<div onClick>` when neither `to` nor `href` is provided. */
  readonly onClick?: () => void;
  /**
   * Accent color used by the cursor spotlight, the hover-revealed title
   * underline, the trailing-badge ring, and the chevron coloration.
   * Default `#fbbf24` (amber).
   */
  readonly accent?: string;
  /**
   * Featured cards add a rotating conic-gradient border (driven by the
   * `--border-angle` Houdini @property + `border-spin` keyframes from
   * the demo's index.css). Use sparingly — the rotation draws the eye.
   */
  readonly featured?: boolean;
  /** Optional small badge in the upper-left — usually a position number. */
  readonly leadingBadge?: ReactNode;
  /** Optional small badge in the upper-right — e.g. category / tag. */
  readonly trailingBadge?: ReactNode;
  /**
   * Visual preview slot. Filled with whatever animated SVG / image / mini
   * canvas best represents what this card is about. Sits in a fixed-height
   * (128px) framed container with bottom-fade.
   */
  readonly preview?: ReactNode;
  readonly title: string;
  readonly tagline?: string;
  /** Footer text (default `"Open"`). The chevron after it is fixed. */
  readonly footerText?: string;
  /**
   * Tilt strength multiplier (1 ≈ ±8°). 0 disables tilt entirely. Useful
   * when the card sits in a busy layout where you want to keep the
   * cursor-spotlight feedback but ditch the perspective.
   */
  readonly tiltStrength?: number;
  /** Cursor spotlight radius in pixels. Default 380. */
  readonly spotlightRadius?: number;
  /** Container className (sizing / span-class / margin overrides). */
  readonly className?: string;
}

/**
 * Card with three layered micro-interactions:
 *
 *  1. **Cursor spotlight** — soft radial glow follows the cursor inside
 *     the card. Fades on enter / leave.
 *  2. **3D tilt** — card transform tracks cursor proximity (perspective
 *     900px, ±8° max). Springs back on leave.
 *  3. **Inner parallax** — content layer translates slightly toward the
 *     cursor; silhouette stays put, only the inner reading order shifts.
 *
 * Plus an optional rotating conic-border for `featured` cards and slots
 * for badges, preview, and footer chrome. Renders as `<Link>`, `<a>`, or
 * `<div onClick>` depending on which navigation prop the caller passes.
 */
export function InteractiveCard({
  to,
  href,
  onClick,
  accent = '#fbbf24',
  featured = false,
  leadingBadge,
  trailingBadge,
  preview,
  title,
  tagline,
  footerText = 'Open',
  tiltStrength = 1,
  spotlightRadius = 380,
  className,
}: InteractiveCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const onMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const x = coords?.x ?? 0.5;
  const y = coords?.y ?? 0.5;
  const tiltX = (0.5 - y) * 8 * tiltStrength;
  const tiltY = (x - 0.5) * 8 * tiltStrength;
  const innerShiftX = (x - 0.5) * 14;
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

  const featuredBorderStyle: CSSProperties | undefined = featured
    ? {
        backgroundImage: `conic-gradient(from var(--border-angle), ${accent}55, transparent 30%, transparent 70%, ${accent}55), linear-gradient(#06080f, #06080f)`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        borderColor: 'transparent',
      }
    : {};

  const sharedClasses = cn(
    'group relative isolate flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl',
    'border border-white/[0.07] bg-[#06080f]/85 backdrop-blur-md',
    'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]',
    'transition-[border-color,box-shadow] duration-500',
    'hover:border-white/[0.18]',
    onClick && 'cursor-pointer',
    className,
  );

  const sharedHandlers = {
    onMouseMove: onMove,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setCoords(null);
    },
  };

  // Render the actual card body once — wrapped in either Link / a / div
  // depending on which navigation prop arrived.
  const body = (
    <>
      {featured && <span aria-hidden="true" className="animate-border-spin" />}

      {/* Cursor spotlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(${spotlightRadius}px circle at ${x * 100}% ${y * 100}%, ${accent}26, transparent 55%)`,
        }}
      />

      {/* Soft top sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1/2"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      <div
        className="relative z-10 flex h-full flex-col p-6 transition-transform duration-200 ease-out"
        style={{
          transform: hovered
            ? `translate3d(${innerShiftX}px, ${innerShiftY}px, 0)`
            : 'translate3d(0,0,0)',
        }}
      >
        {(leadingBadge || trailingBadge) && (
          <div className="mb-5 flex items-center justify-between">
            <span>{leadingBadge}</span>
            <span>{trailingBadge}</span>
          </div>
        )}

        {preview && (
          <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#02040a]/80">
            {preview}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background: 'linear-gradient(0deg, rgba(2,4,10,0.8) 0%, transparent 100%)',
              }}
            />
          </div>
        )}

        <div className="mt-5 flex-1">
          <h3 className="relative inline-block text-2xl font-semibold tracking-tight text-white">
            {title}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-px transition-all duration-500"
              style={{
                width: hovered ? '100%' : '0%',
                background: `linear-gradient(90deg, ${accent}, transparent)`,
              }}
            />
          </h3>
          {tagline && <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{tagline}</p>}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs">
          <span
            className="font-medium text-slate-300 transition-colors duration-300 group-hover:text-white"
            style={hovered ? { color: accent } : undefined}
          >
            {footerText}
          </span>
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full border bg-white/[0.04]',
              'transition-all duration-300',
            )}
            style={{
              transform: hovered ? 'translate(2px, -2px)' : 'translate(0,0)',
              borderColor: hovered ? `${accent}55` : 'rgba(255,255,255,0.1)',
            }}
          >
            <FontAwesomeIcon icon={faArrowUpRight} className="size-2.5 text-slate-300" />
          </span>
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        className={sharedClasses}
        style={{ ...cardStyle, ...featuredBorderStyle }}
        {...sharedHandlers}
      >
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={sharedClasses}
        style={{ ...cardStyle, ...featuredBorderStyle }}
        {...sharedHandlers}
      >
        {body}
      </a>
    );
  }
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={sharedClasses}
      style={{ ...cardStyle, ...featuredBorderStyle }}
      {...sharedHandlers}
    >
      {body}
    </div>
  );
}
