import type { ComponentType, ReactNode } from 'react';
import type { GlobeInstance } from '@your-globe/core';
import {
  faCircleSmall,
  faCrosshairs,
  faMapLocationDot,
  faMousePointer,
  faRoute,
  faStars,
  faTags,
  faWandMagicSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';

/**
 * What "deep-dive" subjects the workshop offers. Each one represents a
 * coherent slice of the globe's API that benefits from a *focused* editing
 * mode — full-screen real estate, a dedicated preview globe with
 * cinematography that *shows off* what this configurator does, and every
 * relevant knob laid out in one place.
 *
 * Adding a new configurator: append an entry to `configuratorMeta` here
 * for picker visibility, then drop a preset module at
 * `./presets/<id>.tsx` exporting `default: PresetModule` to fill in
 * KnobsComponent + cinematography + preview animation.
 */

export type ConfiguratorId =
  | 'labels'
  | 'pulse'
  | 'stars'
  | 'hover'
  | 'arcs'
  | 'markers'
  | 'atmosphere'
  | 'crosshair';

export interface PreviewCinematography {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  /** Initial camera lat/lng. */
  readonly initialLat: number;
  readonly initialLng: number;
  /** Auto-rotate speed (revs/sec). Default 0.04. */
  readonly speed?: number;
  /** Framing padding for atmosphere halo. Default 0.18. */
  readonly framingPadding?: number;
  readonly atmosphere?: boolean;
  readonly starfield?: boolean;
  /** Two-line subhead shown above the preview globe — sets context. */
  readonly tagline?: string;
}

export interface KnobsComponentProps {
  readonly state: ConfiguratorState;
  readonly onGlobeChange: (patch: Partial<GlobeSettings>) => void;
}

/**
 * Lazy-loaded preset module. Each one ships:
 *   - cinematography for the dedicated preview globe
 *   - a Knobs component rendering the relevant slice of controls
 *   - an optional preview ReactNode for the detail-view hero (defaults
 *     to the live preview globe alone)
 *
 * Loaded on demand via `./presets/<id>` when Detail view mounts. Metadata
 * stays in `configuratorMeta` below so the picker doesn't pay the JS cost
 * of every preset upfront.
 */
export interface PresetModule {
  readonly cinematography: PreviewCinematography;
  readonly KnobsComponent: ComponentType<KnobsComponentProps>;
  /**
   * GlobeSettings keys this configurator owns. Changes get pushed into
   * the running preview via `globe.update()` — the engine mutates
   * relevant layers in place (label thresholds, starfield uniforms, …).
   * No destroy + create, no flash. Most knobs sit here.
   *
   * Keys outside this set don't fire any preview reaction, which keeps
   * the preview from thrashing on unrelated state changes.
   */
  readonly watchedKeys: ReadonlyArray<keyof GlobeSettings>;
  /**
   * Subset of `watchedKeys` that the core engine *cannot yet* live-
   * update — changes to these still rebuild the preview (destroy +
   * create). Use sparingly; every entry here is a frame of flicker.
   * Add a knob when its live setter doesn't exist yet, remove it once
   * the core lands the setter.
   */
  readonly rebuildKeys?: ReadonlyArray<keyof GlobeSettings>;
  /**
   * Imperative mount hook — fires once each time the preview globe is
   * built (after `globe.mount()`). Used by presets that drive the
   * preview through imperative API rather than config (arcs, markers,
   * etc.) — drop a fixture dataset onto the freshly-mounted instance.
   */
  readonly onMount?: (globe: GlobeInstance, state: ConfiguratorState) => void;
  /**
   * Imperative live-update hook — fires whenever a watched key changes.
   * Used by arcs / markers presets to re-push the dataset with the
   * latest styling (width, color, animation flags, etc.) without
   * rebuilding the globe.
   */
  readonly onLiveUpdate?: (globe: GlobeInstance, state: ConfiguratorState) => void;
  /** Optional override for the detail-view hero contents. */
  readonly heroExtra?: ReactNode;
}

export interface ConfiguratorMeta {
  readonly id: ConfiguratorId;
  readonly name: string;
  readonly icon: typeof faTags;
  /** Hex accent — spotlight tints, badges, hover glows. */
  readonly accent: string;
  readonly description: string;
  /** Live status text for cards (e.g. "halo · 200ms", "off"). */
  readonly status: (state: ConfiguratorState) => string;
}

export const configuratorMeta: ReadonlyArray<ConfiguratorMeta> = [
  {
    id: 'labels',
    name: 'Country labels',
    icon: faTags,
    accent: '#fbbf24',
    description: 'Country name overlays — threshold, halo, fade, transition.',
    status: (s) =>
      s.globe.countryLabels
        ? `${s.globe.labelMinScreenSize}px${s.globe.labelHaloEnabled ? ' · halo' : ''}`
        : 'off',
  },
  {
    id: 'pulse',
    name: 'Focus pulse',
    icon: faCrosshairs,
    accent: '#f472b6',
    description: 'Sci-fi sonar ring fired on focus — origin, size, fade.',
    status: (s) =>
      s.globe.focusPulse
        ? `${s.globe.focusPulseOrigin} · ${(s.globe.outlinePulseDurationMs / 1000).toFixed(1)}s`
        : 'off',
  },
  {
    id: 'stars',
    name: 'Starfield',
    icon: faStars,
    accent: '#c4b5fd',
    description: 'Backdrop stars — density, palette, twinkle, size variety.',
    status: (s) =>
      s.globe.starfield
        ? `${s.globe.starfieldDensity}${s.globe.starfieldTwinkle ? ' · twinkle' : ''}`
        : 'off',
  },
  {
    id: 'hover',
    name: 'Hover highlight',
    icon: faMousePointer,
    accent: '#a78bfa',
    description: 'Country hover stroke — back-side occlusion, lift, glow.',
    status: (s) =>
      s.globe.hoverEnabled ? `on${s.globe.hoverOccludeBackSide ? ' · occluded' : ''}` : 'off',
  },
  {
    id: 'arcs',
    name: 'Arcs',
    icon: faRoute,
    accent: '#22d3ee',
    description: 'Great-circle connections between lat/lng pairs.',
    status: () => 'preview',
  },
  {
    id: 'markers',
    name: 'Markers',
    icon: faMapLocationDot,
    accent: '#34d399',
    description: 'Points of interest with pulse animation + tooltips.',
    status: () => 'preview',
  },
  {
    id: 'atmosphere',
    name: 'Atmosphere',
    icon: faWandMagicSparkles,
    accent: '#67e8f9',
    description: 'Soft Fresnel halo — toggle (tint comes from theme).',
    status: (s) => (s.globe.atmosphere ? 'on' : 'off'),
  },
  {
    id: 'crosshair',
    name: 'Hover crosshair',
    icon: faCircleSmall,
    accent: '#fde68a',
    description: 'Tron-style targeting reticle (outline kind only).',
    status: (s) => (s.globe.kind === 'outline' ? 'outline' : 'off'),
  },
];
