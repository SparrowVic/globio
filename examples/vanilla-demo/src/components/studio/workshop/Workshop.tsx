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
import {
  SnapshotBridge,
  captureMainGlobe,
  workshopThumbnailRect,
} from './SnapshotBridge';

interface SnapshotState {
  readonly src: string;
  readonly fromRect: { left: number; top: number; width: number; height: number };
  readonly toRect: { left: number; top: number; width: number; height: number };
  readonly phase: 'opening' | 'parked' | 'closing';
}

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
  const [intro, setIntro] = useState(false);
  // Snapshot lifecycle — capture on open, animate to corner, hold while
  // workshop is up, animate back on close. `null` = no snapshot active.
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  // Workshop stays mounted during the closing animation so the snapshot
  // can travel back. `mounted` lags `open` going false until the
  // closing animation completes (or 800ms timeout for safety).
  const [mounted, setMounted] = useState(open);

  // Reset selection whenever Workshop is dismissed.
  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  // Open transition: capture snapshot + mount + start opening anim.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const captured = captureMainGlobe();
      if (captured) {
        setSnapshot({
          src: captured.src,
          fromRect: captured.rect,
          toRect: workshopThumbnailRect(),
          phase: 'opening',
        });
      }
      setIntro(true);
      const t = window.setTimeout(() => setIntro(false), 600);
      return () => window.clearTimeout(t);
    }
    // Closing: flip phase if snapshot exists; keep mounted until anim
    // ends. If no snapshot (e.g. capture failed), unmount immediately.
    setIntro(false);
    if (snapshot) {
      setSnapshot({ ...snapshot, phase: 'closing' });
    } else {
      setMounted(false);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc handler — drill out one level (detail → picker → close).
  useEffect(() => {
    if (!mounted) return undefined;
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
  }, [mounted, selected, onOpenChange]);

  // Lock body scroll while mounted (covers both open + closing phase).
  useEffect(() => {
    if (!mounted) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  // Bridge phase callbacks — drive the snapshot state machine forward.
  const onBridgePhaseEnd = (phase: 'opening' | 'closing') => {
    if (phase === 'opening') {
      setSnapshot((s) => (s ? { ...s, phase: 'parked' } : null));
    } else {
      // Closing finished — unmount snapshot and the whole workshop.
      setSnapshot(null);
      setMounted(false);
    }
  };

  if (!mounted) return null;

  const activeConfig = selected
    ? configuratorMeta.find((c) => c.id === selected) ?? null
    : null;

  // While the snapshot is mid-flight (opening or closing), the body
  // stays muted so the eye follows the moving thumbnail rather than
  // competing with cards / hero content. When parked, full opacity.
  const bodyOpacity = snapshot && snapshot.phase !== 'parked' ? 0 : 1;

  // Drive the close handler — if the parent flipped `open` to false,
  // the closing animation is in flight; clicking the close button
  // again triggers `onOpenChange(false)` which is a no-op if already
  // closing. Either way the user sees the bridge complete.
  const isClosing = snapshot?.phase === 'closing';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workshop"
      className="fixed inset-0 z-[60]"
    >
      {/* Backdrop — frosted blur over the studio chrome. Fades opposite
          the snapshot bridge so the transition reads as one continuous
          beat (snapshot moves out → backdrop comes in, and vice versa). */}
      <Backdrop closing={isClosing} />

      {/* Letterbox bars — 32px black bars top/bottom that ease in then
          retract over 600ms. Cinematic transition cue, not permanent. */}
      <Letterbox active={intro} />

      {/* Topbar — minimal brand-mark + crumb + Esc hint + close. */}
      <div
        className="transition-opacity duration-500 ease-out"
        style={{ opacity: bodyOpacity }}
      >
        <WorkshopHeader
          active={activeConfig?.name ?? null}
          onBackToPicker={() => setSelected(null)}
          onClose={() => onOpenChange(false)}
        />
      </div>

      {/* Body — picker or detail. Faded out during snapshot transit. */}
      <div
        key={selected ?? 'picker'}
        className="absolute inset-0 overflow-y-auto pt-16 pb-10 transition-opacity duration-500 ease-out [animation:workshopFadeIn_260ms_ease-out]"
        style={{ opacity: bodyOpacity }}
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

      {/* Snapshot bridge — sits above everything (z-70). Opens with a
          translate+scale from the studio's main globe rect to the
          corner thumbnail, then parks; closing reverses. */}
      {snapshot ? (
        <SnapshotBridge
          src={snapshot.src}
          fromRect={snapshot.fromRect}
          toRect={snapshot.toRect}
          phase={snapshot.phase}
          onPhaseEnd={onBridgePhaseEnd}
        />
      ) : null}

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

function Backdrop({ closing = false }: { readonly closing?: boolean }) {
  return (
    <>
      <div
        className={cn(
          'absolute inset-0 bg-[#03050d]/80 backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-500 ease-out',
          '[animation:backdropFadeIn_260ms_ease-out]',
          closing && 'opacity-0',
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
