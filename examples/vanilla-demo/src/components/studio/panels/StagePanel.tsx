import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faCompass,
  faCrosshairs,
  faGauge,
  faGrid2,
  faLayerGroup,
  faMousePointer,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { cn } from '@/lib/utils';
import type { GlobeSettings } from '@/configurator/types';
import { StageSections } from '@/components/studio/sections/StageSections';

export interface StagePanelProps {
  readonly settings: GlobeSettings;
  readonly onChange: (patch: Partial<GlobeSettings>) => void;
}

/** Tab values persisted to localStorage so the user's preference survives reloads. */
type StageView = 'quick' | 'browse';

interface SectionMeta {
  readonly id: string;
  readonly name: string;
  readonly icon: typeof faLayerGroup;
  readonly accent: string;
  readonly description: string;
  /** Render a one-line live status from the current settings. */
  readonly status: (settings: GlobeSettings) => string;
}

/**
 * The five Stage sections, in the same order they appear in StageSections.
 * `id` matches the `<PanelSection>` id used there so the Browse → Quick jump
 * can target the corresponding accordion. `accent` drives per-card hover
 * glow + spotlight tint so users build muscle memory for "Surface = amber",
 * "Camera = sky", etc.
 */
const SECTIONS: ReadonlyArray<SectionMeta> = [
  {
    id: 'stage-surface',
    name: 'Surface',
    icon: faLayerGroup,
    accent: '#fbbf24',
    description: 'Atmosphere · stars · labels · focus pulse',
    status: (s) =>
      [
        s.atmosphere ? 'atmo' : null,
        s.starfield ? 'stars' : null,
        s.countryLabels ? 'labels' : null,
        s.focusPulse ? 'pulse' : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'minimal',
  },
  {
    id: 'stage-camera',
    name: 'Camera',
    icon: faCompass,
    accent: '#7dd3fc',
    description: 'Zoom · rotation · framing · initial view',
    status: (s) =>
      `${s.autoRotate ? 'auto-rotate' : 'static'} · ${s.zoomMode}`,
  },
  {
    id: 'stage-interaction',
    name: 'Interaction',
    icon: faMousePointer,
    accent: '#a78bfa',
    description: 'Hover detection · back-side occlusion',
    status: (s) =>
      `${s.hoverEnabled ? 'hover on' : 'hover off'}${s.hoverOccludeBackSide ? ' · occluded' : ''}`,
  },
  {
    id: 'stage-focus',
    name: 'Focus',
    icon: faCrosshairs,
    accent: '#f472b6',
    description: 'Click-to-focus · padding · flight feel',
    status: (s) =>
      s.clickToFocus
        ? `${(s.focusPadding * 100).toFixed(0)}% pad · ${(s.focusDurationMs / 1000).toFixed(1)}s`
        : 'off',
  },
  {
    id: 'stage-perf',
    name: 'Performance',
    icon: faGauge,
    accent: '#34d399',
    description: 'Pixel ratio · adaptive · max FPS · AA',
    status: (s) =>
      `${s.adaptiveQuality ? 'auto' : s.pixelRatio} · ${s.maxFps}fps${s.antialias ? ' · AA' : ''}`,
  },
];

/**
 * Tiny generic localStorage-backed state — a sibling of `usePanelState`
 * that handles arbitrary string values (the boolean-only one wouldn't
 * fit "quick" / "browse"). Same SSR safety pattern: render with the
 * default on first paint, hydrate from localStorage in a `useEffect`
 * after mount. Key is namespaced so other routes / users don't collide.
 */
function useStringState<T extends string>(
  key: string,
  defaultValue: T,
): readonly [T, (next: T) => void] {
  const storageKey = `globio-stage-${key}`;
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) setValue(raw as T);
    } catch {
      /* private mode — fall through. */
    }
  }, [storageKey]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        /* best-effort. */
      }
    },
    [storageKey],
  );

  return [value, set] as const;
}

/**
 * Stage panel content with two views:
 *
 *  1. **Quick** — the existing 5 accordion sections (`<StageSections>`).
 *     Familiar dashboard, fastest path when the user knows what they want.
 *  2. **Browse** — a 1-column rail of richer cards, one per section, each
 *     with its FA icon, name, live status badge, and a cursor spotlight.
 *     Click → switch back to Quick + scroll to that section + briefly
 *     highlight it so the eye finds the destination immediately.
 *
 * The tab indicator slides between Quick and Browse using the home page's
 * floating glass nav pattern. View choice persists to localStorage.
 */
export function StagePanel({ settings, onChange }: StagePanelProps) {
  const [view, setView] = useStringState<StageView>('view', 'quick');

  // Imperative jump triggered by Browse card click. Three side-effects:
  // (1) flip the panel to Quick view; (2) pre-open the target accordion
  // by writing its persisted state to localStorage so the freshly-
  // mounted `<PanelSection>` reads `true` in its hydrate effect;
  // (3) on the next frame, scroll the section into view + add a one-
  // shot highlight class so the user's eye finds the destination.
  const jumpTo = (id: string) => {
    try {
      window.localStorage.setItem(`globio-studio-section-${id}`, 'true');
    } catch {
      /* private mode — fine, just won't auto-open. */
    }
    setView('quick');
    requestAnimationFrame(() => {
      // Two RAFs — first lets the view switch render, second lets the
      // new accordion's hydrate effect mark itself open before we scroll
      // (otherwise the body height is still 0 and scrollIntoView lands
      // a bit short).
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('section-arrival-pulse');
        window.setTimeout(() => el.classList.remove('section-arrival-pulse'), 1400);
      });
    });
  };

  return (
    <div className="flex h-full flex-col">
      <ViewTabs value={view} onChange={setView} />
      <div className="relative flex-1 overflow-hidden">
        <div
          key={view}
          className="h-full overflow-y-auto pt-3 [animation:stageFadeIn_220ms_ease-out]"
        >
          {view === 'quick' ? (
            <StageSections settings={settings} onChange={onChange} />
          ) : (
            <BrowseView settings={settings} onJump={jumpTo} />
          )}
        </div>
      </div>
      <style>{`
        @keyframes stageFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── TABS ───────────────────────── */

const tabs: ReadonlyArray<{ readonly value: StageView; readonly label: string; readonly icon: typeof faLayerGroup }> = [
  { value: 'quick', label: 'Quick', icon: faSparkles },
  { value: 'browse', label: 'Browse', icon: faGrid2 },
];

function ViewTabs({
  value,
  onChange,
}: {
  readonly value: StageView;
  readonly onChange: (next: StageView) => void;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Recompute indicator position whenever the active tab changes — also
  // on first paint so the glass pill lands on the right tab without a
  // wobble.
  useEffect(() => {
    const idx = tabs.findIndex((t) => t.value === value);
    const btn = itemRefs.current[idx];
    const rail = railRef.current;
    if (!btn || !rail) return;
    const railRect = rail.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({ left: btnRect.left - railRect.left, width: btnRect.width });
  }, [value]);

  return (
    <div
      ref={railRef}
      className="relative mb-1 flex items-center gap-0.5 self-start rounded-full border border-white/[0.08] bg-white/[0.025] p-0.5"
    >
      {indicator && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-full bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-[left,width] duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {tabs.map((tab, idx) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium tracking-tight transition-colors',
              active ? 'text-amber-200' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <FontAwesomeIcon icon={tab.icon} className="size-3" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── BROWSE ───────────────────────── */

function BrowseView({
  settings,
  onJump,
}: {
  readonly settings: GlobeSettings;
  readonly onJump: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Pick a configurator
      </p>
      {SECTIONS.map((section, idx) => (
        <BrowseCard
          key={section.id}
          section={section}
          status={section.status(settings)}
          delay={idx * 40}
          onClick={() => onJump(section.id)}
        />
      ))}
      <p className="mt-3 rounded-md border border-dashed border-white/[0.08] bg-white/[0.015] px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
        Tip: hit <kbd className="mx-0.5 inline-flex items-center rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[9px] text-slate-300">⌘K</kbd> from
        anywhere to jump straight to a section, kind, theme, or preset.
      </p>
    </div>
  );
}

function BrowseCard({
  section,
  status,
  delay,
  onClick,
}: {
  readonly section: SectionMeta;
  readonly status: string;
  readonly delay: number;
  readonly onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const onMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCoords(null);
      }}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left',
        'transition-all duration-300 hover:border-white/[0.16]',
        '[animation:browseCardIn_400ms_ease-out_both]',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Cursor spotlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(260px circle at ${coords?.x ?? 50}% ${coords?.y ?? 50}%, ${section.accent}26, transparent 60%)`,
        }}
      />

      {/* Icon badge */}
      <span
        className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] transition-transform duration-300 group-hover:scale-105"
        style={{ boxShadow: `0 0 22px -8px ${section.accent}66` }}
      >
        <FontAwesomeIcon icon={section.icon} className="size-4" style={{ color: section.accent }} />
      </span>

      {/* Body */}
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">{section.name}</span>
          <span
            className="rounded-full border px-1.5 py-px text-[9px] font-mono uppercase tracking-[0.14em]"
            style={{
              borderColor: `${section.accent}33`,
              color: `${section.accent}cc`,
              backgroundColor: `${section.accent}10`,
            }}
          >
            {status}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{section.description}</span>
      </span>

      {/* Chevron with hover slide */}
      <FontAwesomeIcon
        icon={faChevronRight}
        className="relative size-3 shrink-0 text-slate-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-slate-200"
      />

      <style>{`
        @keyframes browseCardIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
}

// Re-export for places that want the shape (e.g. future Workshop preview)
export type { ReactNode };
