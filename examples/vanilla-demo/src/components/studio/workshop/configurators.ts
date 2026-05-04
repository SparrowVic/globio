import type { ComponentType, ReactNode } from 'react';
import type { GlobeInstance } from '@your-globe/core';
import {
  faCircleSmall,
  faCrosshairs,
  faFillDrip,
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

/**
 * The eight *conceptual* slots the workshop exposes — each one is a
 * cross-cutting visual concern (labels, focus pulse, starfield, hover,
 * arcs, markers, atmosphere, hover crosshair) that every globe kind
 * implements in its own visual language. The card stays the same
 * across kinds; the configurator's KnobsComponent branches on
 * `state.globe.kind` and surfaces the kind-specific knobs for that
 * concern.
 *
 * Past iterations (waves F-I) shipped per-kind cards (`dotted`,
 * `hologram`, `wireframe`, `paper`). They cluttered the picker with
 * cards that were dead on most kinds, so we collapsed back to the
 * eight concept-cards. The per-kind knob libraries those waves built
 * up still exist in `presets/<kind>.tsx` (orphaned for now); the
 * next iteration will fold those knob trees into the eight concept-
 * cards behind kind branches.
 */
export type ConfiguratorId =
  | 'labels'
  | 'pulse'
  | 'stars'
  | 'selection'
  | 'country-fill'
  | 'arcs'
  | 'markers'
  | 'atmosphere'
  | 'crosshair';

export interface PreviewCinematography {
  /**
   * Optional kind override. When omitted (the default), the preview
   * mirrors the user's current `state.globe.kind` from the studio so
   * the workshop shows them what they're actually shipping. Set
   * explicitly only when the configurator is fundamentally tied to a
   * specific kind (e.g. `crosshair` is outline-only — though even
   * then the DependsOn knobs gate properly, so leaving this unset and
   * letting the preview "go blank" on other kinds is also a valid
   * teaching moment).
   */
  readonly kind?: GlobeKind;
  /** Optional theme override; otherwise defers to `state.globe.theme`. */
  readonly theme?: ThemePresetName;
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

const focusPulseStatus = (state: ConfiguratorState): string => {
  const settings = state.globe;
  if (!settings.focusPulse) return 'off';
  if (settings.kind === 'dotted') {
    return settings.dottedRipple ? `${settings.focusPulseOrigin} · ripple` : 'trigger only';
  }
  if (settings.kind === 'wireframe' || settings.kind === 'paper') {
    return `${settings.focusPulseOrigin} · kind default`;
  }
  const durationMs =
    settings.kind === 'hologram'
      ? settings.hologramPulseDurationMs
      : settings.outlinePulseDurationMs;
  return `${settings.focusPulseOrigin} · ${(durationMs / 1000).toFixed(1)}s`;
};

const crosshairStatus = (state: ConfiguratorState): string => {
  const supported =
    state.globe.kind === 'outline' ||
    state.globe.kind === 'dotted' ||
    state.globe.kind === 'hologram';
  if (!supported) return 'unavailable';
  return state.globe.outlineHoverCrosshair ? 'reticle' : 'off';
};

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
    status: focusPulseStatus,
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
    id: 'selection',
    name: 'Selection',
    icon: faMousePointer,
    accent: '#a78bfa',
    description: 'Country stroke for hovered + pinned states — colors, occlusion, lift, glow.',
    status: (s) =>
      s.globe.hoverEnabled ? `on${s.globe.hoverOccludeBackSide ? ' · occluded' : ''}` : 'off',
  },
  {
    id: 'country-fill',
    name: 'Country fill',
    icon: faFillDrip,
    accent: '#fb923c',
    description: 'Fill every country — none / always / palette / data — plus per-state overrides.',
    status: (s) =>
      s.globe.countryFillMode === 'none' ? 'off' : s.globe.countryFillMode,
  },
  {
    id: 'arcs',
    name: 'Arcs',
    icon: faRoute,
    accent: '#22d3ee',
    description: 'Great-circle connections between lat/lng pairs.',
    status: (s) => `${s.globe.arcDataset}${s.globe.arcAnimated ? ' · animated' : ''}`,
  },
  {
    id: 'markers',
    name: 'Markers',
    icon: faMapLocationDot,
    accent: '#34d399',
    description: 'Points of interest with pulse animation + tooltips.',
    status: (s) => `${s.globe.markerMode} · ${s.globe.markerDataset}`,
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
    description: 'Cursor reticle + lat/lng readout — kind decides the visual.',
    status: crosshairStatus,
  },
];
