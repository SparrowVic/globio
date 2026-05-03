import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faGrid2,
  faCheck,
  faRotateLeft,
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
  capturePreviewGlobe,
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
  // Snapshot lifecycle — capture on open, animate to corner, hold while
  // workshop is up, animate back on close. `null` = no snapshot active.
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  // Body fade — runs in parallel with the bridge animation rather than
  // *after* it, so cards/content appear immediately as the snapshot
  // moves out of the way. We bump it on the next frame after mount so
  // the CSS transition has a from-state to interpolate from.
  const [bodyShown, setBodyShown] = useState(false);
  // Workshop stays mounted during the closing animation so the snapshot
  // can travel back. `mounted` lags `open` going false until the
  // closing animation completes (or 800ms timeout for safety).
  const [mounted, setMounted] = useState(open);

  // Save / Discard model — Workshop is a *deep-dive* editing session.
  // We snapshot `state.globe` into `draft` on open, route every knob
  // change to draft instead of the parent state, and only commit on
  // explicit Apply. The main globe stays still while the user tunes —
  // it's not a live-tuning panel, it's a workshop.
  const [draft, setDraft] = useState<GlobeSettings>(state.globe);
  const [dirty, setDirty] = useState(false);
  // When the user clicks the close affordance with unsaved changes, we
  // flip into "asking" mode and surface an Apply / Discard / Keep
  // editing prompt instead of closing.
  const [askingClose, setAskingClose] = useState(false);

  // Reset selection whenever Workshop is dismissed.
  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  // Sync draft + reset dirty whenever Workshop opens. We capture the
  // current parent state.globe as the draft baseline.
  useEffect(() => {
    if (open) {
      setDraft(state.globe);
      setDirty(false);
      setAskingClose(false);
    }
    // Intentionally only on `open` flip — not on every state.globe
    // mutation, otherwise external updates would clobber the draft
    // mid-session. The parent shouldn't be mutating state.globe while
    // the workshop is up anyway (we're the only writer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Intercept knob changes: route to draft instead of parent. Children
  // see the draft via `draftState` below and don't know (or care) that
  // they're editing a session-local copy.
  const handleDraftChange = (patch: Partial<GlobeSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  // The state object children read — `state` with `globe` swapped for
  // the draft. useMemo so the reference is stable when `draft` doesn't
  // change (avoids unnecessary re-renders downstream).
  const draftState: ConfiguratorState = useMemo(
    () => ({ ...state, globe: draft }),
    [state, draft],
  );

  // Single-globe close bridge: if we're in DetailView when the user
  // closes (Apply / Discard / Esc / X), the live thing they were
  // looking at was the *preview*. Snapshot that canvas and rewire the
  // bridge so it animates from the preview's hero rect back to the
  // main globe — no jarring teleport to a corner thumbnail.
  const beginClose = (commit: boolean) => {
    if (selected !== null && snapshot) {
      const captured = capturePreviewGlobe();
      if (captured) {
        setSnapshot({
          ...snapshot,
          src: captured.src,
          toRect: captured.rect,
          phase: 'closing',
        });
      }
    }
    if (commit) onGlobeChange(draft);
    setSelected(null);
    setDirty(false);
    setAskingClose(false);
    onOpenChange(false);
  };

  const handleApply = () => beginClose(true);
  const handleDiscard = () => beginClose(false);

  const handleKeepEditing = () => {
    setAskingClose(false);
  };

  // Wraps onOpenChange(false). When dirty, we surface the prompt
  // instead of closing immediately.
  const requestClose = () => {
    if (!dirty) {
      beginClose(false);
      return;
    }
    setAskingClose(true);
  };

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
      // Show body on the next frame so the opacity transition has a
      // from-state to interpolate from (prevents the "instant pop"
      // when initial render already has opacity 1).
      const r = window.requestAnimationFrame(() => setBodyShown(true));
      return () => window.cancelAnimationFrame(r);
    }
    // Closing: flip phase if snapshot exists; keep mounted until anim
    // ends. If no snapshot (e.g. capture failed), unmount immediately.
    setBodyShown(false);
    if (snapshot) {
      setSnapshot({ ...snapshot, phase: 'closing' });
    } else {
      setMounted(false);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc handler — drill out one level (detail → picker → close-prompt).
  // Note: even Detail-view Esc only steps back to the picker — Apply /
  // Discard are explicit. This keeps the dirty contract obvious: the
  // user always confronts unsaved changes when *closing the workshop*.
  useEffect(() => {
    if (!mounted) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (askingClose) {
        // Esc inside the close-prompt = "keep editing" (cancel close).
        setAskingClose(false);
        return;
      }
      if (selected !== null) {
        setSelected(null);
      } else {
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, selected, askingClose, dirty]);

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

  // Body fades in/out independently of the bridge phase. Opening: we
  // run body fade-in *in parallel* with the bridge sweep so cards
  // appear immediately rather than waiting ~700ms for the snapshot to
  // finish parking. Closing: body fades out alongside the bridge.
  const bodyOpacity = bodyShown ? 1 : 0;

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

      {/* Topbar — minimal brand-mark + crumb + Esc/Apply/Discard. */}
      <div
        className="transition-opacity duration-500 ease-out"
        style={{ opacity: bodyOpacity }}
      >
        <WorkshopHeader
          active={activeConfig?.name ?? null}
          dirty={dirty}
          askingClose={askingClose}
          onBackToPicker={() => setSelected(null)}
          onClose={requestClose}
          onApply={handleApply}
          onDiscard={handleDiscard}
          onKeepEditing={handleKeepEditing}
        />
      </div>

      {/* Body — picker or detail. Faded out during snapshot transit.
          Opacity is driven solely by inline `bodyOpacity` + the 500ms
          transition; no competing keyframe animation (which previously
          flashed the body in for 260ms before the bridge even reached
          the corner). */}
      <div
        key={selected ?? 'picker'}
        className="absolute inset-0 overflow-y-auto pt-16 pb-10 transition-opacity duration-500 ease-out"
        style={{ opacity: bodyOpacity }}
      >
        {activeConfig ? (
          <DetailView
            configurator={activeConfig}
            state={draftState}
            onGlobeChange={handleDraftChange}
            onBack={() => setSelected(null)}
          />
        ) : (
          <CardPicker state={draftState} onPick={setSelected} />
        )}
      </div>

      {/* Snapshot bridge — sits above everything (z-70). Opens with a
          translate+scale from the studio's main globe rect to the
          corner thumbnail, then parks; closing reverses.
          Hidden via `visible` while a Workshop DetailView is active —
          the preview globe takes over visually so we never show two
          globes at once. */}
      {snapshot ? (
        <SnapshotBridge
          src={snapshot.src}
          fromRect={snapshot.fromRect}
          toRect={snapshot.toRect}
          phase={snapshot.phase}
          visible={snapshot.phase !== 'parked' || selected === null}
          onPhaseEnd={onBridgePhaseEnd}
        />
      ) : null}

    </div>
  );
}

/* ───────────────────────── BACKDROP ───────────────────────── */

function Backdrop({ closing = false }: { readonly closing?: boolean }) {
  // Wrap all three layers so the closing fade affects them as a unit
  // — previously only the dark blur layer faded out and the noise +
  // gradient hung on solid until the whole overlay unmounted, leaving
  // a "residual texture" flash mid-close.
  return (
    <div
      className={cn(
        'absolute inset-0 transition-opacity duration-500 ease-out',
        '[animation:backdropFadeIn_260ms_ease-out]',
        closing && 'opacity-0',
      )}
    >
      <div className="absolute inset-0 bg-[#03050d]/80 backdrop-blur-2xl backdrop-saturate-150" />
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
    </div>
  );
}


/* ───────────────────────── HEADER ───────────────────────── */

function WorkshopHeader({
  active,
  dirty,
  askingClose,
  onBackToPicker,
  onClose,
  onApply,
  onDiscard,
  onKeepEditing,
}: {
  readonly active: string | null;
  readonly dirty: boolean;
  readonly askingClose: boolean;
  readonly onBackToPicker: () => void;
  readonly onClose: () => void;
  readonly onApply: () => void;
  readonly onDiscard: () => void;
  readonly onKeepEditing: () => void;
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
        {dirty && !askingClose ? (
          <span
            aria-label="Unsaved changes"
            title="Unsaved changes"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-200/[0.06] px-2 py-0.5 text-[10px] tracking-[0.18em] text-amber-200/90"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-amber-300" />
            Modified
          </span>
        ) : null}
      </div>

      {/* Right cluster — Apply / Discard / Esc hint / close.
          Three modes:
          1. askingClose — three-button prompt replaces the cluster
             ("You have unsaved changes — Apply / Discard / Keep editing")
          2. dirty       — Apply + Discard buttons inline + close X
          3. clean       — Esc hint + close X */}
      {askingClose ? (
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] uppercase tracking-[0.16em] text-amber-200/80 md:inline">
            Unsaved changes —
          </span>
          <button
            type="button"
            onClick={onKeepEditing}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/30 bg-rose-300/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-rose-200 transition-colors hover:border-rose-300/60 hover:bg-rose-300/[0.12] hover:text-white"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="size-2.5" />
            Discard
          </button>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-200/30 to-amber-300/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_-6px_rgba(255,200,90,0.7),inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all hover:from-amber-200/40 hover:to-amber-300/30 hover:shadow-[0_0_36px_-6px_rgba(255,200,90,0.9),inset_0_1px_0_0_rgba(255,255,255,0.24)]"
          >
            <FontAwesomeIcon icon={faCheck} className="size-2.5" />
            Apply
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {dirty ? (
            <>
              <button
                type="button"
                onClick={onDiscard}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="size-2.5" />
                Discard
              </button>
              <button
                type="button"
                onClick={onApply}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-200/30 to-amber-300/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_-6px_rgba(255,200,90,0.7),inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all hover:from-amber-200/40 hover:to-amber-300/30 hover:shadow-[0_0_36px_-6px_rgba(255,200,90,0.9),inset_0_1px_0_0_rgba(255,255,255,0.24)]"
              >
                <FontAwesomeIcon icon={faCheck} className="size-2.5" />
                Apply
              </button>
            </>
          ) : (
            <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:inline-flex">
              <Kbd className="!h-5 !min-w-[20px]">Esc</Kbd>
              <span>{active ? 'back' : 'close'}</span>
            </span>
          )}
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
      )}
    </header>
  );
}

// Re-exported for typing convenience (Studio.tsx grabs onCommandPalette
// hooks the same way).
export type { ReactNode };
