import { CountriesLayer } from './borders-layer';
import { continentOf, type Continent } from './continent-of';
import { FocusPulseLayer } from './focus-pulse-layer';
import { HoverCrosshairLayer } from './hover-crosshair';
import { HoverGlowLayer } from './hover-glow-layer';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';
import type { LatLng } from '../../types';
import type { Vector3 } from 'three';

const DEFAULT_PULSE_DURATION_MS = 1400;
const DEFAULT_DIM_AMOUNT = 0.3;
const DEFAULT_DIM_TAU = 0.25 / 3; // 250ms feel: tau ≈ 1/3 duration → ~95% by 250ms.

/**
 * Outline kind extras: `setHoveredCountry` for the glow halo + continent
 * dim, `setPointerPixel` for the crosshair tooltip's container-local xy.
 * The base `onPointerMove` hook gives us 3D + lat/lng; pixel coords come
 * separately because they're a DOM-tooltip concern, not a 3D one.
 */
export interface OutlineKindHandle extends KindHandle {
  setHoveredCountry?(id: string | null): void;
  setPointerPixel?(x: number, y: number): void;
}

/**
 * Outline kind — vector country borders rendered as `LineSegments` on top
 * of a solid sphere. The default look. Country interaction (hover/click +
 * highlight) is fully supported via the shared picking infrastructure.
 *
 * Extras shipped on top of the base mesh:
 *  - `HoverGlowLayer` — soft additive halo that wraps the hovered country.
 *  - `FocusPulseLayer` — sonar ring that fires from `onCountryFocus`.
 *  - `HoverCrosshairLayer` — Tron-style targeting reticle + lat/lng readout
 *    that tracks the cursor across the globe surface.
 *  - Continent dim — when hovering a country, borders on other continents
 *    fade to ~30% so the active region is foregrounded.
 * All default-on; toggle via `GlobeConfig.outline.{...}`.
 */
export const outlineKind: KindModule = {
  kind: 'outline',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens, config }: KindBuildContext): OutlineKindHandle {
    const layer = new CountriesLayer({
      features,
      borderColor: tokens['countries.border.color'],
      borderWidth: tokens['countries.border.width'],
      borderOpacity: tokens['countries.border.opacity'],
    });
    globeGroup.add(layer.group);

    const outlineConfig = config.outline;
    const glowEnabled = outlineConfig?.hoverGlow?.enabled ?? true;
    const pulseEnabled = outlineConfig?.focusPulse?.enabled ?? true;
    const crosshairEnabled = outlineConfig?.hoverCrosshair?.enabled ?? true;
    const dimEnabled = outlineConfig?.continentDim?.enabled ?? true;
    const dimAmount = outlineConfig?.continentDim?.amount ?? DEFAULT_DIM_AMOUNT;

    const glow: HoverGlowLayer | null = glowEnabled
      ? new HoverGlowLayer({
          color: tokens['countries.borderHover.glowColor'],
          width: tokens['countries.borderHover.glowWidth'],
          opacity: tokens['countries.borderHover.glowOpacity'],
        })
      : null;
    if (glow) {
      glow.registerFeatures(features as ReadonlyArray<CountryFeature>);
      globeGroup.add(glow.object);
    }

    const pulseDurationMs = outlineConfig?.focusPulse?.durationMs ?? DEFAULT_PULSE_DURATION_MS;
    const pulseColor = outlineConfig?.focusPulse?.color ?? tokens['countries.borderActive.color'];
    const pulse: FocusPulseLayer | null = pulseEnabled
      ? new FocusPulseLayer({
          color: pulseColor,
          durationSeconds: pulseDurationMs / 1000,
        })
      : null;
    if (pulse) globeGroup.add(pulse.group);

    const crosshair: HoverCrosshairLayer | null = crosshairEnabled
      ? new HoverCrosshairLayer({
          container: config.container,
          color: tokens['countries.borderHover.color'],
        })
      : null;
    if (crosshair) globeGroup.add(crosshair.object);

    // Memoize per-id continent so we never lookup twice during a hover stream.
    const continentCache = new Map<string, Continent | null>();
    const cachedContinent = (id: string): Continent | null => {
      if (continentCache.has(id)) return continentCache.get(id) ?? null;
      const c = continentOf(id);
      continentCache.set(id, c);
      return c;
    };
    let dimDirty = false;
    let lastPixelX = 0;
    let lastPixelY = 0;

    return {
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        if (glow) {
          glow.dispose();
          globeGroup.remove(glow.object);
        }
        if (pulse) {
          pulse.dispose();
          globeGroup.remove(pulse.group);
        }
        if (crosshair) {
          crosshair.dispose();
          globeGroup.remove(crosshair.object);
        }
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        if (glow) glow.object.visible = visible && glow.object.visible;
        if (pulse) pulse.group.visible = visible;
        if (crosshair) crosshair.setEnabled(visible);
      },
      update(delta: number) {
        glow?.update(delta);
        pulse?.update(delta);
        crosshair?.update(delta);
        if (dimEnabled || dimDirty) {
          const moved = layer.tickOpacity(delta, DEFAULT_DIM_TAU);
          if (!moved) dimDirty = false;
        }
      },
      onCountryFocus(latLng: LatLng) {
        pulse?.spawn(latLng);
      },
      onPointerMove(point3D: Vector3 | null, latLng: LatLng | null) {
        if (!crosshair) return;
        if (point3D && latLng) {
          crosshair.showAt(point3D, latLng, lastPixelX, lastPixelY);
        } else {
          crosshair.hide();
        }
      },
      setPointerPixel(x: number, y: number) {
        lastPixelX = x;
        lastPixelY = y;
      },
      setHoveredCountry(id: string | null) {
        if (glow) {
          if (id === null) glow.clear();
          else glow.showCountry(id);
        }
        if (!dimEnabled) return;
        if (id === null) {
          layer.resetAllOpacityTargets();
          dimDirty = true;
          return;
        }
        const hoveredContinent = cachedContinent(id);
        // If the hovered country is not in any continent bucket, don't dim —
        // we have no signal to compare against.
        if (hoveredContinent === null) {
          layer.resetAllOpacityTargets();
          dimDirty = true;
          return;
        }
        for (const feature of features) {
          if (feature.id === id) {
            layer.setCountryOpacityTarget(feature.id, 1);
            continue;
          }
          const other = cachedContinent(feature.id);
          const sameContinent = other !== null && other === hoveredContinent;
          layer.setCountryOpacityTarget(feature.id, sameContinent ? 1 : dimAmount);
        }
        dimDirty = true;
      },
    };
  },
};

export { CountriesLayer } from './borders-layer';
export { continentOf } from './continent-of';
export { formatLatLng, HoverCrosshairLayer } from './hover-crosshair';
export { FocusPulseLayer, computePulseFrame } from './focus-pulse-layer';
export { HoverGlowLayer } from './hover-glow-layer';
