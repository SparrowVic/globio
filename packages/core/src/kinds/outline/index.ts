import { OutlineBordersLayer } from './borders';
import { continentOf, type Continent } from './continent-of';
import { OutlineCrosshairLayer } from './crosshair';
import { OutlineHoverGlowLayer } from './hover-glow';
import { OutlineLabelsLayer } from './labels';
import { OutlineStarfieldLayer } from './starfield';
import { OutlineArcsLayer } from './arcs';
import { OutlineMarkersLayer } from './markers';
import { OutlineAtmosphereLayer } from './atmosphere';
import { OutlineSelectionLayer } from './selection';
import { OutlineCountryFillLayer } from './country-fill';
import { buildOutlineFocusPulse } from '../shared/focus-pulse-decorators';
import { BarsLayer } from '../../data-layers/bars/bars-layer';
import { ChartsLayer } from '../../data-layers/charts/charts-layer';
import { ExtrudedCountriesLayer } from '../../data-layers/extruded/extruded-layer';
import { HeatmapLayer } from '../../data-layers/heatmap/heatmap-layer';
import { HexBinLayer } from '../../data-layers/hexbin/hexbin-layer';
import { DoubleSide, MeshBasicMaterial } from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';
import type {
  BarsDataLayer,
  ChartsDataLayer,
  ChoroplethDataLayer,
  DataLayer,
  DataLayerHandle,
  ExtrudedDataLayer,
  HeatmapDataLayer,
  HexBinDataLayer,
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

const withOutlineHeatmapDefaults = (
  layer: HeatmapDataLayer,
  gridColor: string
): HeatmapDataLayer => ({
  ...layer,
  ...(layer.grid === undefined && {
    grid: {
      stepDeg: 6,
      widthDeg: 0.08,
      opacity: 0.09,
      majorEvery: 5,
      majorOpacity: 0.18,
      color: gridColor,
      densityFade: 0.2,
    },
  }),
  ...(layer.contours === undefined &&
    (layer.maxHeight ?? 0) > 0 && {
      contours: {
        interval: 0.075,
        width: 0.0045,
        opacity: 0.2,
        majorEvery: 4,
        majorOpacity: 0.38,
        color: '#d8fff3',
        densityFade: 0.045,
      },
    }),
  ...(layer.rimFade === undefined && {
    rimFade: (layer.maxHeight ?? 0) > 0 ? 0.34 : 0.14,
  }),
  ...(layer.zoomScaling === undefined && {
    zoomScaling: {
      closeDistance: 1.45,
      farDistance: 3.1,
      closeHeightScale: 0.52,
      farHeightScale: 1,
      closeOpacityScale: 0.88,
      farOpacityScale: 1,
      thresholdBoost: 0.035,
      gridBoost: 0.5,
      contourBoost: 0.55,
    },
  }),
});

/**
 * Outline kind extras: `setHoveredCountry` for the glow halo + continent
 * dim, `setPointerPixel` for the crosshair tooltip's container-local xy.
 * The base `onPointerMove` hook gives us 3D + lat/lng; pixel coords come
 * separately because they're a DOM-tooltip concern, not a 3D one.
 */
export interface OutlineKindHandle extends KindHandle {
  setHoveredCountry?(id: string | null): void;
  setPointerPixel?(x: number, y: number): void;
  /**
   * Live-update the outline-kind decoration knobs that aren't geometry
   * baked: hoverGlow toggle, hoverCrosshair toggle, continentDim
   * enabled + amount. Other outline knobs (hover.lift, glowLift) bake
   * into geometry and still require a rebuild upstream.
   */
  setOutlineConfig?(next: NonNullable<import('../../types').GlobeConfig['outline']>): void;
  /**
   * Live setters for the additive hover-glow halo. Surfaced on the
   * handle (rather than a generic kind interface) because only the
   * outline kind mounts a glow today; `create-globe.ts` reaches in
   * via duck-typed cast when the user tweaks
   * `countries.borderHover.glow*` so non-outline kinds silently no-op.
   */
  setHoverGlowColor?(color: string): void;
  setHoverGlowWidth?(width: number): void;
  setHoverGlowOpacity?(opacity: number): void;
  /**
   * Surfaces the per-kind `OutlineCountryFillLayer` instance so
   * `create-globe.ts` can stash it in `state.countryFillLayer` and
   * drive hover / active state from the same global hover/click
   * pipeline that drives the stroke layer. Typed via `Public<>` to
   * bypass the per-kind/private-field nominal typing — the public
   * surface is what `create-globe.ts` actually consumes.
   */
  getCountryFillLayer?(): import('../types').Public<
    import('../../renderer/countries-fill-layer').CountriesFillLayer
  >;
}

/**
 * Outline kind — vector country borders rendered as `LineSegments` on top
 * of a solid sphere. The default look. Country interaction (hover/click +
 * highlight) is fully supported via the shared picking infrastructure.
 *
 * Extras shipped on top of the base mesh:
 *  - `OutlineHoverGlowLayer` — soft additive halo that wraps the hovered country.
 *  - `OutlineFocusPulseLayer` — sonar ring that fires from `onCountryFocus`.
 *  - `OutlineCrosshairLayer` — Tron-style targeting reticle + lat/lng readout
 *    that tracks the cursor across the globe surface.
 *  - Continent dim — when hovering a country, borders on other continents
 *    fade to ~30% so the active region is foregrounded.
 * All default-on; toggle via `GlobeConfig.outline.{...}`.
 */
export const outlineKind: KindModule = {
  kind: 'outline',
  hasCountryInteraction: true,
  layers: {
    LabelsLayer: OutlineLabelsLayer,
    StarfieldLayer: OutlineStarfieldLayer,
    ArcsLayer: OutlineArcsLayer,
    MarkersLayer: OutlineMarkersLayer,
    AtmosphereLayer: OutlineAtmosphereLayer,
    SelectionLayer: OutlineSelectionLayer,
    CountryFillLayer: OutlineCountryFillLayer,
  },
  build({ globeGroup, features, tokens, config }: KindBuildContext): OutlineKindHandle {
    const layer = new OutlineBordersLayer({
      features,
      borderColor: tokens['countries.border.color'],
      borderWidth: tokens['countries.border.width'],
      borderOpacity: tokens['countries.border.opacity'],
    });
    globeGroup.add(layer.group);

    // Per-country fill — owned by outline kind. Construction reads
    // every `countries.fill.*` override (mode, palette, default colour,
    // state colours) so the layer wakes up in the right state on init
    // without a follow-up live update. Choropleth data-layer reuses
    // this same instance via `setData(map, scale?)`.
    const fillCfg = config.countries?.fill;
    const fill = new OutlineCountryFillLayer({
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
      ...(fillCfg?.hoverColor && fillCfg.hoverColor !== '' && {
        hoverColor: fillCfg.hoverColor,
      }),
      ...(fillCfg?.hoverOpacity !== undefined && fillCfg.hoverOpacity > 0 && {
        hoverOpacity: fillCfg.hoverOpacity,
      }),
      ...(fillCfg?.activeColor && fillCfg.activeColor !== '' && {
        activeColor: fillCfg.activeColor,
      }),
      ...(fillCfg?.activeOpacity !== undefined && fillCfg.activeOpacity > 0 && {
        activeOpacity: fillCfg.activeOpacity,
      }),
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
    const heatmapBuilder: DataLayerBuilder = (input: DataLayer, ctx): DataLayerHandle => {
      const cfg = withOutlineHeatmapDefaults(
        input as HeatmapDataLayer,
        tokens['countries.border.color']
      );
      const heatmap = new HeatmapLayer({
        layer: cfg,
        countryFeatures: features as ReadonlyArray<CountryFeature>,
        fallbackColor: tokens['countries.borderActive.color'],
        opacity: 1,
      });
      heatmap.updateView(ctx.camera.position.length());
      globeGroup.add(heatmap.mesh);
      return {
        type: 'heatmap',
        update(delta: number) {
          heatmap.updateView(ctx.camera.position.length());
          heatmap.tick(delta);
        },
        setData(next: DataLayer) {
          heatmap.setData(
            withOutlineHeatmapDefaults(
              next as HeatmapDataLayer,
              tokens['countries.border.color']
            )
          );
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

    // Outline hex-bin: spatial aggregation into icosphere face cells.
    // Uses vertex-coloured BufferGeometry — each cell gets its own 3-vertex
    // triangle so colours don't bleed into neighbours.
    const hexbinBuilder: DataLayerBuilder = (input: DataLayer, ctx): DataLayerHandle => {
      const cfg = input as HexBinDataLayer;
      const layer = new HexBinLayer({
        layer: cfg,
        fallbackColor: tokens['countries.fill.defaultColor'],
        camera: ctx.camera,
        ...(ctx.domElement ? { domElement: ctx.domElement } : {}),
      });
      globeGroup.add(layer.group);
      return {
        type: 'hexbin',
        update(delta: number) {
          layer.tick(delta);
        },
        setData(next: DataLayer) {
          layer.setData(next as HexBinDataLayer);
        },
        playAnimation() {
          return layer.playAnimation();
        },
        dispose() {
          layer.dispose();
          globeGroup.remove(layer.group);
        },
      };
    };

    // Outline charts: multi-series chart visualisations anchored at lat/lng
    // (or country centroid). Solid `MeshBasicMaterial` per-bar/segment so
    // colours read crisply against the dark outline backdrop.
    const chartsBuilder: DataLayerBuilder = (input: DataLayer, ctx): DataLayerHandle => {
      const cfg = input as ChartsDataLayer;
      const charts = new ChartsLayer({
        layer: cfg,
        countryFeatures: features as ReadonlyArray<CountryFeature>,
        fallbackColor: tokens['countries.fill.defaultColor'],
        camera: ctx.camera,
        ...(ctx.domElement ? { domElement: ctx.domElement } : {}),
      });
      globeGroup.add(charts.group);
      return {
        type: 'charts',
        update(delta: number) {
          charts.tick(delta);
        },
        setData(next: DataLayer) {
          charts.setData(next as ChartsDataLayer);
        },
        playAnimation() {
          return charts.playAnimation();
        },
        dispose() {
          charts.dispose();
          globeGroup.remove(charts.group);
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
    // Mutable so `setOutlineConfig` can flip them at runtime — the
    // hover / setVisible / setHoveredCountry handlers all read the
    // latest value each tick rather than capturing once.
    let glowEnabled = outlineConfig?.hoverGlow?.enabled ?? true;
    const pulseEnabled = outlineConfig?.focusPulse?.enabled ?? true;
    let crosshairEnabledNow = outlineConfig?.hoverCrosshair?.enabled ?? true;
    let dimEnabled = outlineConfig?.continentDim?.enabled ?? true;
    let dimAmount = outlineConfig?.continentDim?.amount ?? DEFAULT_DIM_AMOUNT;

    // Glow keeps its 0.35% lift by default — that's the soft halo "behind"
    // the highlight. Caller can dial it through OutlineConfig.hover.glowLift
    // (e.g. 0 = glow flat on the surface, 0.006 = pulled further out).
    const glowLift = outlineConfig?.hover?.glowLift ?? 0.0035;
    // Honour per-instance overrides from `countries.borderHover.glow*`
    // (the same pattern create-globe.ts uses for the stroke colours).
    // Empty string / non-positive numeric falls back to the theme token.
    const glowOverride = config.countries?.borderHover;
    const glow: OutlineHoverGlowLayer | null = glowEnabled
      ? new OutlineHoverGlowLayer({
          color:
            glowOverride?.glowColor && glowOverride.glowColor !== ''
              ? glowOverride.glowColor
              : tokens['countries.borderHover.glowColor'],
          width:
            glowOverride?.glowWidth !== undefined && glowOverride.glowWidth > 0
              ? glowOverride.glowWidth
              : tokens['countries.borderHover.glowWidth'],
          opacity:
            glowOverride?.glowOpacity !== undefined && glowOverride.glowOpacity > 0
              ? glowOverride.glowOpacity
              : tokens['countries.borderHover.glowOpacity'],
          surfaceRadius: GLOBE_RADIUS * (1 + glowLift),
        })
      : null;
    if (glow) {
      glow.registerFeatures(features as ReadonlyArray<CountryFeature>);
      globeGroup.add(glow.object);
    }

    const pulseConfig = outlineConfig?.focusPulse;
    const pulseDurationMs = pulseConfig?.durationMs ?? DEFAULT_PULSE_DURATION_MS;
    // Empty-string color = "use theme default" sentinel (mirrors the
    // live-update path's reset semantic).
    const pulseColor =
      pulseConfig?.color && pulseConfig.color !== ''
        ? pulseConfig.color
        : tokens['countries.borderActive.color'];
    const focusPulse: FocusPulseDecorator = buildOutlineFocusPulse({
      globeGroup,
      enabled: pulseEnabled,
      color: pulseColor,
      durationSeconds: pulseDurationMs / 1000,
      overrides: {
        ...(pulseConfig?.angularRadiusBase !== undefined && {
          angularRadiusBase: pulseConfig.angularRadiusBase,
        }),
        ...(pulseConfig?.angularBand !== undefined && { angularBand: pulseConfig.angularBand }),
        ...(pulseConfig?.scaleMin !== undefined && { scaleMin: pulseConfig.scaleMin }),
        ...(pulseConfig?.scaleMax !== undefined && { scaleMax: pulseConfig.scaleMax }),
        ...(pulseConfig?.peakOpacity !== undefined && { peakOpacity: pulseConfig.peakOpacity }),
        ...(pulseConfig?.segments !== undefined && { segments: pulseConfig.segments }),
        ...(pulseConfig?.radiusFactor !== undefined && { radiusFactor: pulseConfig.radiusFactor }),
      },
    });

    // Always construct the layer so we can toggle visibility live —
    // creating the layer is cheap, and skipping the build means a
    // later setEnabled(true) wouldn't have anywhere to mount.
    const crosshairConfig = outlineConfig?.hoverCrosshair;
    const crosshair: OutlineCrosshairLayer = new OutlineCrosshairLayer({
      container: config.container,
      color:
        crosshairConfig?.color && crosshairConfig.color !== ''
          ? crosshairConfig.color
          : tokens['countries.borderHover.color'],
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
          hexbin: hexbinBuilder,
          charts: chartsBuilder,
        },
      },
      getCountryFillLayer: () => fill,
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
        crosshair.dispose();
        globeGroup.remove(crosshair.object);
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        if (glow) glow.object.visible = visible && glowEnabled;
        crosshair.setEnabled(visible && crosshairEnabledNow);
        fill.group.visible = visible && fill.group.visible;
      },
      update(delta: number) {
        if (glow && glowEnabled) glow.update(delta);
        if (crosshairEnabledNow) crosshair.update(delta);
        fill.update(delta);
        if (dimEnabled || dimDirty) {
          const moved = layer.tickOpacity(delta, DEFAULT_DIM_TAU);
          if (!moved) dimDirty = false;
        }
      },
      onPointerMove(point3D: Vector3 | null, latLng: LatLng | null) {
        if (!crosshairEnabledNow) {
          crosshair.hide();
          return;
        }
        if (point3D && latLng) {
          crosshair.showAt(point3D, latLng, lastPixelX, lastPixelY);
        } else {
          crosshair.hide();
        }
      },
      /**
       * Live update for outline-kind extras. Each field maps to the
       * relevant closure / layer setter; the next render frame picks up
       * the change. Hover lift / glowLift are geometry-baked (surface
       * radius bakes into the line geometry) and require a rebuild —
       * they're handled by the workshop's `rebuildKeys` path.
       */
      setOutlineConfig(next: NonNullable<typeof config.outline>) {
        if (next.hoverGlow !== undefined) {
          const enabled = next.hoverGlow.enabled ?? glowEnabled;
          glowEnabled = enabled;
          if (glow) {
            glow.object.visible = enabled;
            if (!enabled) glow.clear();
          }
        }
        if (next.hoverCrosshair !== undefined) {
          const c = next.hoverCrosshair;
          if (c.enabled !== undefined) {
            crosshairEnabledNow = c.enabled;
            crosshair.setEnabled(c.enabled);
            if (!c.enabled) crosshair.hide();
          }
          if (c.color !== undefined) {
            crosshair.setColor(
              c.color === '' ? tokens['countries.borderHover.color'] : c.color,
            );
          }
          if (c.size !== undefined) crosshair.setSize(c.size);
          if (c.opacity !== undefined) crosshair.setOpacity(c.opacity);
          if (c.ringRadiusFactor !== undefined)
            crosshair.setRingRadiusFactor(c.ringRadiusFactor);
          if (c.cardinalTicks !== undefined) crosshair.setCardinalTicks(c.cardinalTicks);
          if (c.tooltip !== undefined) crosshair.setTooltipVisible(c.tooltip);
          if (c.tooltipDecimals !== undefined)
            crosshair.setTooltipDecimals(c.tooltipDecimals);
        }
        if (next.continentDim !== undefined) {
          const enabled = next.continentDim.enabled ?? dimEnabled;
          if (next.continentDim.amount !== undefined) dimAmount = next.continentDim.amount;
          if (enabled !== dimEnabled) {
            dimEnabled = enabled;
            if (!enabled) {
              // Restore every country's opacity target back to 1 so the
              // dim effect releases immediately.
              layer.resetAllOpacityTargets();
              dimDirty = true;
            }
          }
        }
      },
      setPointerPixel(x: number, y: number) {
        lastPixelX = x;
        lastPixelY = y;
      },
      setHoverGlowColor(color: string) {
        glow?.setColor(color);
      },
      setHoverGlowWidth(width: number) {
        glow?.setWidth(width);
      },
      setHoverGlowOpacity(opacity: number) {
        glow?.setOpacity(opacity);
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

export { OutlineBordersLayer } from './borders';
export { continentOf } from './continent-of';
export { formatLatLng, OutlineCrosshairLayer } from './crosshair';
export { OutlineFocusPulseLayer, computePulseFrame } from './focus-pulse';
export { OutlineHoverGlowLayer } from './hover-glow';
