import { AmbientLight, DirectionalLight } from 'three';
import { SceneManager } from './renderer/scene-manager';
import { GlobeMesh } from './renderer/globe-mesh';
import { MarkersLayer } from './renderer/markers-layer';
import { CountriesLayer, type CountryFeature } from './renderer/countries-layer';
import { AtmosphereLayer } from './renderer/atmosphere-layer';
import { GlobeControls } from './interaction/controls';
import { PointerRaycaster } from './interaction/raycaster';
import { GlobeEventEmitter } from './interaction/events';
import { loadCountries } from './data/geo-loader';
import { resolveTheme } from './theme/resolver';
import type {
  CountriesConfig,
  GlobeConfig,
  GlobeEventName,
  GlobeEvents,
  GlobeInstance,
  LatLng,
  MarkerConfig,
  PerformanceConfig,
} from './types';

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
};

interface InternalState {
  config: GlobeConfig;
  scene: SceneManager;
  globeMesh: GlobeMesh;
  markersLayer: MarkersLayer;
  countriesLayer: CountriesLayer | null;
  atmosphereLayer: AtmosphereLayer | null;
  controls: GlobeControls;
  raycaster: PointerRaycaster;
  emitter: GlobeEventEmitter;
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

  scene.scene.add(new AmbientLight(0xffffff, 0.6));
  const dirLight = new DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 3, 5);
  scene.scene.add(dirLight);

  const globeMesh = new GlobeMesh({
    color: tokens['globe.surface'],
    ...(tokens['globe.surfaceTexture'] !== '' && {
      textureUrl: tokens['globe.surfaceTexture'],
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

  const controls = new GlobeControls({
    camera: scene.camera,
    domElement: scene.renderer.domElement,
    ...(config.autoRotate?.speed !== undefined && { autoRotateSpeed: config.autoRotate.speed }),
    ...(config.minZoom !== undefined && { minDistance: config.minZoom }),
    ...(config.maxZoom !== undefined && { maxDistance: config.maxZoom }),
  });
  if (config.autoRotate?.enabled) controls.setAutoRotate(true, config.autoRotate.speed);

  const raycaster = new PointerRaycaster({
    camera: scene.camera,
    domElement: scene.renderer.domElement,
    targets: [{ type: 'marker', object: markersLayer.mesh }],
    onClick: (hit) => {
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        if (marker) emitter.emit('markerClick', { marker });
      }
    },
    onHover: (hit) => {
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        emitter.emit('markerHover', marker ? { marker } : null);
      } else {
        emitter.emit('markerHover', null);
      }
    },
  });

  const state: InternalState = {
    config,
    scene,
    globeMesh,
    markersLayer,
    countriesLayer: null,
    atmosphereLayer,
    controls,
    raycaster,
    emitter,
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
      const layer = new CountriesLayer({
        features: features as ReadonlyArray<CountryFeature>,
        borderColor: tokens['borders.color'],
        borderWidth: tokens['borders.width'],
        borderOpacity: tokens['borders.opacity'],
      });
      scene.scene.add(layer.group);
      state.countriesLayer = layer;
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
    },
    on: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => emitter.on(event, handler),
    off: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => emitter.off(event, handler),
    setRotation: (_position: LatLng) => {
      // implementacja do uzupełnienia - smooth rotation do danej pozycji
    },
    setMarkers: (markers: ReadonlyArray<MarkerConfig>) => markersLayer.setMarkers(markers),
    addMarker: (marker: MarkerConfig) => markersLayer.addMarker(marker),
    removeMarker: (id: string) => markersLayer.removeMarker(id),
    resize: () => scene.resize(),
    getCanvas: () => scene.getCanvas(),
  };

  return instance;
};
