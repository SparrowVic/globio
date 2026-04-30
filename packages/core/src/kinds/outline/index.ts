import { CountriesLayer } from './borders-layer';
import { continentOf, type Continent } from './continent-of';
import { HoverCrosshairLayer } from './hover-crosshair';
import { HoverGlowLayer } from './hover-glow-layer';
import { buildOutlineFocusPulse } from '../shared/focus-pulse-decorators';
import { CountriesFillLayer } from '../../renderer/countries-fill-layer';
import { BarsLayer } from '../../data-layers/bars/bars-layer';
import { ExtrudedCountriesLayer } from '../../data-layers/extruded/extruded-layer';
import { HeatmapLayer } from '../../data-layers/heatmap/heatmap-layer';
import { DoubleSide, MeshBasicMaterial } from 'three';
import type { CountryFeature } from '../../renderer/country-feature';
import type {
  BarsDataLayer,
  ChoroplethDataLayer,
  DataLayer,
  DataLayerHandle,
  ExtrudedDataLayer,
  HeatmapDataLayer,
} from '../../data-layers/types';
import type {
  DataLayerBuilder,
  FocusPulseDecorator,
  KindBuildContext,
  KindHandle,
  KindModule,
} from '../types';
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

    // Per-country fill — owned by outline kind, surfaced as the `choropleth`
    // data-layer decoration. Hidden until `setDataLayer({type:'choropleth'})`
    // (or the legacy `setCountryData`) routes data through here.
    const fill = new CountriesFillLayer({
      features: features as ReadonlyArray<CountryFeature>,
      defaultColor: tokens['countries.fill.defaultColor'],
      defaultOpacity: tokens['countries.fill.opacity'],
    });
    globeGroup.add(fill.group);

    const choroplethBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as ChoroplethDataLayer;
      fill.setData(cfg.data, cfg.scale);
      return {
        type: 'choropleth',
        setData(next: DataLayer) {
          const ncfg = next as ChoroplethDataLayer;
          fill.setData(ncfg.data, ncfg.scale);
        },
        dispose() {
          fill.setData(null);
        },
      };
    };

    // Outline heatmap: shader-based density texture rendering. The shader
    // does its own additive-style blending via colour * shaped(t) so we
    // pass full opacity through and let the layer handle the rest.
    const heatmapBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as HeatmapDataLayer;
      const heatmap = new HeatmapLayer({
        layer: cfg,
        fallbackColor: tokens['countries.borderActive.color'],
        opacity: 1,
      });
      globeGroup.add(heatmap.mesh);
      return {
        type: 'heatmap',
        setData(next: DataLayer) {
          heatmap.setData(next as HeatmapDataLayer);
        },
        dispose() {
          heatmap.dispose();
          globeGroup.remove(heatmap.mesh);
        },
      };
    };

    // Outline extruded: opaque colored 3D pillars per country. DoubleSide so
    // walls render correctly when looking under a steep angle.
    const extrudedBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as ExtrudedDataLayer;
      const fallback = tokens['countries.fill.defaultColor'];
      const extruded = new ExtrudedCountriesLayer({
        features: features as ReadonlyArray<CountryFeature>,
        layer: cfg,
        fallbackColor: fallback,
        buildMaterial: (color) =>
          new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.85,
            side: DoubleSide,
            depthWrite: false,
          }),
      });
      globeGroup.add(extruded.group);
      return {
        type: 'extruded',
        update(delta: number) {
          extruded.update(delta);
        },
        dispose() {
          extruded.dispose();
          globeGroup.remove(extruded.group);
        },
      };
    };

    // Outline bars: solid colored cylinders. We default to the active border
    // color so unscaled data still reads as "outline-look" — but a layer's
    // own scale or per-entry color overrides this on a per-bar basis.
    const barsBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as BarsDataLayer;
      const fallback = tokens['countries.borderActive.color'];
      const bars = new BarsLayer({
        features: features as ReadonlyArray<CountryFeature>,
        layer: cfg,
        fallbackColor: fallback,
        buildMaterial: (color) =>
          new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          }),
      });
      globeGroup.add(bars.group);
      return {
        type: 'bars',
        update(delta: number) {
          bars.update(delta);
        },
        dispose() {
          bars.dispose();
          globeGroup.remove(bars.group);
        },
      };
    };

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
    const focusPulse: FocusPulseDecorator = buildOutlineFocusPulse({
      globeGroup,
      enabled: pulseEnabled,
      color: pulseColor,
      durationSeconds: pulseDurationMs / 1000,
    });

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
      decorations: {
        focusPulse,
        dataLayers: {
          choropleth: choroplethBuilder,
          bars: barsBuilder,
          extruded: extrudedBuilder,
          heatmap: heatmapBuilder,
        },
      },
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        fill.dispose();
        globeGroup.remove(fill.group);
        if (glow) {
          glow.dispose();
          globeGroup.remove(glow.object);
        }
        focusPulse.dispose();
        if (crosshair) {
          crosshair.dispose();
          globeGroup.remove(crosshair.object);
        }
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        if (glow) glow.object.visible = visible && glow.object.visible;
        if (crosshair) crosshair.setEnabled(visible);
        fill.group.visible = visible && fill.group.visible;
      },
      update(delta: number) {
        glow?.update(delta);
        crosshair?.update(delta);
        fill.update(delta);
        if (dimEnabled || dimDirty) {
          const moved = layer.tickOpacity(delta, DEFAULT_DIM_TAU);
          if (!moved) dimDirty = false;
        }
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
