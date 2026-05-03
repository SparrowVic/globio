import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faSpinnerThird,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { cn } from '@/lib/utils';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';

import {
  type ConfiguratorMeta,
  type PresetModule,
} from './configurators';
import { loadPreset } from './preset-loader';
import { WorkshopPreviewGlobe } from './WorkshopPreviewGlobe';

export interface DetailViewProps {
  readonly configurator: ConfiguratorMeta;
  readonly state: ConfiguratorState;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
  readonly onBack: () => void;
}

/**
 * Two-column layout:
 *   - Left/centre (≈3/5 width on lg+): hero with the dedicated preview
 *     globe, configurator name + tagline, "back" affordance.
 *   - Right (≈2/5): scrollable knobs panel — every relevant control
 *     for this configurator, big and uncluttered.
 *
 * Preset is lazy-loaded by id. Until it resolves we render a soft
 * loading state; if no preset exists yet we render a "coming soon"
 * placeholder so half-finished waves don't crash.
 */
export function DetailView({ configurator, state, onGlobeChange, onBack }: DetailViewProps) {
  const [preset, setPreset] = useState<PresetModule | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    setPreset('loading');
    void loadPreset(configurator.id).then((mod) => {
      if (!cancelled) setPreset(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [configurator.id]);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 sm:px-10 lg:grid-cols-[3fr_2fr]">
      <PreviewPane configurator={configurator} preset={preset} state={state} onBack={onBack} />
      <KnobsPane
        configurator={configurator}
        preset={preset}
        state={state}
        onGlobeChange={onGlobeChange}
      />
    </div>
  );
}

/* ───────────────────────── PREVIEW PANE ───────────────────────── */

function PreviewPane({
  configurator,
  preset,
  state,
  onBack,
}: {
  readonly configurator: ConfiguratorMeta;
  readonly preset: PresetModule | null | 'loading';
  readonly state: ConfiguratorState;
  readonly onBack: () => void;
}) {
  return (
    <div className="relative flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      {/* Iridescent edge — mirrors the panel surfaces */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-50 [mask:linear-gradient(white,transparent_70%)]"
        style={{
          background:
            'linear-gradient(120deg, rgba(255,200,90,0.08) 0%, rgba(255,255,255,0) 35%, rgba(120,180,255,0.08) 70%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Preview globe area */}
      <div className="relative flex flex-1 items-center justify-center">
        <PreviewBody configurator={configurator} preset={preset} state={state} />
      </div>

      {/* Footer caption — back + name */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/[0.05] bg-white/[0.015] px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
        >
          <FontAwesomeIcon
            icon={faChevronLeft}
            className="size-2.5 transition-transform group-hover:-translate-x-0.5"
          />
          Back
        </button>
        <div className="flex min-w-0 items-baseline gap-2">
          <FontAwesomeIcon
            icon={configurator.icon}
            className="size-3 shrink-0"
            style={{ color: configurator.accent }}
          />
          <span className="truncate text-[12px] font-semibold text-white">
            {configurator.name}
          </span>
          <span className="truncate text-[11px] text-slate-400">{configurator.description}</span>
        </div>
      </div>
    </div>
  );
}

function PreviewBody({
  configurator,
  preset,
  state,
}: {
  readonly configurator: ConfiguratorMeta;
  readonly preset: PresetModule | null | 'loading';
  readonly state: ConfiguratorState;
}) {
  if (preset === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <FontAwesomeIcon
          icon={faSpinnerThird}
          className="size-8 animate-spin"
          style={{ color: configurator.accent }}
        />
        <span className="text-xs uppercase tracking-[0.2em]">Loading preset…</span>
      </div>
    );
  }
  if (preset === null) {
    return (
      <div className="flex max-w-md flex-col items-center gap-4 px-8 text-center text-slate-400">
        <FontAwesomeIcon
          icon={configurator.icon}
          className="size-10 opacity-60"
          style={{ color: configurator.accent }}
        />
        <p className="text-sm">
          <span className="block text-base font-semibold text-white">{configurator.name}</span>
          {configurator.description}
        </p>
        <span
          className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em]"
          style={{
            borderColor: `${configurator.accent}33`,
            color: `${configurator.accent}cc`,
            backgroundColor: `${configurator.accent}10`,
          }}
        >
          Coming in a later wave
        </span>
      </div>
    );
  }
  // Preset loaded — render the dedicated preview globe + tagline.
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
      {preset.cinematography.tagline ? (
        <p className="max-w-md text-center text-[12px] uppercase tracking-[0.2em] text-slate-400">
          {preset.cinematography.tagline}
        </p>
      ) : null}
      <WorkshopPreviewGlobe
        cinematography={preset.cinematography}
        state={state}
        watchedKeys={preset.watchedKeys}
        className="size-[min(60vmin,520px)]"
      />
      {preset.heroExtra}
    </div>
  );
}

/* ───────────────────────── KNOBS PANE ───────────────────────── */

function KnobsPane({
  configurator,
  preset,
  state,
  onGlobeChange,
}: {
  readonly configurator: ConfiguratorMeta;
  readonly preset: PresetModule | null | 'loading';
  readonly state: ConfiguratorState;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
}) {
  return (
    <aside className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <header
        className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5"
        style={{ background: `linear-gradient(180deg, ${configurator.accent}10, transparent)` }}
      >
        <FontAwesomeIcon icon={configurator.icon} className="size-3.5" style={{ color: configurator.accent }} />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white">
          {configurator.name}
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-slate-500">Knobs</span>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {preset && preset !== 'loading' ? (
          <preset.KnobsComponent state={state} onGlobeChange={onGlobeChange} />
        ) : (
          <div
            className={cn(
              'rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] p-6 text-center text-[13px] text-slate-400',
            )}
          >
            {preset === 'loading' ? 'Loading…' : 'Knobs will appear here once this preset ships.'}
          </div>
        )}
      </div>
    </aside>
  );
}
