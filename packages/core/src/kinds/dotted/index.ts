import { CountriesDottedLayer } from './dotted-layer';
import { buildDottedFocusPulse } from '../shared/focus-pulse-decorators';
import { BarsLayer } from '../../data-layers/bars/bars-layer';
import { ExtrudedCountriesLayer } from '../../data-layers/extruded/extruded-layer';
import { HeatmapLayer } from '../../data-layers/heatmap/heatmap-layer';
import { AdditiveBlending, DoubleSide, MeshBasicMaterial } from 'three';
import type { CountryDataMap } from '../../types';
import type {
  DataLayerBuilder,
  KindBuildContext,
  KindHandle,
  KindModule,
} from '../types';
import type {
  BarsDataLayer,
  DataLayer,
  DataLayerHandle,
  ExtrudedDataLayer,
  HeatmapDataLayer,
} from '../../data-layers/types';
import type { CountryFeature } from '../../renderer/country-feature';

/**
 * Dotted kind extras: a `setHoveredCountry` widening so globe.ts can drive
 * the dot expansion + brighten effect from the same hover signal as the
 * outline kind's glow halo.
 */
export interface DottedKindHandle extends KindHandle {
  setHoveredCountry?(id: string | null): void;
}

/**
 * Dotted kind — Apple/Stripe-style. A `THREE.Points` cloud fills each
 * country at a regular lat/lng grid; no visible borders. Hover/click still
 * work via the shared picking layer.
 *
 * Reads tokens `countries.dotted.{color,size,density,opacity}` and the
 * effect tokens `countries.dotted.{rippleBoost,rippleSpeed,rippleWidth,
 * flashColor,flashStrength,flashDecay,driftAmplitude,driftSpeed,driftFreq,
 * driftAxis,hoverScale,hoverBrightnessBoost,hoverDuration}`. Per-instance
 * overrides come from `config.dotted.{clickRipple,dataFlash,drift,hoverDots}`.
 */
export const dottedKind: KindModule = {
  kind: 'dotted',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens, config }: KindBuildContext): DottedKindHandle {
    const dottedCfg = config.dotted;
    const ripple = dottedCfg?.clickRipple;
    const flash = dottedCfg?.dataFlash;
    const drift = dottedCfg?.drift;
    const hoverDots = dottedCfg?.hoverDots;
    const tokenAxis = tokens['countries.dotted.driftAxis'];
    const driftAxis: 'ns' | 'ew' = drift?.axis ?? (tokenAxis === 'ew' ? 'ew' : 'ns');
    const layer = new CountriesDottedLayer({
      features,
      color: tokens['countries.dotted.color'],
      size: tokens['countries.dotted.size'],
      density: tokens['countries.dotted.density'],
      opacity: tokens['countries.dotted.opacity'],
      rippleBoost: ripple?.boost ?? tokens['countries.dotted.rippleBoost'],
      rippleSpeed: ripple?.speed ?? tokens['countries.dotted.rippleSpeed'],
      rippleWidth: ripple?.width ?? tokens['countries.dotted.rippleWidth'],
      rippleEnabled: ripple?.enabled !== false,
      rippleMaxConcurrent: ripple?.maxConcurrent ?? 3,
      flashColor: tokens['countries.dotted.flashColor'],
      flashStrength: flash?.strength ?? tokens['countries.dotted.flashStrength'],
      flashDecay: flash?.decay ?? tokens['countries.dotted.flashDecay'],
      flashEnabled: flash?.enabled !== false,
      driftEnabled: drift?.enabled !== false,
      driftAmplitude: drift?.amplitude ?? tokens['countries.dotted.driftAmplitude'],
      driftSpeed: drift?.speed ?? tokens['countries.dotted.driftSpeed'],
      driftFreq: drift?.freq ?? tokens['countries.dotted.driftFreq'],
      driftAxis,
      hoverEnabled: hoverDots?.enabled !== false,
      hoverScale: hoverDots?.scale ?? tokens['countries.dotted.hoverScale'],
      hoverBrightnessBoost:
        hoverDots?.brightnessBoost ?? tokens['countries.dotted.hoverBrightnessBoost'],
      hoverDuration: hoverDots?.duration ?? tokens['countries.dotted.hoverDuration'],
    });
    globeGroup.add(layer.group);

    const focusPulse = buildDottedFocusPulse({
      globeGroup,
      enabled: true,
      color: tokens['countries.dotted.color'],
      durationSeconds: 1.1,
    });

    // Dotted heatmap: shader-based density texture; lower opacity so the
    // dot field shows through underneath.
    const heatmapBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as HeatmapDataLayer;
      const heatmap = new HeatmapLayer({
        layer: cfg,
        countryFeatures: features as ReadonlyArray<CountryFeature>,
        fallbackColor: tokens['countries.dotted.color'],
        opacity: 0.85,
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

    // Dotted extruded: country pillars with additive glow palette.
    const extrudedBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as ExtrudedDataLayer;
      const fallback = tokens['countries.dotted.color'];
      const extruded = new ExtrudedCountriesLayer({
        features: features as ReadonlyArray<CountryFeature>,
        layer: cfg,
        fallbackColor: fallback,
        buildMaterial: (color) =>
          new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.7,
            side: DoubleSide,
            blending: AdditiveBlending,
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

    // Dotted bars: additive glow cylinders that match the dot palette.
    // Solid colored bars would clash with the soft dot field; additive
    // blending + the dot color reads as "dots stacked vertically".
    const barsBuilder: DataLayerBuilder = (input: DataLayer): DataLayerHandle => {
      const cfg = input as BarsDataLayer;
      const fallback = tokens['countries.dotted.color'];
      const bars = new BarsLayer({
        features: features as ReadonlyArray<CountryFeature>,
        layer: cfg,
        fallbackColor: fallback,
        buildMaterial: (color) =>
          new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.85,
            blending: AdditiveBlending,
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

    return {
      decorations: {
        focusPulse,
        dataLayers: {
          bars: barsBuilder,
          extruded: extrudedBuilder,
          heatmap: heatmapBuilder,
        },
      },
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(delta, elapsedSeconds);
      },
      onPointerDown(point3D) {
        layer.spawnRipple(point3D);
      },
      onCountryDataChange(next: CountryDataMap | null, prev: CountryDataMap | null) {
        if (!next) return;
        for (const [id, entry] of Object.entries(next)) {
          const before = prev?.[id];
          if (before === undefined || before.value !== entry.value) {
            layer.spawnFlash(id);
          }
        }
      },
      setHoveredCountry(id: string | null) {
        layer.setHoveredCountry(id);
      },
    };
  },
};

export { CountriesDottedLayer } from './dotted-layer';
export {
  rippleBrightness,
  flashBrightness,
  angularDistance,
  driftBrightness,
  easeHoverBoost,
} from './dotted-effects';
