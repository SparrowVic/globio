import { Vector3 } from 'three';
import { CinematicArcsLayer } from './arcs';
import { CinematicAtmosphereLayer } from './atmosphere';
import { CinematicBordersLayer } from './borders';
import { CinematicCityLightsLayer } from './city-lights';
import { CinematicCloudsLayer } from './clouds';
import { CinematicCountryFillLayer } from './country-fill';
import { CinematicCrosshairLayer } from './crosshair';
import { buildCinematicFocusPulse } from './focus-pulse';
import { CinematicLabelsLayer } from './labels';
import { CinematicMarkersLayer } from './markers';
import { CinematicSurfaceNetworkLayer } from './network';
import { CinematicSelectionLayer } from './selection';
import { CinematicStarfieldLayer } from './starfield';
import { CinematicSunController, CinematicSunDiscLayer } from './sun';
import { CinematicSurfaceLayer } from './surface';
import { CinematicTextureSet } from './textures';
import { HeatmapLayer } from '../../data-layers/heatmap/heatmap-layer';
import { buildCinematicSurfaceAtlas, buildDensityTexture } from './atlas';
import { prepareCinematicData } from './data';
import { CinematicWorld, type CinematicQualityTier } from './engine';
import { visibleCityEnergy } from './math';
import type { CountryFeature } from '../../renderer/country-feature';
import type {
  ChoroplethDataLayer,
  DataLayer,
  DataLayerHandle,
  HeatmapDataLayer,
} from '../../data-layers/types';
import type { GlobeConfig } from '../../types';
import type { CinematicConfig, CinematicDataset, CinematicSunConfig } from '../../types/kinds';
import type {
  DataLayerBuilder,
  KindBuildContext,
  KindHandle,
  KindModule,
  Public,
} from '../types';

const DEFAULT_CITY_LIGHTS_COUNT = 11500;
const DEFAULT_NETWORK_CONNECTIONS = 56;
// How often we resample the visible-city-energy aggregate. Cheap enough
// (single dot product per city) that 6 Hz is invisible CPU but keeps the
// surface "alive" as the camera orbits.
const VISIBLE_ENERGY_UPDATE_HZ = 6;

export interface CinematicKindHandle extends KindHandle {
  setCinematicConfig?(partial: CinematicConfig): void;
  /** Adaptive quality tier notifications (only fire when `quality: 'auto'`). */
  onQualityTier?(listener: ((tier: CinematicQualityTier) => void) | null): void;
  getQualityTier?(): CinematicQualityTier;
  setCinematicData?(dataset: CinematicDataset | null): void;
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
    camera,
    arcsLayer,
    globeSurfaceMesh,
    atmosphereLayer,
  }: KindBuildContext): CinematicKindHandle {
    const cinematic = config.cinematic ?? {};
    const surfaceCfg = cinematic.surface ?? {};
    const cloudsCfg = cinematic.clouds ?? {};
    const bordersCfg = cinematic.borders ?? {};
    const cityCfg = cinematic.cityLights ?? {};
    const networkCfg = cinematic.network ?? {};
    const fallbackLightDirection = [
      tokens['cinematic.lightDirectionX'],
      tokens['cinematic.lightDirectionY'],
      tokens['cinematic.lightDirectionZ'],
    ] as const;
    const world = new CinematicWorld({
      camera,
      config: cinematic,
      fallbackLightDirection,
    });
    (arcsLayer as unknown as { setWorld?: (world: CinematicWorld) => void } | undefined)
      ?.setWorld?.(world);

    let currentCityCount = cityCfg.count ?? DEFAULT_CITY_LIGHTS_COUNT;
    let currentMaxRoutes = networkCfg.maxConnections ?? DEFAULT_NETWORK_CONNECTIONS;
    let currentDataset = readCinematicDataset(cinematic);
    let preparedData = prepareCinematicData(currentDataset, {
      cityCount: currentCityCount,
      maxRoutes: currentMaxRoutes,
    });
    const atlas = buildCinematicSurfaceAtlas(features, preparedData);
    let currentDensityTexture = atlas.densityTexture;

    const previouslyVisible = globeSurfaceMesh.visible;
    globeSurfaceMesh.visible = false;

    const surface = new CinematicSurfaceLayer({
      oceanColor: pickColor(surfaceCfg.oceanColor, tokens['cinematic.oceanColor']),
      landColor: pickColor(surfaceCfg.landColor, tokens['cinematic.landColor']),
      cloudColor: pickColor(surfaceCfg.cloudColor, tokens['cinematic.cloudColor']),
      nightColor: pickColor(surfaceCfg.nightColor, tokens['cinematic.nightColor']),
      lightDirection: surfaceCfg.lightDirection ?? fallbackLightDirection,
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
      ...(surfaceCfg.relief !== undefined && surfaceCfg.relief >= 0 && { reliefStrength: surfaceCfg.relief }),
      ...(surfaceCfg.biomes !== undefined && { biomes: surfaceCfg.biomes }),
      ...(surfaceCfg.shallows !== undefined && surfaceCfg.shallows >= 0 && { shallows: surfaceCfg.shallows }),
      ...(surfaceCfg.snowLine !== undefined && surfaceCfg.snowLine > 0 && { snowLine: surfaceCfg.snowLine }),
      saturation:
        surfaceCfg.saturation !== undefined && surfaceCfg.saturation >= 0
          ? surfaceCfg.saturation
          : tokens['cinematic.saturation'],
      iceColor: pickColor(surfaceCfg.iceColor, tokens['cinematic.iceColor']),
      vegetationColor: pickColor(surfaceCfg.vegetationColor, tokens['cinematic.vegetationColor']),
      desertColor: pickColor(surfaceCfg.desertColor, tokens['cinematic.desertColor']),
      shallowWaterColor: pickColor(surfaceCfg.shallowWaterColor, tokens['cinematic.shallowWaterColor']),
      landTexture: atlas.landTexture,
      terrainTexture: atlas.terrainTexture,
      densityTexture: currentDensityTexture,
    });
    surface.setWorld(world);
    globeGroup.add(surface.mesh);

    // Sun / moon / aurora colours come from the theme unless overridden.
    world.setMoonColor(tokens['cinematic.moonColor']);
    world.setAuroraColors(
      pickColor(cinematic.aurora?.color, tokens['cinematic.auroraColor']),
      pickColor(cinematic.aurora?.colorTop, tokens['cinematic.auroraTopColor']),
    );
    if (!cinematic.sun?.color) world.uniforms.uSunColor.value.set(tokens['cinematic.sunColor']);

    // Cloud shell — shares the coverage field with the surface shadows.
    let cloudsEnabledNow = cloudsCfg.enabled ?? true;
    const clouds = new CinematicCloudsLayer({
      color: pickColor(cloudsCfg.color ?? surfaceCfg.cloudColor, tokens['cinematic.cloudColor']),
      opacity:
        cloudsCfg.opacity !== undefined && cloudsCfg.opacity >= 0
          ? cloudsCfg.opacity
          : surfaceCfg.cloudOpacity !== undefined && surfaceCfg.cloudOpacity > 0.2
            ? surfaceCfg.cloudOpacity
            : 0.85,
      ...(cloudsCfg.altitude !== undefined && cloudsCfg.altitude > 0 && { altitude: cloudsCfg.altitude }),
      densityTexture: currentDensityTexture,
    });
    clouds.setWorld(world);
    clouds.setVisible(cloudsEnabledNow);
    globeGroup.add(clouds.mesh);

    // The shared atmosphere shell (mounted by create-globe) is the cinematic
    // scattering shell — feed it the world so its limb follows the sun.
    const atmosphere = atmosphereLayer as
      | (Public<import('../../renderer/atmosphere-layer').AtmosphereLayer> & {
          setWorld?: (world: CinematicWorld) => void;
          setScatter?: (config: NonNullable<CinematicConfig['atmosphere']>) => void;
        })
      | undefined;
    atmosphere?.setWorld?.(world);
    if (cinematic.atmosphere !== undefined) atmosphere?.setScatter?.(cinematic.atmosphere);

    // Optional real-Earth textures: bind whatever has loaded, crossfade in.
    const textureSet = new CinematicTextureSet({
      onChange(snapshot, fadeMs) {
        surface.setTextures(snapshot, fadeMs / 1000);
        clouds.setCloudTexture(snapshot.clouds);
      },
    });
    if (cinematic.textures) textureSet.load(cinematic.textures);

    // Sun rig: fixed / realtime / orbit light direction + a visible disc.
    let lastSunConfig: CinematicSunConfig | undefined = cinematic.sun;
    const sun = new CinematicSunController({
      globeGroup,
      world,
      ...(cinematic.sun !== undefined && { config: cinematic.sun }),
      fallbackDirection: surfaceCfg.lightDirection ?? fallbackLightDirection,
    });
    let sunVisibleNow = cinematic.sun?.visible ?? true;
    const sunDisc = new CinematicSunDiscLayer({
      color: pickColor(cinematic.sun?.color, tokens['cinematic.sunColor']),
      size: pickPositive(cinematic.sun?.size, 1),
      glare: pickPositive(cinematic.sun?.glare, 1),
    });
    sunDisc.setVisible(sunVisibleNow);
    globeGroup.add(sunDisc.object);

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
    borders.setWorld?.(world);
    borders.setVisible(bordersEnabledNow);
    globeGroup.add(borders.group);

    let cityLightsEnabledNow = cityCfg.enabled ?? true;
    const cityLights = new CinematicCityLightsLayer({
      color: pickColor(cityCfg.color, tokens['cinematic.cityLightColor']),
      intensity: pickPositive(cityCfg.intensity, tokens['cinematic.cityLightIntensity']),
      count: cityCfg.count ?? DEFAULT_CITY_LIGHTS_COUNT,
      ...(cityCfg.size !== undefined && { size: cityCfg.size }),
      twinkle: cityCfg.twinkle ?? true,
      data: preparedData,
    });
    cityLights.setWorld(world);
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
      data: preparedData,
    });
    network.setWorld(world);
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

    // Visible-city-energy bookkeeping: list of {lat,lng,importance} that
    // gets summed against the current camera direction at ~6 Hz to feed
    // the surface shader's "warm hub wash". Refreshed whenever the
    // dataset rebuilds.
    let visibleEnergyPoints = preparedData.cityPoints.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      importance: p.importance,
    }));
    let visibleEnergyClock = 0;
    const cameraDirScratch = new Vector3();
    const updateVisibleEnergy = (): void => {
      const value = visibleCityEnergy(
        visibleEnergyPoints,
        cameraDirScratch.copy(camera.position).normalize(),
      );
      world.setVisibleCityEnergy(value);
    };
    updateVisibleEnergy();

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
        if (currentDensityTexture !== atlas.densityTexture) currentDensityTexture.dispose();
        atlas.dispose();
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
        sunDisc.dispose();
        globeGroup.remove(sunDisc.object);
        textureSet.dispose();
        clouds.dispose();
        globeGroup.remove(clouds.mesh);
        surface.dispose();
        globeGroup.remove(surface.mesh);
      },
      setVisible(visible: boolean) {
        surface.setVisible(visible);
        clouds.setVisible(visible && cloudsEnabledNow);
        sunDisc.setVisible(visible && sunVisibleNow);
        fill.group.visible = visible;
        borders.setVisible(visible && bordersEnabledNow);
        cityLights.setVisible(visible && cityLightsEnabledNow);
        network.setVisible(visible && networkEnabledNow);
        crosshair.setEnabled(visible && crosshairEnabledNow);
      },
      update(delta: number, elapsedSeconds: number) {
        visibleEnergyClock += delta;
        if (visibleEnergyClock >= 1 / VISIBLE_ENERGY_UPDATE_HZ) {
          visibleEnergyClock = 0;
          updateVisibleEnergy();
        }
        sun.update(delta);
        world.update(delta, elapsedSeconds);
        sunDisc.sync(sun.getDirection(), camera, globeGroup);
        sunDisc.update(elapsedSeconds);
        surface.update(elapsedSeconds, delta);
        clouds.setTextureMix(surface.getTextureMix());
        clouds.update(elapsedSeconds);
        // `fill` is ticked centrally by create-globe (state.countryFillLayer).
        borders.update(elapsedSeconds, delta);
        cityLights.update(delta, elapsedSeconds);
        network.update(delta, elapsedSeconds);
        if (crosshairEnabledNow) crosshair.update(delta);
      },
      onPointerMove(point3D, latLng) {
        if (point3D !== null) {
          // Hover-energy is small but non-zero so the surface "breathes"
          // softly under the cursor without the limb flashing.
          world.pulseInteraction(0.16);
          world.registerInteractionPoint(point3D);
        }
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
      onPointerDown() {
        // Clicks deliver a full-strength pulse; the spatial point was set
        // by the most recent pointer-move event (Three's pointer model
        // raises move before down), so the surface bloom centres on the
        // exact pixel the user clicked.
        world.pulseInteraction(1);
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
        world.setConfig(partial);
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
          if (s.relief !== undefined) surface.setReliefStrength(s.relief);
          if (s.biomes !== undefined) surface.setBiomes(s.biomes);
          if (s.shallows !== undefined) surface.setShallows(s.shallows);
          if (s.snowLine !== undefined) surface.setSnowLine(s.snowLine);
          if (s.saturation !== undefined) {
            surface.setSaturation(s.saturation >= 0 ? s.saturation : tokens['cinematic.saturation']);
          }
          if (s.iceColor !== undefined) surface.setIceColor(pickColor(s.iceColor, tokens['cinematic.iceColor']));
          if (s.vegetationColor !== undefined) {
            surface.setVegetationColor(pickColor(s.vegetationColor, tokens['cinematic.vegetationColor']));
          }
          if (s.desertColor !== undefined) surface.setDesertColor(pickColor(s.desertColor, tokens['cinematic.desertColor']));
          if (s.shallowWaterColor !== undefined) {
            surface.setShallowWaterColor(pickColor(s.shallowWaterColor, tokens['cinematic.shallowWaterColor']));
          }
        }
        if (partial.clouds !== undefined) {
          const c = partial.clouds;
          if (c.enabled !== undefined) {
            cloudsEnabledNow = c.enabled;
            clouds.setVisible(c.enabled);
          }
          if (c.color !== undefined) clouds.setColor(pickColor(c.color, tokens['cinematic.cloudColor']));
          if (c.opacity !== undefined) clouds.setOpacity(c.opacity);
          if (c.altitude !== undefined) clouds.setAltitude(c.altitude);
          // coverage / speed / softness / shadows live on the shared world block (world.setConfig above).
        }
        if (partial.aurora !== undefined) {
          world.setAuroraColors(
            partial.aurora.color !== undefined ? pickColor(partial.aurora.color, tokens['cinematic.auroraColor']) : '',
            partial.aurora.colorTop !== undefined ? pickColor(partial.aurora.colorTop, tokens['cinematic.auroraTopColor']) : '',
          );
        }
        if (partial.atmosphere !== undefined) atmosphere?.setScatter?.(partial.atmosphere);
        if (partial.textures !== undefined) textureSet.load(partial.textures);
        // A bare `surface.lightDirection` edit must also move the sun rig's
        // fixed direction, or the next unrelated sun edit would push the
        // build-time fallback back into the world (API path; the demo
        // mirrors the light sliders into `sun.direction` anyway).
        if (partial.surface?.lightDirection !== undefined && partial.sun?.direction === undefined) {
          sun.setConfig({ direction: partial.surface.lightDirection });
          lastSunConfig = { ...(lastSunConfig ?? {}), direction: partial.surface.lightDirection };
        }
        if (partial.sun !== undefined) {
          const next = partial.sun;
          if (sunRigChanged(lastSunConfig, next)) sun.setConfig(next);
          lastSunConfig = next;
          if (next.visible !== undefined) {
            sunVisibleNow = next.visible;
            sunDisc.setVisible(next.visible);
          }
          if (next.color !== undefined) sunDisc.setColor(pickColor(next.color, tokens['cinematic.sunColor']));
          if (next.size !== undefined) sunDisc.setSize(next.size);
          if (next.glare !== undefined) sunDisc.setGlare(next.glare);
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
          if (c.count !== undefined || c.data !== undefined) {
            if (c.count !== undefined) currentCityCount = c.count;
            if (c.data !== undefined) {
              currentDataset = {
                ...(currentDataset ?? {}),
                cityLights: c.data,
              };
            }
            rebuildCinematicData(currentDataset);
            cityLights.setCount(currentCityCount);
          }
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
          if (n.maxConnections !== undefined || n.routes !== undefined) {
            if (n.maxConnections !== undefined) currentMaxRoutes = n.maxConnections;
            if (n.routes !== undefined) {
              currentDataset = {
                ...(currentDataset ?? {}),
                routes: n.routes,
              };
            }
            rebuildCinematicData(currentDataset);
            network.setMaxConnections(currentMaxRoutes);
          }
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
      setCinematicData(dataset: CinematicDataset | null) {
        currentDataset = dataset;
        rebuildCinematicData(currentDataset);
      },
      onQualityTier(listener) {
        world.onQualityTier(listener);
      },
      getQualityTier() {
        return world.getQualityTier();
      },
    };

    function rebuildCinematicData(
      dataset: CinematicDataset | null | undefined,
    ): void {
      preparedData = prepareCinematicData(dataset, {
        cityCount: currentCityCount,
        maxRoutes: currentMaxRoutes,
      });
      const previousDensityTexture = currentDensityTexture;
      currentDensityTexture = buildDensityTexture(preparedData);
      surface.setDensityTexture(currentDensityTexture);
      clouds.setDensityTexture(currentDensityTexture);
      cityLights.setData(preparedData);
      network.setData(preparedData);
      visibleEnergyPoints = preparedData.cityPoints.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        importance: p.importance,
      }));
      updateVisibleEnergy();
      if (previousDensityTexture !== atlas.densityTexture) previousDensityTexture.dispose();
    }
  },
};

/**
 * The sun controller re-anchors its clock when it receives a config, so
 * only forward configs whose time-defining fields actually changed —
 * Studio pushes the full config on every knob edit.
 */
const sunRigChanged = (
  prev: CinematicSunConfig | undefined,
  next: CinematicSunConfig,
): boolean => {
  if (prev === undefined) return true;
  const sameDir =
    prev.direction === next.direction ||
    (prev.direction !== undefined &&
      next.direction !== undefined &&
      prev.direction[0] === next.direction[0] &&
      prev.direction[1] === next.direction[1] &&
      prev.direction[2] === next.direction[2]);
  const dateOf = (d: CinematicSunConfig['date']): number | undefined => {
    if (d === undefined) return undefined;
    const ms = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  };
  return (
    prev.mode !== next.mode ||
    dateOf(prev.date) !== dateOf(next.date) ||
    prev.timeScale !== next.timeScale ||
    prev.speed !== next.speed ||
    !sameDir
  );
};

const pickColor = (value: string | undefined, fallback: string): string =>
  value && value !== '' ? value : fallback;

const pickPositive = (value: number | undefined, fallback: number): number =>
  value !== undefined && value > 0 ? value : fallback;

const readCinematicDataset = (
  config: CinematicConfig | null | undefined,
): CinematicDataset | null => {
  const cityLights = config?.cityLights?.data;
  const routes = config?.network?.routes;
  if (!cityLights && !routes) return null;
  return {
    ...(cityLights !== undefined && { cityLights }),
    ...(routes !== undefined && { routes }),
  };
};

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
