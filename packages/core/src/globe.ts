import { AmbientLight, DirectionalLight } from 'three';
import { SceneManager } from './renderer/scene-manager';
import { GlobeMesh } from './renderer/globe-mesh';
import { MarkersLayer } from './renderer/markers-layer';
import { CountriesLayer, type CountryFeature } from './renderer/countries-layer';
import { CountriesPickingLayer } from './renderer/countries-picking-layer';
import { CountryHighlightLayer } from './renderer/country-highlight-layer';
import { CountryTooltip } from './renderer/country-tooltip';
import { AtmosphereLayer } from './renderer/atmosphere-layer';
import { GlobeControls } from './interaction/controls';
import { PointerRaycaster } from './interaction/raycaster';
import { GlobeEventEmitter } from './interaction/events';
import { loadCountries } from './data/geo-loader';
import { resolveTheme } from './theme/resolver';
import { GLOBE_RADIUS, vector3ToLatLng } from './utils/coordinates';
import { angularExtent, boundsCenter, type LatLngBounds } from './utils/country-bounds';
import type {
  CountriesConfig,
  CountryData,
  GlobeConfig,
  GlobeEventName,
  GlobeEvents,
  GlobeInstance,
  LatLng,
  MarkerConfig,
  PerformanceConfig,
} from './types';
import type { Object3D, Vector3 } from 'three';

const DEFAULT_PERFORMANCE: Required<PerformanceConfig> = {
  antialias: true,
  pixelRatio: 'auto',
  maxFps: 60,
  adaptiveQuality: true,
};

const DEFAULT_COUNTRIES: Required<CountriesConfig> = {
  resolution: 'medium',
  style: 'borders',
  hoverEnabled: true,
  hoverOccludeBackSide: true,
};

/**
 * Compute camera radius such that the angular extent fits inside the
 * limiting field-of-view dimension with the given padding. Exact geometry:
 * tan(theta_screen) = R_g * sin(g/2) / (R - R_g * cos(g/2)).
 */
const computeFocusDistance = (
  bounds: LatLngBounds,
  camera: import('three').PerspectiveCamera,
  padding: number,
  globeRadius: number,
  fallbackRadius: number
): number => {
  const gamma = angularExtent(bounds);
  if (gamma <= 0) return fallbackRadius;
  const fovV = (camera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
  const limitingFov = Math.min(fovV, fovH);
  const targetScreen = ((1 - 2 * padding) * limitingFov) / 2;
  const tanT = Math.tan(targetScreen);
  if (tanT <= 0) return fallbackRadius;
  return (globeRadius * Math.sin(gamma / 2)) / tanT + globeRadius * Math.cos(gamma / 2);
};

interface InternalState {
  config: GlobeConfig;
  scene: SceneManager;
  globeMesh: GlobeMesh;
  markersLayer: MarkersLayer;
  countriesLayer: CountriesLayer | null;
  countriesPickingLayer: CountriesPickingLayer | null;
  countryHighlightLayer: CountryHighlightLayer | null;
  countryActiveLayer: CountryHighlightLayer | null;
  countryTooltip: CountryTooltip | null;
  atmosphereLayer: AtmosphereLayer | null;
  controls: GlobeControls;
  raycaster: PointerRaycaster;
  emitter: GlobeEventEmitter;
  activeCountryId: string | null;
  destroyed: boolean;
}

export const createGlobe = (config: GlobeConfig): GlobeInstance => {
  const emitter = new GlobeEventEmitter();
  const tokens = resolveTheme(config.theme);
  const performance = { ...DEFAULT_PERFORMANCE, ...config.performance };
  const countries = config.countries
    ? { ...DEFAULT_COUNTRIES, ...config.countries }
    : DEFAULT_COUNTRIES;

  const scene = new SceneManager({
    container: config.container,
    backgroundColor: tokens['background.color'],
    performance,
    onRender: (delta) => state.controls.update(delta),
  });

  scene.scene.add(
    new AmbientLight(tokens['lights.ambient.color'], tokens['lights.ambient.intensity'])
  );
  const dirLight = new DirectionalLight(
    tokens['lights.directional.color'],
    tokens['lights.directional.intensity']
  );
  dirLight.position.set(5, 3, 5);
  scene.scene.add(dirLight);

  const globeMesh = new GlobeMesh({
    color: tokens['globe.surfaceColor'],
    ...(tokens['globe.surfaceTextureUrl'] !== '' && {
      textureUrl: tokens['globe.surfaceTextureUrl'],
    }),
  });
  scene.scene.add(globeMesh.mesh);

  const markersLayer = new MarkersLayer({ defaultColor: tokens['markers.defaultColor'] });
  scene.scene.add(markersLayer.mesh);

  const atmosphereLayer = config.atmosphere?.enabled
    ? new AtmosphereLayer({
        color: tokens['atmosphere.color'],
        intensity: tokens['atmosphere.intensity'],
      })
    : null;
  if (atmosphereLayer) scene.scene.add(atmosphereLayer.mesh);

  const tooltip = new CountryTooltip({
    container: config.container,
    background: tokens['tooltip.backgroundColor'],
    textColor: tokens['tooltip.textColor'],
    fontSize: tokens['tooltip.fontSize'],
    fontFamily: tokens['tooltip.fontFamily'],
    padding: tokens['tooltip.padding'],
    borderRadius: tokens['tooltip.borderRadius'],
  });

  const controls = new GlobeControls({
    camera: scene.camera,
    domElement: scene.renderer.domElement,
    ...(config.autoRotate?.speed !== undefined && { autoRotateSpeed: config.autoRotate.speed }),
    ...(config.minZoom !== undefined && { minDistance: config.minZoom }),
    ...(config.maxZoom !== undefined && { maxDistance: config.maxZoom }),
    ...(config.zoom !== undefined && { zoom: config.zoom }),
  });
  if (config.autoRotate?.enabled) controls.setAutoRotate(true, config.autoRotate.speed);

  const handleCountryHit = (
    object: Object3D | null,
    point: Vector3 | undefined
  ): { country: CountryData; point: LatLng } | null => {
    if (!object || !state.countriesPickingLayer) return null;
    const id = object.userData['countryId'];
    if (typeof id !== 'string') return null;
    const country = state.countriesPickingLayer.getCountry(id);
    if (!country) return null;
    const ll: LatLng = point ? vector3ToLatLng(point) : [0, 0];
    return { country, point: ll };
  };

  const raycaster = new PointerRaycaster({
    camera: scene.camera,
    domElement: scene.renderer.domElement,
    targets: [{ type: 'marker', object: markersLayer.mesh }],
    onClick: (hit) => {
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        if (marker) emitter.emit('markerClick', { marker });
        return;
      }
      if (hit?.type === 'country') {
        const event = handleCountryHit(hit.object, hit.point);
        if (event) emitter.emit('countryClick', event);
      }
    },
    onHover: (hit) => {
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        emitter.emit('markerHover', marker ? { marker } : null);
        emitter.emit('countryHover', null);
        state.countryHighlightLayer?.clear();
        state.countryTooltip?.clear();
        return;
      }
      if (hit?.type === 'country') {
        const event = handleCountryHit(hit.object, hit.point);
        emitter.emit('countryHover', event);
        emitter.emit('markerHover', null);
        if (event) {
          state.countryHighlightLayer?.showCountry(event.country.id);
          state.countryTooltip?.showCountry(event.country);
        } else {
          state.countryHighlightLayer?.clear();
          state.countryTooltip?.clear();
        }
        return;
      }
      emitter.emit('markerHover', null);
      emitter.emit('countryHover', null);
      state.countryHighlightLayer?.clear();
      state.countryTooltip?.clear();
    },
  });

  const state: InternalState = {
    config,
    scene,
    globeMesh,
    markersLayer,
    countriesLayer: null,
    countriesPickingLayer: null,
    countryHighlightLayer: null,
    countryActiveLayer: null,
    countryTooltip: tooltip,
    atmosphereLayer,
    controls,
    raycaster,
    emitter,
    activeCountryId: null,
    destroyed: false,
  };

  if (config.markers && config.markers.length > 0) {
    markersLayer.setMarkers(config.markers);
  }

  const initCountries = async (): Promise<void> => {
    if (!config.countries) return;
    try {
      const features = await loadCountries({ resolution: countries.resolution });
      if (state.destroyed) return;

      const visible = new CountriesLayer({
        features: features as ReadonlyArray<CountryFeature>,
        borderColor: tokens['countries.border.color'],
        borderWidth: tokens['countries.border.width'],
        borderOpacity: tokens['countries.border.opacity'],
      });
      scene.scene.add(visible.group);
      state.countriesLayer = visible;

      const picking = new CountriesPickingLayer({
        features: features as ReadonlyArray<CountryFeature>,
      });
      scene.scene.add(picking.group);
      state.countriesPickingLayer = picking;
      raycaster.setTargets([
        { type: 'marker', object: markersLayer.mesh },
        { type: 'country', object: picking.group },
      ]);

      const highlight = new CountryHighlightLayer({
        hoverColor: tokens['countries.borderHover.color'],
        hoverWidth: tokens['countries.borderHover.width'],
        hoverOpacity: tokens['countries.borderHover.opacity'],
        occludeBackSide: countries.hoverOccludeBackSide,
      });
      highlight.registerFeatures(features as ReadonlyArray<CountryFeature>);
      scene.scene.add(highlight.object);
      state.countryHighlightLayer = highlight;

      const activeLayer = new CountryHighlightLayer({
        hoverColor: tokens['countries.borderActive.color'],
        hoverWidth: tokens['countries.borderActive.width'],
        hoverOpacity: tokens['countries.borderActive.opacity'],
        occludeBackSide: countries.hoverOccludeBackSide,
      });
      activeLayer.registerFeatures(features as ReadonlyArray<CountryFeature>);
      activeLayer.object.renderOrder = 11;
      scene.scene.add(activeLayer.object);
      state.countryActiveLayer = activeLayer;
      // Re-apply pending active country if user called setActiveCountry before features loaded
      if (state.activeCountryId) activeLayer.showCountry(state.activeCountryId);
    } catch (error) {
      emitter.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const instance: GlobeInstance = {
    mount: () => {
      scene.start();
      void initCountries().then(() => emitter.emit('ready'));
    },
    destroy: () => {
      if (state.destroyed) return;
      state.destroyed = true;
      raycaster.destroy();
      controls.destroy();
      markersLayer.dispose();
      globeMesh.dispose();
      state.countriesLayer?.dispose();
      state.countriesPickingLayer?.dispose();
      state.countryHighlightLayer?.dispose();
      state.countryActiveLayer?.dispose();
      state.countryTooltip?.dispose();
      atmosphereLayer?.dispose();
      scene.destroy();
      emitter.clear();
    },
    update: (partial) => {
      state.config = { ...state.config, ...partial };
      if (partial.markers) markersLayer.setMarkers(partial.markers);
      if (partial.autoRotate) {
        controls.setAutoRotate(partial.autoRotate.enabled ?? false, partial.autoRotate.speed);
      }
      if (partial.zoom !== undefined) {
        controls.setZoom(partial.zoom);
      }
    },
    on: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => emitter.on(event, handler),
    off: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => emitter.off(event, handler),
    setRotation: (_position: LatLng) => {
      // implementacja do uzupełnienia - smooth rotation do danej pozycji
    },
    flyTo: (position, distance, options) => {
      controls.flyTo(position, distance, options ?? {});
    },
    setActiveCountry: (id) => {
      state.activeCountryId = id;
      if (id === null) {
        state.countryActiveLayer?.clear();
      } else {
        state.countryActiveLayer?.showCountry(id);
      }
    },
    getActiveCountry: () => state.activeCountryId,
    focusOnCountry: (id, options) => {
      const layer = state.countriesPickingLayer;
      if (!layer) return;
      const bounds = layer.getCountryBounds(id);
      if (!bounds) return;
      const padding = options?.padding ?? 0.15;
      const pauseAutoRotate = options?.pauseAutoRotateOnFocus ?? true;
      const distance = computeFocusDistance(
        bounds,
        scene.camera,
        padding,
        GLOBE_RADIUS,
        scene.camera.position.length()
      );
      const center = boundsCenter(bounds);
      if (pauseAutoRotate) controls.setAutoRotate(false);
      controls.flyTo(center, distance, options ?? {});
    },
    setMarkers: (markers: ReadonlyArray<MarkerConfig>) => markersLayer.setMarkers(markers),
    addMarker: (marker: MarkerConfig) => markersLayer.addMarker(marker),
    removeMarker: (id: string) => markersLayer.removeMarker(id),
    resize: () => scene.resize(),
    getCanvas: () => scene.getCanvas(),
  };

  return instance;
};
