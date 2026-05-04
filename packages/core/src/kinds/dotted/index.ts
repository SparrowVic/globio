import { DottedSurfaceLayer } from './surface';
import { DottedLabelsLayer } from './labels';
import { DottedStarfieldLayer } from './starfield';
import { DottedArcsLayer } from './arcs';
import { DottedMarkersLayer } from './markers';
import { DottedAtmosphereLayer } from './atmosphere';
import { DottedSelectionLayer } from './selection';
import { DottedCountryFillLayer } from './country-fill';
import { DottedCrosshairLayer } from './crosshair';
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
  setPointerPixel?(x: number, y: number): void;
  setDottedConfig?(next: DottedConfig): void;
  /**
   * Live-update for the crosshair sub-tree (color/size/opacity/etc.).
   * Dotted mounts its dotted-native crosshair (concentric dot rings,
   * not the outline cross+ring stroke) but reads its config from the
   * same `config.outline.hoverCrosshair` path the workshop card writes
   * to — keeping the workshop UI single-sourced rather than
   * duplicating knobs. `create-globe.ts` dispatches `partial.outline`
   * to whichever kindHandle is active, so dotted picks up workshop
   * crosshair edits via this hook.
   */
  setOutlineConfig?(next: NonNullable<import('../../types').GlobeConfig['outline']>): void;
  /**
   * Surfaces the dotted kind's `DottedCountryFillLayer` instance so
   * `create-globe.ts` can stash it in `state.countryFillLayer` and
   * route hover / active overrides + the choropleth data layer's
   * `setData` through it. Outline already exposes the same accessor;
   * dotted mounts the layer too because the fill mesh sits *behind*
   * the dot field — visible through the gaps between dots, so a
   * `palette` mode tints each country with a colour readable behind
   * its dot cluster, and `hoverColor` / `activeColor` make the
   * focused country glow under its dots in real time.
   */
  getCountryFillLayer?(): import('../types').Public<
    import('../../renderer/countries-fill-layer').CountriesFillLayer
  >;
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
  layers: {
    LabelsLayer: DottedLabelsLayer,
    StarfieldLayer: DottedStarfieldLayer,
    ArcsLayer: DottedArcsLayer,
    MarkersLayer: DottedMarkersLayer,
    AtmosphereLayer: DottedAtmosphereLayer,
    SelectionLayer: DottedSelectionLayer,
    CountryFillLayer: DottedCountryFillLayer,
  },
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

    // Country-edge highlight is baked into the surface layer itself
    // (`aIsEdge` per dot) — surface dots whose grid neighbours fall
    // outside the country pick up an extra brightness + lift on hover
    // and active. No separate boundary layer.

    // Country-fill mesh sits *behind* the dot surface (radius
    // 1.0008 vs 1.001) so it shows through the gaps between dots.
    // Visible only when the user picks a non-`'none'` mode in the
    // workshop or sets choropleth data; `mode: 'none'` keeps the
    // layer mounted but hidden so live mode flips don't need a
    // rebuild. Hover / active fill overrides flow through the same
    // global pipeline outline uses (create-globe.ts hover handler →
    // `setHoverState`).
    const fillCfg = config.countries?.fill;
    const fill = new DottedCountryFillLayer({
      features: features as ReadonlyArray<CountryFeature>,
      defaultColor:
        fillCfg?.defaultColor && fillCfg.defaultColor !== ''
          ? fillCfg.defaultColor
          : tokens['countries.fill.defaultColor'],
      defaultOpacity:
        fillCfg?.defaultOpacity !== undefined && fillCfg.defaultOpacity > 0
          ? fillCfg.defaultOpacity
          : tokens['countries.fill.opacity'],
      ...(fillCfg?.mode !== undefined && { mode: fillCfg.mode }),
      ...(fillCfg?.palette !== undefined && { palette: fillCfg.palette }),
      ...(fillCfg?.hoverColor &&
        fillCfg.hoverColor !== '' && { hoverColor: fillCfg.hoverColor }),
      ...(fillCfg?.hoverOpacity !== undefined &&
        fillCfg.hoverOpacity > 0 && { hoverOpacity: fillCfg.hoverOpacity }),
      ...(fillCfg?.activeColor &&
        fillCfg.activeColor !== '' && { activeColor: fillCfg.activeColor }),
      ...(fillCfg?.activeOpacity !== undefined &&
        fillCfg.activeOpacity > 0 && { activeOpacity: fillCfg.activeOpacity }),
    });
    globeGroup.add(fill.group);

    // Crosshair — dotted-native dot reticle (canonical
    // `kinds/dotted/crosshair.ts`, concentric dot rings instead of
    // the outline cross+ring). Reads its config from the same
    // `config.outline.hoverCrosshair` path the workshop crosshair
    // card writes to, so the user gets a single source of truth
    // across kinds. Always constructed so live `setEnabled(true)`
    // has somewhere to mount.
    const crosshairConfig = config.outline?.hoverCrosshair;
    let crosshairEnabledNow = crosshairConfig?.enabled ?? true;
    const crosshair: DottedCrosshairLayer = new DottedCrosshairLayer({
      container: config.container,
      color:
        crosshairConfig?.color && crosshairConfig.color !== ''
          ? crosshairConfig.color
          : tokens['countries.dotted.color'],
      ...(crosshairConfig?.size !== undefined && { size: crosshairConfig.size }),
      ...(crosshairConfig?.opacity !== undefined && { opacity: crosshairConfig.opacity }),
      ...(crosshairConfig?.ringRadiusFactor !== undefined && {
        ringRadiusFactor: crosshairConfig.ringRadiusFactor,
      }),
      ...(crosshairConfig?.cardinalTicks !== undefined && {
        cardinalTicks: crosshairConfig.cardinalTicks,
      }),
      ...(crosshairConfig?.tooltip !== undefined && { tooltip: crosshairConfig.tooltip }),
      ...(crosshairConfig?.tooltipDecimals !== undefined && {
        tooltipDecimals: crosshairConfig.tooltipDecimals,
      }),
    });
    crosshair.setEnabled(crosshairEnabledNow);
    globeGroup.add(crosshair.object);

    // Pointer pixel state — fed by `setPointerPixel` (called from
    // create-globe's pointer pipeline) so the crosshair tooltip can
    // anchor next to the cursor in container-local pixels.
    let lastPixelX = 0;
    let lastPixelY = 0;

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
          // Choropleth wired through the country-fill layer — same
          // pattern outline uses, just on dotted's per-kind class.
          // The fill mesh shows through the gaps between dots, so
          // a value-driven palette renders as country-coloured
          // backdrop with the dot field on top.
          choropleth: (input: DataLayer): DataLayerHandle => {
            const cfg = input as import('../../data-layers/types').ChoroplethDataLayer;
            fill.setData(cfg.data, cfg.scale);
            return {
              type: 'choropleth',
              setData(next: DataLayer) {
                const ncfg = next as import('../../data-layers/types').ChoroplethDataLayer;
                fill.setData(ncfg.data, ncfg.scale);
              },
              dispose() {
                fill.setData(null);
              },
            };
          },
        },
      },
      getCountryFillLayer: () => fill,
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        fill.dispose();
        globeGroup.remove(fill.group);
        crosshair.dispose();
        globeGroup.remove(crosshair.object);
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        crosshair.setEnabled(visible && crosshairEnabledNow);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(delta, elapsedSeconds);
        if (crosshairEnabledNow) crosshair.update(delta);
      },
      onPointerDown(point3D: Vector3) {
        layer.spawnRipple(point3D);
      },
      onPointerMove(point3D: Vector3 | null, latLng: LatLng | null) {
        layer.setCursorPosition(point3D);
        if (!crosshairEnabledNow) {
          crosshair.hide();
          return;
        }
        if (point3D === null || latLng === null) {
          crosshair.hide();
        } else {
          crosshair.showAt(point3D, latLng, lastPixelX, lastPixelY);
        }
      },
      setPointerPixel(x: number, y: number) {
        lastPixelX = x;
        lastPixelY = y;
      },
      setOutlineConfig(next) {
        // Dotted only cares about the crosshair sub-tree — outline /
        // hover-glow / continent-dim / focus-pulse band knobs are
        // outline-specific and meaningless on dotted. The workshop
        // crosshair card writes here, so this is the live-update
        // path for crosshair colour / opacity / size / etc.
        const c = next.hoverCrosshair;
        if (c === undefined) return;
        if (c.enabled !== undefined) {
          crosshairEnabledNow = c.enabled;
          crosshair.setEnabled(c.enabled);
          if (!c.enabled) crosshair.hide();
        }
        if (c.color !== undefined) {
          crosshair.setColor(
            c.color === '' ? tokens['countries.dotted.color'] : c.color,
          );
        }
        if (c.size !== undefined) crosshair.setSize(c.size);
        if (c.opacity !== undefined) crosshair.setOpacity(c.opacity);
        if (c.ringRadiusFactor !== undefined) crosshair.setRingRadiusFactor(c.ringRadiusFactor);
        if (c.cardinalTicks !== undefined) crosshair.setCardinalTicks(c.cardinalTicks);
        if (c.tooltip !== undefined) crosshair.setTooltipVisible(c.tooltip);
        if (c.tooltipDecimals !== undefined) crosshair.setTooltipDecimals(c.tooltipDecimals);
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
      },
      setHoveredCountry(id: string | null) {
        layer.setHoveredCountry(id);
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
        if (next.edge !== undefined) {
          const e = next.edge;
          // `enabled: false` collapses the rim highlight by zeroing both
          // boost and lift; flipping back on restores the explicit
          // values (or the defaults if none supplied).
          if (e.enabled !== undefined) {
            layer.setEdgeBoost(e.enabled ? (e.boost ?? 0.55) : 0);
            layer.setEdgeLift(e.enabled ? (e.lift ?? 0.004) : 0);
          } else {
            if (e.boost !== undefined) layer.setEdgeBoost(e.boost);
            if (e.lift !== undefined) layer.setEdgeLift(e.lift);
          }
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
