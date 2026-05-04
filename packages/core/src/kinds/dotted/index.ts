import { DottedSurfaceLayer } from './surface';
import { DottedBorderDotsLayer } from './border-dots';
import { BarsLayer } from '../../data-layers/bars/bars-layer';
import { ExtrudedCountriesLayer } from '../../data-layers/extruded/extruded-layer';
import { HeatmapLayer } from '../../data-layers/heatmap/heatmap-layer';
import { AdditiveBlending, DoubleSide, MeshBasicMaterial, Vector3 } from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryDataMap, DottedConfig, LatLng } from '../../types';
import type {
  DataLayerBuilder,
  FocusPulseDecorator,
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

const DEFAULT_CURSOR_WAKE_AMPLITUDE = 0.6;
const DEFAULT_CURSOR_WAKE_FADE = 0.45;
const DEFAULT_CURSOR_WAKE_WIDTH = 0.09;
const DEFAULT_EQUATOR_BOOST = 0.35;
const DEFAULT_TROPICS_BOOST = 0.18;
const DEFAULT_LAT_BAND_WIDTH_DEG = 4;
const DEFAULT_BREATH_AMPLITUDE = 0.12;
const DEFAULT_BREATH_SPEED = 0.35;
const DEFAULT_CONSTELLATION_OPACITY = 0.55;
const DEFAULT_CONSTELLATION_DISTANCE_FACTOR = 1.6;

const resolveDriftAxis = (
  configured: DottedConfig['drift'] extends infer T ? T : never,
  tokenAxis: string | number | boolean | undefined,
): 'ns' | 'ew' | 'both' => {
  const supplied = (configured as { axis?: string } | undefined)?.axis;
  if (supplied === 'ew' || supplied === 'ns' || supplied === 'both') return supplied;
  return tokenAxis === 'ew' ? 'ew' : 'ns';
};

/**
 * Dotted kind extras — every visual emerges from the same dot grid, so
 * the kindHandle exposes:
 *  - `setHoveredCountry` — drives both the hover-dot expansion AND the
 *    constellation lines from the same hover signal as the picking layer.
 *  - `setPointerSurface` — streams the latest cursor surface position so
 *    the cursor-wake ripple can ride alongside the cursor.
 *  - `setDottedConfig` — live-update hatch for every dotted knob (color,
 *    size, ripple, flash, drift, hover, cursor wake, latitude bands,
 *    breath, constellation). No rebuild needed.
 */
export interface DottedKindHandle extends KindHandle {
  setHoveredCountry?(id: string | null): void;
  /**
   * Pin a country as "active" — its dots get a steady brightness boost
   * plus a slow sine pulse, independent of the transient hover signal.
   * Surfaced as the dotted analogue of the standard
   * `CountryHighlightLayer.activeLayer` outline (which dotted opts out
   * of).
   */
  setActiveCountry?(id: string | null): void;
  setPointerSurface?(point3D: import('three').Vector3 | null): void;
  setDottedConfig?(next: DottedConfig): void;
}

/**
 * Dotted kind — Apple/Stripe-style "dot field". A `THREE.Points` cloud
 * fills each country at a regular lat/lng grid; no visible borders. Every
 * effect emerges from those dots: ripples brighten, flashes recolor,
 * drift waves, latitude bands emphasise parallels, breath oscillates
 * the whole grid, hover expansion + constellation lines literally
 * connect star-chart pairs from the dot field.
 *
 * Reads tokens `countries.dotted.{color,size,density,opacity}` and the
 * effect tokens `countries.dotted.{rippleBoost,rippleSpeed,rippleWidth,
 * flashColor,flashStrength,flashDecay,driftAmplitude,driftSpeed,driftFreq,
 * driftAxis,hoverScale,hoverBrightnessBoost,hoverDuration}`. Per-instance
 * overrides come from `config.dotted.{...}`.
 */
export const dottedKind: KindModule = {
  kind: 'dotted',
  hasCountryInteraction: true,
  // Dotted's hover / active feedback emerges from the dot field itself:
  // the country's dots brighten + scale via `hoverDots` and (optionally)
  // a constellation/border-dot layer fades in. A LineSegments stroke on
  // top of dots reads as foreign material — opt out of the shared
  // CountryHighlightLayer entirely.
  usesStandardCountryHighlight: false,
  build({ globeGroup, features, tokens, config }: KindBuildContext): DottedKindHandle {
    const dottedCfg = config.dotted;
    const ripple = dottedCfg?.clickRipple;
    const flash = dottedCfg?.dataFlash;
    const drift = dottedCfg?.drift;
    const hoverDots = dottedCfg?.hoverDots;
    const appearance = dottedCfg?.appearance;
    const cursorWake = dottedCfg?.cursorWake;
    const latitudeBands = dottedCfg?.latitudeBands;
    const pulseBreath = dottedCfg?.pulseBreath;
    const constellation = dottedCfg?.constellation;
    const tokenAxis = tokens['countries.dotted.driftAxis'];
    const driftAxis = resolveDriftAxis(drift, tokenAxis);
    const layer = new DottedSurfaceLayer({
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
      rippleColor: ripple?.color ?? '',
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
      appearanceColor: appearance?.color ?? '',
      appearanceSizeScale: appearance?.sizeScale ?? 1,
      appearanceOpacity: appearance?.opacity ?? 0,
      cursorWakeEnabled: cursorWake?.enabled ?? true,
      cursorWakeAmplitude: cursorWake?.amplitude ?? DEFAULT_CURSOR_WAKE_AMPLITUDE,
      cursorWakeFade: cursorWake?.fade ?? DEFAULT_CURSOR_WAKE_FADE,
      cursorWakeWidth: cursorWake?.width ?? DEFAULT_CURSOR_WAKE_WIDTH,
      latitudeBandsEnabled: latitudeBands?.enabled ?? false,
      equatorBoost: latitudeBands?.equatorBoost ?? DEFAULT_EQUATOR_BOOST,
      tropicsBoost: latitudeBands?.tropicsBoost ?? DEFAULT_TROPICS_BOOST,
      latitudeBandWidth: latitudeBands?.width ?? DEFAULT_LAT_BAND_WIDTH_DEG,
      pulseBreathEnabled: pulseBreath?.enabled ?? false,
      pulseBreathAmplitude: pulseBreath?.amplitude ?? DEFAULT_BREATH_AMPLITUDE,
      pulseBreathSpeed: pulseBreath?.speed ?? DEFAULT_BREATH_SPEED,
      constellationEnabled: constellation?.enabled ?? false,
      constellationColor: constellation?.color ?? '',
      constellationOpacity: constellation?.opacity ?? DEFAULT_CONSTELLATION_OPACITY,
      constellationDistanceFactor:
        constellation?.distanceFactor ?? DEFAULT_CONSTELLATION_DISTANCE_FACTOR,
    });
    globeGroup.add(layer.group);

    // Border dots — the dotted kind's answer to "outline the hovered /
    // active country". Samples each country's outer ring at fixed
    // angular intervals and emits brighter dots that fade in on
    // hover / pin. Lives on the same shell as the interior dot field
    // so the demarcation reads as part of the same family of marks
    // rather than a foreign decoration on top.
    const borderDots = new DottedBorderDotsLayer({
      features: features as ReadonlyArray<CountryFeature>,
      countryIndex: layer.getCountryIndex(),
      color: tokens['countries.dotted.color'],
    });
    globeGroup.add(borderDots.object);

    // Dotted-native focus pulse: instead of a band ring lifted above the
    // surface (the outline / hologram pattern), the focus event spawns a
    // ripple wave *through* the dot field — same brightness curve as
    // click ripples, just centered on the country's centroid (or click
    // point, depending on `focusPulse.origin`). The wave emerges from
    // the same dots the user is already looking at, so the feedback
    // reads as the field reacting to the focus rather than an extra
    // decoration parked on top.
    const focusPulse: FocusPulseDecorator = {
      spawn(latLng: LatLng) {
        const origin = latLngToVector3(latLng, GLOBE_RADIUS, new Vector3());
        layer.spawnRipple(origin);
      },
      // No per-frame work — the dotted layer's update() already ticks
      // the ripple pool.
      update: () => undefined,
      dispose: () => undefined,
    };

    // Dotted heatmap: shader-based density texture; lower opacity so the
    // dot field shows through underneath.
    const heatmapBuilder: DataLayerBuilder = (input: DataLayer, ctx): DataLayerHandle => {
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
        update(delta: number) {
          heatmap.updateView(ctx.camera.position.length());
          heatmap.tick(delta);
        },
        setData(next: DataLayer) {
          heatmap.setData(next as HeatmapDataLayer);
        },
        playAnimation() {
          return heatmap.playAnimation();
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
        borderDots.dispose();
        globeGroup.remove(borderDots.object);
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        borderDots.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(delta, elapsedSeconds);
        borderDots.update(delta, elapsedSeconds);
      },
      onPointerDown(point3D: Vector3) {
        layer.spawnRipple(point3D);
      },
      onPointerMove(point3D: Vector3 | null, _latLng: LatLng | null) {
        layer.setCursorPosition(point3D);
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
      setActiveCountry(id: string | null) {
        layer.setActiveCountry(id);
        borderDots.setActiveCountry(id, layer.getCountryIndex());
      },
      setHoveredCountry(id: string | null) {
        layer.setHoveredCountry(id);
        borderDots.setHoveredCountry(id, layer.getCountryIndex());
      },
      setPointerSurface(point3D: Vector3 | null) {
        layer.setCursorPosition(point3D);
      },
      /**
       * Live update the dotted-kind effect knobs. Each branch delegates
       * to a setter on the underlying layer — every knob updates in
       * place via uniforms / material props, no rebuild. Empty-string
       * colors / non-positive numerics behave as "reset to default"
       * sentinels (matching the outline / atmosphere live update path).
       */
      setDottedConfig(next: DottedConfig) {
        if (next.appearance !== undefined) {
          const a = next.appearance;
          if (a.color !== undefined) layer.setBaseColor(a.color);
          if (a.sizeScale !== undefined) layer.setSizeScale(a.sizeScale);
          if (a.opacity !== undefined) layer.setOpacity(a.opacity);
        }
        if (next.clickRipple !== undefined) {
          const r = next.clickRipple;
          if (r.enabled !== undefined) layer.setRippleEnabled(r.enabled);
          if (r.boost !== undefined) layer.setRippleBoost(r.boost);
          if (r.speed !== undefined) layer.setRippleSpeed(r.speed);
          if (r.width !== undefined) layer.setRippleWidth(r.width);
          if (r.maxConcurrent !== undefined) layer.setRippleMaxConcurrent(r.maxConcurrent);
          if (r.color !== undefined) layer.setRippleColor(r.color);
        }
        if (next.dataFlash !== undefined) {
          const f = next.dataFlash;
          if (f.enabled !== undefined) layer.setFlashEnabled(f.enabled);
          if (f.strength !== undefined) layer.setFlashStrength(f.strength);
          if (f.decay !== undefined) layer.setFlashDecay(f.decay);
          if (f.color !== undefined) layer.setFlashColor(f.color);
        }
        if (next.drift !== undefined) {
          const d = next.drift;
          if (d.enabled !== undefined) layer.setDriftEnabled(d.enabled);
          if (d.amplitude !== undefined) layer.setDriftAmplitude(d.amplitude);
          if (d.speed !== undefined) layer.setDriftSpeed(d.speed);
          if (d.freq !== undefined) layer.setDriftFreq(d.freq);
          if (d.axis !== undefined) layer.setDriftAxis(d.axis);
          if (d.perCountryPhase !== undefined)
            layer.setPerCountryPhase(d.perCountryPhase);
        }
        if (next.hoverDots !== undefined) {
          const h = next.hoverDots;
          if (h.enabled !== undefined) layer.setHoverEnabled(h.enabled);
          if (h.scale !== undefined) layer.setHoverScale(h.scale);
          if (h.brightnessBoost !== undefined) layer.setHoverBrightnessBoost(h.brightnessBoost);
          if (h.duration !== undefined) layer.setHoverDuration(h.duration);
          if (h.lift !== undefined) layer.setHoverLift(h.lift);
        }
        if (next.activeCountry !== undefined) {
          const a = next.activeCountry;
          // `enabled: false` collapses every active visual: pin can
          // still record an id but the shader ignores it.
          if (a.enabled !== undefined) {
            layer.setActiveBoost(a.enabled ? (a.boost ?? 0.65) : 0);
            layer.setActiveScale(a.enabled ? (a.scale ?? 1.18) : 1);
            layer.setActiveLift(a.enabled ? (a.lift ?? 0.012) : 0);
          } else {
            if (a.boost !== undefined) layer.setActiveBoost(a.boost);
            if (a.scale !== undefined) layer.setActiveScale(a.scale);
            if (a.lift !== undefined) layer.setActiveLift(a.lift);
          }
          if (a.pulseSpeed !== undefined) layer.setActivePulseSpeed(a.pulseSpeed);
        }
        if (next.borderDots !== undefined) {
          const b = next.borderDots;
          if (b.enabled !== undefined) borderDots.setVisible(b.enabled);
          if (b.color !== undefined) {
            borderDots.setColor(
              b.color === '' ? tokens['countries.dotted.color'] : b.color,
            );
          }
          if (b.size !== undefined) borderDots.setSize(b.size);
          if (b.opacity !== undefined) borderDots.setOpacity(b.opacity);
        }
        if (next.cursorWake !== undefined) {
          const w = next.cursorWake;
          if (w.enabled !== undefined) layer.setCursorWakeEnabled(w.enabled);
          if (w.amplitude !== undefined) layer.setCursorWakeAmplitude(w.amplitude);
          if (w.fade !== undefined) layer.setCursorWakeFade(w.fade);
          if (w.width !== undefined) layer.setCursorWakeWidth(w.width);
        }
        if (next.latitudeBands !== undefined) {
          const b = next.latitudeBands;
          if (b.enabled !== undefined) layer.setLatitudeBandsEnabled(b.enabled);
          if (b.equatorBoost !== undefined) layer.setEquatorBoost(b.equatorBoost);
          if (b.tropicsBoost !== undefined) layer.setTropicsBoost(b.tropicsBoost);
          if (b.width !== undefined) layer.setLatitudeBandWidth(b.width);
        }
        if (next.pulseBreath !== undefined) {
          const p = next.pulseBreath;
          if (p.enabled !== undefined) layer.setPulseBreathEnabled(p.enabled);
          if (p.amplitude !== undefined) layer.setPulseBreathAmplitude(p.amplitude);
          if (p.speed !== undefined) layer.setPulseBreathSpeed(p.speed);
        }
        if (next.constellation !== undefined) {
          const c = next.constellation;
          if (c.enabled !== undefined) layer.setConstellationEnabled(c.enabled);
          if (c.color !== undefined) layer.setConstellationColor(c.color);
          if (c.opacity !== undefined) layer.setConstellationOpacity(c.opacity);
          if (c.distanceFactor !== undefined) layer.setConstellationDistanceFactor(c.distanceFactor);
        }
      },
    };
  },
};

export { DottedSurfaceLayer } from './surface';
export {
  rippleBrightness,
  flashBrightness,
  angularDistance,
  driftBrightness,
  easeHoverBoost,
} from './effects';
