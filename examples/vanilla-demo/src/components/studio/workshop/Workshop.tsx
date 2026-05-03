import { useEffect, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faGrid2,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { cn } from '@/lib/utils';
import { Kbd } from '@/components/shared/components/Kbd';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';

import { CardPicker } from './CardPicker';
import { DetailView } from './DetailView';
import { configuratorMeta, type ConfiguratorId } from './configurators';

export interface WorkshopProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly state: ConfiguratorState;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
}

/**
 * Full-viewport "deep-dive editor" for a single configurator at a time.
 *
 * Two views, internal `selected` state drives the router:
 *   - **null**  → CardPicker grid: pick a configurator to dive into.
 *   - id       → DetailView: dedicated preview globe (cinematography
 *                preset specific to that configurator) + every knob
 *                that touches it, big and uncluttered.
 *
 * Lifecycle:
 *   - Esc closes Workshop. If a configurator is selected, Esc returns
 *     to the picker first; second Esc dismisses the whole overlay.
 *     Saves a click for users who drilled in too deep.
 *   - Body gets `overflow: hidden` while open so the page below can't
 *     scroll under the backdrop.
 *   - Open + close run a 220ms fade + scale animation; close also runs
 *     a tiny letterbox sweep (Phase 1's "cinematic intro" cue) so the
 *     user notices the modal-mode transition rather than feeling the
 *     tabs just flicked.
 */
export function Workshop({ open, onOpenChange, state, onGlobeChange }: WorkshopProps) {
  const [selected, setSelected] = useState<ConfiguratorId | null>(null);
  // Tracks the open animation phase so we can layer entrance effects
  // (letterbox + stagger) without tying them to React keys.
  const [intro, setIntro] = useState(false);

  // Reset selection whenever Workshop is dismissed — the user shouldn't
  // re-enter into a stale detail view.
  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  // Letterbox + stagger trigger. Runs once on `open` going false→true.
  useEffect(() => {
    if (!open) {
      setIntro(false);
      return undefined;
    }
    setIntro(true);
    const t = window.setTimeout(() => setIntro(false), 600);
    return () => window.clearTimeout(t);
  }, [open]);

  // Esc handler — drill out one level (detail → picker → close).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (selected !== null) {
        setSelected(null);
      } else {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selected, onOpenChange]);

  // Lock body scroll while Workshop is up — page chrome (top bar, panels,
  // status dock) is rendered behind the backdrop and shouldn't bleed
  // pointer events through the focus trap.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const activeConfig = selected
    ? configuratorMeta.find((c) => c.id === selected) ?? null
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workshop"
      className="fixed inset-0 z-[60]"
    >
      {/* Backdrop — strong frosted blur over the studio chrome so the
          workshop reads as its own focused mode rather than an overlay
          on top of work-in-progress. */}
      <Backdrop />

      {/* Letterbox bars — 32px black bars top/bottom that ease in then
          retract over 600ms. Cinematic transition cue, not a permanent
          framing. */}
      <Letterbox active={intro} />

      {/* Topbar inside the workshop — minimal: brand-mark + view crumb +
          Esc hint + close button. Doesn't try to replicate the studio
          topbar; this is its own focused surface. */}
      <WorkshopHeader
        active={activeConfig?.name ?? null}
        onBackToPicker={() => setSelected(null)}
        onClose={() => onOpenChange(false)}
      />

      {/* Body — picker or detail, fades on view change so the user
          notices they navigated. */}
      <div
        key={selected ?? 'picker'}
        className="absolute inset-0 overflow-y-auto pt-16 pb-10 [animation:workshopFadeIn_260ms_ease-out]"
      >
        {activeConfig ? (
          <DetailView
            configurator={activeConfig}
            state={state}
            onGlobeChange={onGlobeChange}
            onBack={() => setSelected(null)}
          />
        ) : (
          <CardPicker state={state} onPick={setSelected} />
        )}
      </div>

      <style>{`
        @keyframes workshopFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes letterbox-in {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        @keyframes letterbox-in-bottom {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── BACKDROP ───────────────────────── */

function Backdrop() {
  return (
    <>
      <div
        className={cn(
          'absolute inset-0 bg-[#03050d]/80 backdrop-blur-2xl backdrop-saturate-150',
          '[animation:backdropFadeIn_260ms_ease-out]',
        )}
      />
      {/* Animated noise / aurora shimmer behind everything for atmosphere */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Iridescent radial accent — same gradient as the home page hero */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.18]"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(251,191,36,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 70%, rgba(120,180,255,0.14) 0%, transparent 50%)',
        }}
      />
      <style>{`
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ───────────────────────── LETTERBOX ───────────────────────── */

function Letterbox({ active }: { readonly active: boolean }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-[5] h-8 origin-top bg-black transition-transform duration-500 ease-out',
          active ? 'translate-y-0' : '-translate-y-full',
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-8 origin-bottom bg-black transition-transform duration-500 ease-out',
          active ? 'translate-y-0' : 'translate-y-full',
        )}
      />
    </>
  );
}

/* ───────────────────────── HEADER ───────────────────────── */

function WorkshopHeader({
  active,
  onBackToPicker,
  onClose,
}: {
  readonly active: string | null;
  readonly onBackToPicker: () => void;
  readonly onClose: () => void;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3.5">
      {/* Crumb — Workshop · {active configurator name} */}
      <div className="flex items-center gap-3 text-[11.5px] uppercase tracking-[0.18em] text-slate-300">
        <FontAwesomeIcon icon={faGrid2} className="size-3 text-amber-200" />
        <button
          type="button"
          onClick={onBackToPicker}
          disabled={!active}
          className={cn(
            'transition-colors',
            active
              ? 'cursor-pointer text-slate-300 hover:text-white'
              : 'cursor-default text-amber-200/90',
          )}
        >
          Workshop
        </button>
        {active ? (
          <>
            <span className="text-slate-600">/</span>
            <span className="text-white">{active}</span>
          </>
        ) : null}
      </div>

      {/* Right cluster — kbd hint + close */}
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:inline-flex">
          <Kbd className="!h-5 !min-w-[20px]">Esc</Kbd>
          <span>{active ? 'back' : 'close'}</span>
        </span>
        <button
          type="button"
          aria-label="Close Workshop"
          onClick={onClose}
          className={cn(
            'group flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-all',
            'hover:scale-105 hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_24px_-6px_rgba(255,200,90,0.6)]',
          )}
        >
          <FontAwesomeIcon icon={faXmark} className="size-3.5" />
        </button>
      </div>
    </header>
  );
}

// Re-exported for typing convenience (Studio.tsx grabs onCommandPalette
// hooks the same way).
export type { ReactNode };
