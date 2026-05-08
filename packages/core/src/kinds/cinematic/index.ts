import { CinematicArcsLayer } from './arcs';
import { CinematicAtmosphereLayer } from './atmosphere';
import { CinematicBordersLayer } from './borders';
import { CinematicCityLightsLayer } from './city-lights';
import { CinematicCountryFillLayer } from './country-fill';
import { CinematicCrosshairLayer } from './crosshair';
import { buildCinematicFocusPulse } from './focus-pulse';
import { CinematicLabelsLayer } from './labels';
import { CinematicMarkersLayer } from './markers';
import { CinematicSurfaceNetworkLayer } from './network';
import { CinematicSelectionLayer } from './selection';
import { CinematicStarfieldLayer } from './starfield';
import { CinematicSurfaceLayer } from './surface';
import { HeatmapLayer } from '../../data-layers/heatmap/heatmap-layer';
import type { CountryFeature } from '../../renderer/country-feature';
import type {
  ChoroplethDataLayer,
  DataLayer,
  DataLayerHandle,
  HeatmapDataLayer,
} from '../../data-layers/types';
import type { GlobeConfig } from '../../types';
import type { CinematicConfig } from '../../types/kinds';
import type {
  DataLayerBuilder,
  KindBuildContext,
  KindHandle,
  KindModule,
  Public,
} from '../types';

const DEFAULT_CITY_LIGHTS_COUNT = 6200;
const DEFAULT_NETWORK_CONNECTIONS = 44;

export interface CinematicKindHandle extends KindHandle {
  setCinematicConfig?(partial: CinematicConfig): void;
  setOutlineConfig?(next: NonNullable<GlobeConfig['outline']>): void;
  setPointerPixel?(x: number, y: number): void;
  getCountryFillLayer?(): Public<
    import('../../renderer/countries-fill-layer').CountriesFillLayer
  >;
}

export const cinematicKind: KindModule = {
  kind: 'cinematic',
  hasCountryInteraction: true,
  layers: {
    LabelsLayer: CinematicLabelsLayer,
    StarfieldLayer: CinematicStarfieldLayer,
    ArcsLayer: CinematicArcsLayer,
    MarkersLayer: CinematicMarkersLayer,
    AtmosphereLayer: CinematicAtmosphereLayer,
    SelectionLayer: CinematicSelectionLayer,
    CountryFillLayer: CinematicCountryFillLayer,
  },
  build({
    globeGroup,
    features,
    tokens,
    config,
    globeSurfaceMesh,
  }: KindBuildContext): CinematicKindHandle {
    const cinematic = config.cinematic ?? {};
    const surfaceCfg = cinematic.surface ?? {};
    const bordersCfg = cinematic.borders ?? {};
    const cityCfg = cinematic.cityLights ?? {};
    const networkCfg = cinematic.network ?? {};

    const previouslyVisible = globeSurfaceMesh.visible;
    globeSurfaceMesh.visible = false;

    const surface = new CinematicSurfaceLayer({
      oceanColor: pickColor(surfaceCfg.oceanColor, tokens['cinematic.oceanColor']),
      landColor: pickColor(surfaceCfg.landColor, tokens['cinematic.landColor']),
      cloudColor: pickColor(surfaceCfg.cloudColor, tokens['cinematic.cloudColor']),
      nightColor: pickColor(surfaceCfg.nightColor, tokens['cinematic.nightColor']),
      lightDirection: surfaceCfg.lightDirection ?? [
        tokens['cinematic.lightDirectionX'],
        tokens['cinematic.lightDirectionY'],
        tokens['cinematic.lightDirectionZ'],
      ],
      lightingMode: surfaceCfg.lightingMode ?? 'hero',
      terminatorSoftness: pickPositive(
        surfaceCfg.terminatorSoftness,
        tokens['cinematic.terminatorSoftness'],
      ),
      terminatorContrast: pickPositive(
        surfaceCfg.terminatorContrast,
        tokens['cinematic.terminatorContrast'],
      ),
      keyIntensity: pickPositive(surfaceCfg.keyIntensity, tokens['cinematic.keyIntensity']),
      fillIntensity:
        surfaceCfg.fillIntensity !== undefined && surfaceCfg.fillIntensity >= 0
          ? surfaceCfg.fillIntensity
          : tokens['cinematic.fillIntensity'],
      rimColor: pickColor(surfaceCfg.rimColor, tokens['cinematic.rimColor']),
      rimIntensity: pickPositive(surfaceCfg.rimIntensity, tokens['cinematic.rimIntensity']),
      rimPower: pickPositive(surfaceCfg.rimPower, tokens['cinematic.rimPower']),
      specularIntensity:
        surfaceCfg.specularIntensity !== undefined && surfaceCfg.specularIntensity >= 0
          ? surfaceCfg.specularIntensity
          : tokens['cinematic.specularIntensity'],
      ...(surfaceCfg.cloudOpacity !== undefined && { cloudOpacity: surfaceCfg.cloudOpacity }),
      ...(surfaceCfg.oceanSheen !== undefined && { oceanSheen: surfaceCfg.oceanSheen }),
    });
    globeGroup.add(surface.mesh);

    const fillCfg = config.countries?.fill;
    const fill = new CinematicCountryFillLayer({
      features: features as ReadonlyArray<CountryFeature>,
      defaultColor: pickColor(fillCfg?.defaultColor, tokens['cinematic.landColor']),
      defaultOpacity: pickPositive(fillCfg?.defaultOpacity, tokens['countries.fill.opacity']),
      mode: fillCfg?.mode ?? 'none',
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

    let bordersEnabledNow = bordersCfg.enabled ?? true;
    const borders = new CinematicBordersLayer({
      features: features as ReadonlyArray<CountryFeature>,
      color: pickColor(bordersCfg.color, tokens['cinematic.borderColor']),
      intensity: pickPositive(bordersCfg.intensity, tokens['cinematic.borderIntensity']),
      glitch: {
        enabled: false,
        intervalMin: 999,
        intervalMax: 999,
        amount: 0,
        channelShift: 0,
      },
    });
    borders.setVisible(bordersEnabledNow);
    globeGroup.add(borders.group);

    let cityLightsEnabledNow = cityCfg.enabled ?? true;
    const cityLights = new CinematicCityLightsLayer({
      color: pickColor(cityCfg.color, tokens['cinematic.cityLightColor']),
      intensity: pickPositive(cityCfg.intensity, tokens['cinematic.cityLightIntensity']),
      count: cityCfg.count ?? DEFAULT_CITY_LIGHTS_COUNT,
      ...(cityCfg.size !== undefined && { size: cityCfg.size }),
      twinkle: cityCfg.twinkle ?? true,
    });
    cityLights.setVisible(cityLightsEnabledNow);
    globeGroup.add(cityLights.points);

    let networkEnabledNow = networkCfg.enabled ?? true;
    const network = new CinematicSurfaceNetworkLayer({
      color: pickColor(networkCfg.color, tokens['cinematic.networkColor']),
      opacity:
        networkCfg.opacity !== undefined && networkCfg.opacity >= 0
          ? networkCfg.opacity
          : tokens['cinematic.networkOpacity'],
      maxConnections: networkCfg.maxConnections ?? DEFAULT_NETWORK_CONNECTIONS,
      ...(networkCfg.pulseSpeed !== undefined && { pulseSpeed: networkCfg.pulseSpeed }),
    });
    network.setVisible(networkEnabledNow);
    globeGroup.add(network.lines);

    const pulseCfg = cinematic.focusPulse ?? {};
    const focusPulse = buildCinematicFocusPulse({
      globeGroup,
      enabled: config.focusPulse?.enabled !== false,
      color: pickColor(pulseCfg.color, tokens['cinematic.borderColor']),
      durationSeconds: pulseCfg.durationMs !== undefined ? pulseCfg.durationMs / 1000 : 1.35,
      overrides: {
        ...(pulseCfg.angularRadiusBase !== undefined && {
          angularRadiusBase: pulseCfg.angularRadiusBase,
        }),
        ...(pulseCfg.angularBand !== undefined && { angularBand: pulseCfg.angularBand }),
        ...(pulseCfg.scaleMin !== undefined && { scaleMin: pulseCfg.scaleMin }),
        ...(pulseCfg.scaleMax !== undefined && { scaleMax: pulseCfg.scaleMax }),
        ...(pulseCfg.peakOpacity !== undefined && { peakOpacity: pulseCfg.peakOpacity }),
        ...(pulseCfg.radiusFactor !== undefined && { radiusFactor: pulseCfg.radiusFactor }),
        ...(pulseCfg.segments !== undefined && { segments: pulseCfg.segments }),
      },
    });

    const crosshairCfg = config.outline?.hoverCrosshair;
    let crosshairEnabledNow = crosshairCfg?.enabled ?? true;
    const crosshair = new CinematicCrosshairLayer({
      container: config.container,
      color: pickColor(crosshairCfg?.color, tokens['cinematic.borderColor']),
      ...(crosshairCfg?.size !== undefined && { size: crosshairCfg.size }),
      ...(crosshairCfg?.opacity !== undefined && { opacity: crosshairCfg.opacity }),
      ...(crosshairCfg?.ringRadiusFactor !== undefined && {
        ringRadiusFactor: crosshairCfg.ringRadiusFactor,
      }),
      ...(crosshairCfg?.cardinalTicks !== undefined && {
        cardinalTicks: crosshairCfg.cardinalTicks,
      }),
      ...(crosshairCfg?.tooltip !== undefined && { tooltip: crosshairCfg.tooltip }),
      ...(crosshairCfg?.tooltipDecimals !== undefined && {
        tooltipDecimals: crosshairCfg.tooltipDecimals,
      }),
    });
    crosshair.setEnabled(crosshairEnabledNow);
    globeGroup.add(crosshair.object);
    let lastPixelX = 0;
    let lastPixelY = 0;

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
          fill.setMode(fillCfg?.mode ?? 'none');
        },
      };
    };

    const heatmapBuilder: DataLayerBuilder = (input: DataLayer, ctx): DataLayerHandle => {
      const heatmap = new HeatmapLayer({
        layer: withCinematicHeatmapDefaults(
          input as HeatmapDataLayer,
          tokens['cinematic.networkColor'],
        ),
        countryFeatures: features as ReadonlyArray<CountryFeature>,
        fallbackColor: tokens['cinematic.cityLightColor'],
        opacity: 0.92,
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
            withCinematicHeatmapDefaults(
              next as HeatmapDataLayer,
              tokens['cinematic.networkColor'],
            ),
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

    return {
      decorations: {
        focusPulse,
        dataLayers: {
          choropleth: choroplethBuilder,
          heatmap: heatmapBuilder,
        },
      },
      getCountryFillLayer: () => fill,
      dispose() {
        globeSurfaceMesh.visible = previouslyVisible;
        focusPulse.dispose();
        crosshair.dispose();
        globeGroup.remove(crosshair.object);
        network.dispose();
        globeGroup.remove(network.lines);
        cityLights.dispose();
        globeGroup.remove(cityLights.points);
        borders.dispose();
        globeGroup.remove(borders.group);
        fill.dispose();
        globeGroup.remove(fill.group);
        surface.dispose();
        globeGroup.remove(surface.mesh);
      },
      setVisible(visible: boolean) {
        surface.setVisible(visible);
        fill.group.visible = visible;
        borders.setVisible(visible && bordersEnabledNow);
        cityLights.setVisible(visible && cityLightsEnabledNow);
        network.setVisible(visible && networkEnabledNow);
        crosshair.setEnabled(visible && crosshairEnabledNow);
      },
      update(delta: number, elapsedSeconds: number) {
        surface.update(elapsedSeconds);
        fill.update(delta);
        borders.update(elapsedSeconds, delta);
        cityLights.update(delta, elapsedSeconds);
        network.update(delta, elapsedSeconds);
        if (crosshairEnabledNow) crosshair.update(delta);
      },
      onPointerMove(point3D, latLng) {
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
        const c = next.hoverCrosshair;
        if (c === undefined) return;
        if (c.enabled !== undefined) {
          crosshairEnabledNow = c.enabled;
          crosshair.setEnabled(c.enabled);
          if (!c.enabled) crosshair.hide();
        }
        if (c.color !== undefined) crosshair.setColor(pickColor(c.color, tokens['cinematic.borderColor']));
        if (c.size !== undefined) crosshair.setSize(c.size);
        if (c.opacity !== undefined) crosshair.setOpacity(c.opacity);
        if (c.ringRadiusFactor !== undefined) crosshair.setRingRadiusFactor(c.ringRadiusFactor);
        if (c.cardinalTicks !== undefined) crosshair.setCardinalTicks(c.cardinalTicks);
        if (c.tooltip !== undefined) crosshair.setTooltipVisible(c.tooltip);
        if (c.tooltipDecimals !== undefined) crosshair.setTooltipDecimals(c.tooltipDecimals);
      },
      setCinematicConfig(partial: CinematicConfig) {
        if (partial.surface !== undefined) {
          const s = partial.surface;
          if (s.oceanColor !== undefined) surface.setOceanColor(s.oceanColor);
          if (s.landColor !== undefined) surface.setLandColor(s.landColor);
          if (s.cloudColor !== undefined) surface.setCloudColor(s.cloudColor);
          if (s.nightColor !== undefined) surface.setNightColor(s.nightColor);
          if (s.lightDirection !== undefined) surface.setLightDirection(s.lightDirection);
          if (s.lightingMode !== undefined) surface.setLightingMode(s.lightingMode);
          if (s.terminatorSoftness !== undefined) surface.setTerminatorSoftness(s.terminatorSoftness);
          if (s.terminatorContrast !== undefined) surface.setTerminatorContrast(s.terminatorContrast);
          if (s.keyIntensity !== undefined) surface.setKeyIntensity(s.keyIntensity);
          if (s.fillIntensity !== undefined) surface.setFillIntensity(s.fillIntensity);
          if (s.rimColor !== undefined) surface.setRimColor(s.rimColor);
          if (s.rimIntensity !== undefined) surface.setRimIntensity(s.rimIntensity);
          if (s.rimPower !== undefined) surface.setRimPower(s.rimPower);
          if (s.specularIntensity !== undefined) surface.setSpecularIntensity(s.specularIntensity);
          if (s.cloudOpacity !== undefined) surface.setCloudOpacity(s.cloudOpacity);
          if (s.oceanSheen !== undefined) surface.setOceanSheen(s.oceanSheen);
        }
        if (partial.borders !== undefined) {
          const b = partial.borders;
          if (b.enabled !== undefined) {
            bordersEnabledNow = b.enabled;
            borders.setVisible(b.enabled);
          }
          if (b.color !== undefined) borders.setColor(b.color);
          if (b.intensity !== undefined) borders.setIntensity(b.intensity);
        }
        if (partial.cityLights !== undefined) {
          const c = partial.cityLights;
          if (c.enabled !== undefined) {
            cityLightsEnabledNow = c.enabled;
            cityLights.setVisible(c.enabled);
          }
          if (c.color !== undefined) cityLights.setColor(c.color);
          if (c.intensity !== undefined) cityLights.setIntensity(c.intensity);
          if (c.count !== undefined) cityLights.setCount(c.count);
          if (c.size !== undefined) cityLights.setSize(c.size);
          if (c.twinkle !== undefined) cityLights.setTwinkle(c.twinkle);
        }
        if (partial.network !== undefined) {
          const n = partial.network;
          if (n.enabled !== undefined) {
            networkEnabledNow = n.enabled;
            network.setVisible(n.enabled);
          }
          if (n.color !== undefined) network.setColor(n.color);
          if (n.opacity !== undefined) network.setOpacity(n.opacity);
          if (n.maxConnections !== undefined) network.setMaxConnections(n.maxConnections);
          if (n.pulseSpeed !== undefined) network.setPulseSpeed(n.pulseSpeed);
        }
        if (partial.focusPulse !== undefined) {
          const p = partial.focusPulse;
          focusPulse.setOptions?.({
            ...(p.durationMs !== undefined ? { durationSeconds: p.durationMs / 1000 } : {}),
            ...(p.angularRadiusBase !== undefined && {
              angularRadiusBase: p.angularRadiusBase,
            }),
            ...(p.angularBand !== undefined && { angularBand: p.angularBand }),
            ...(p.scaleMin !== undefined && { scaleMin: p.scaleMin }),
            ...(p.scaleMax !== undefined && { scaleMax: p.scaleMax }),
            ...(p.peakOpacity !== undefined && { peakOpacity: p.peakOpacity }),
            ...(p.radiusFactor !== undefined && { radiusFactor: p.radiusFactor }),
            ...(p.segments !== undefined && { segments: p.segments }),
            ...(p.color !== undefined && { color: p.color }),
          });
        }
      },
    };
  },
};

const pickColor = (value: string | undefined, fallback: string): string =>
  value && value !== '' ? value : fallback;

const pickPositive = (value: number | undefined, fallback: number): number =>
  value !== undefined && value > 0 ? value : fallback;

const withCinematicHeatmapDefaults = (
  layer: HeatmapDataLayer,
  accent: string,
): HeatmapDataLayer => ({
  ...layer,
  ...(layer.blendMode === undefined && { blendMode: 'additive' as const }),
  ...(layer.grid === undefined && {
    grid: {
      stepDeg: 6,
      widthDeg: 0.055,
      opacity: 0.08,
      majorEvery: 6,
      majorOpacity: 0.18,
      color: accent,
      densityFade: 0.14,
    },
  }),
  ...(layer.contours === undefined &&
    (layer.maxHeight ?? 0) > 0 && {
      contours: {
        interval: 0.08,
        width: 0.0038,
        opacity: 0.22,
        majorEvery: 4,
        majorOpacity: 0.34,
        color: '#fff0b8',
        densityFade: 0.04,
      },
    }),
  ...(layer.rimFade === undefined && { rimFade: 0.32 }),
});

export { CinematicSurfaceLayer } from './surface';
export { CinematicCityLightsLayer } from './city-lights';
export { CinematicSurfaceNetworkLayer } from './network';
export { CinematicBordersLayer } from './borders';
