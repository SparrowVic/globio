import { AmbientLight, DirectionalLight, Group, Vector2 } from 'three';
import { SceneManager } from './renderer/scene-manager';
import { GlobeMesh } from './renderer/globe-mesh';
import { MarkersLayer } from './renderer/markers-layer';
import type { CountryFeature } from './renderer/country-feature';
import { CountriesPickingLayer } from './renderer/countries-picking-layer';
import { CountriesFillLayer } from './renderer/countries-fill-layer';
import { CountryLabelsLayer } from './renderer/country-labels-layer';
import { CountryHighlightLayer } from './renderer/country-highlight-layer';
import { CountryTooltip } from './renderer/country-tooltip';
import { MarkerTooltip } from './renderer/marker-tooltip';
import { HtmlMarkersLayer } from './renderer/html-markers-layer';
import { StarfieldLayer } from './renderer/starfield-layer';
import { ArcsLayer } from './renderer/arcs-layer';
import { StoryController } from './story/story-controller';
import type { SceneConfig, StoryConfig } from './story/types';
import { AtmosphereLayer } from './renderer/atmosphere-layer';
import { KIND_MODULES, PRESET_DEFAULT_KIND } from './kinds/registry';
import type { KindHandle } from './kinds/types';
import type { GlobeKind } from './kinds/types';
import { GlobeControls } from './interaction/controls';
import { PointerRaycaster } from './interaction/raycaster';
import { GlobeEventEmitter } from './interaction/events';
import { loadCountries } from './data/geo-loader';
import { createLegend, type LegendInstance, type LegendOptions } from './data/legend';
import { resolveTheme } from './theme/resolver';
import { GLOBE_RADIUS, latLngToVector3, vector3ToLatLng } from './utils/coordinates';
import { angularExtent, boundsCenter, type LatLngBounds } from './utils/country-bounds';
import type {
  CountriesConfig,
  CountryData,
  CountryDataMap,
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
  hoverEnabled: true,
  hoverOccludeBackSide: true,
};

/**
 * Decide the active globe kind:
 * 1. explicit `config.kind` wins
 * 2. else, look up the active theme preset in `PRESET_DEFAULT_KIND`
 * 3. else, fall back to `'outline'`
 *
 * The preset name is read off `theme: 'name'` shorthand or
 * `theme: { extends: 'name' }`. Pure custom themes with no preset and no
 * explicit kind get `'outline'`.
 */
const resolveActiveKind = (config: GlobeConfig): GlobeKind => {
  if (config.kind) return config.kind;
  const theme = config.theme;
  let presetName: string | undefined;
  if (typeof theme === 'string') presetName = theme;
  else if (theme && typeof theme === 'object' && 'extends' in theme) {
    presetName = theme.extends as string | undefined;
  }
  if (presetName && presetName in PRESET_DEFAULT_KIND) {
    return PRESET_DEFAULT_KIND[presetName as keyof typeof PRESET_DEFAULT_KIND];
  }
  return 'outline';
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
  /**
   * Active kind module's runtime handle. Built by the dispatcher in
   * `initCountries` once country features have loaded. Null on a globe
   * whose kind has no per-feature visual (none ship today, but reserved).
   */
  kindHandle: KindHandle | null;
  resolvedKind: GlobeKind;
  countriesPickingLayer: CountriesPickingLayer | null;
  countriesFillLayer: CountriesFillLayer | null;
  countryLabelsLayer: CountryLabelsLayer | null;
  countryHighlightLayer: CountryHighlightLayer | null;
  countryActiveLayer: CountryHighlightLayer | null;
  countryTooltip: CountryTooltip | null;
  htmlMarkersLayer: HtmlMarkersLayer;
  arcsLayer: ArcsLayer;
  atmosphereLayer: AtmosphereLayer | null;
  controls: GlobeControls;
  raycaster: PointerRaycaster;
  emitter: GlobeEventEmitter;
  activeCountryId: string | null;
  countryData: CountryDataMap | null;
  legend: LegendInstance | null;
  elapsedSeconds: number;
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
    onRender: (delta) => {
      state.controls.update(delta);
      state.elapsedSeconds += delta;
      arcsLayer.update(state.elapsedSeconds);
      state.kindHandle?.update?.(delta, state.elapsedSeconds);
      state.htmlMarkersLayer.update();
      state.markersLayer.update(delta);
      state.countryHighlightLayer?.update(delta);
      state.countryActiveLayer?.update(delta);
      state.countriesFillLayer?.update(delta);
      state.countryLabelsLayer?.update();
    },
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

  // Tilted parent group for the globe assembly. Tilt is applied around Z so
  // the auto-rotate (which spins the camera around world Y) makes the globe
  // appear to spin on a tilted axis — the natural Earth feel at 23.5°.
  const globeGroup = new Group();
  globeGroup.rotation.z = (-(config.axisTilt ?? 0) * Math.PI) / 180;
  scene.scene.add(globeGroup);

  const starfieldLayer = config.starfield?.enabled
    ? new StarfieldLayer({
        count: tokens['starfield.density'],
        color: tokens['starfield.color'],
        size: tokens['starfield.size'],
      })
    : null;
  if (starfieldLayer) scene.scene.add(starfieldLayer.object);

  const globeMesh = new GlobeMesh({
    color: tokens['globe.surfaceColor'],
    ...(tokens['globe.surfaceTextureUrl'] !== '' && {
      textureUrl: tokens['globe.surfaceTextureUrl'],
    }),
  });
  globeGroup.add(globeMesh.mesh);

  const markersLayer = new MarkersLayer({ defaultColor: tokens['markers.defaultColor'] });
  globeGroup.add(markersLayer.mesh);

  const arcsLayer = new ArcsLayer({
    defaultColor: tokens['arcs.color'],
    defaultWidth: tokens['arcs.width'],
    defaultOpacity: tokens['arcs.opacity'],
    headColor: tokens['arcs.headColor'],
    headSize: tokens['arcs.headSize'],
  });
  globeGroup.add(arcsLayer.group);
  if (config.arcs && config.arcs.length > 0) arcsLayer.setArcs(config.arcs);

  const atmosphereLayer = config.atmosphere?.enabled
    ? new AtmosphereLayer({
        color: tokens['atmosphere.color'],
        intensity: tokens['atmosphere.intensity'],
      })
    : null;
  if (atmosphereLayer) globeGroup.add(atmosphereLayer.mesh);

  // The active globe kind (outline / dotted / wireframe / future). Each kind
  // owns its visible country/grid pipeline; built later in `initCountries`
  // once features have loaded. The kind itself is decided once here so the
  // dispatcher and event handlers can branch on it before features arrive.
  const resolvedKind: GlobeKind = resolveActiveKind(config);
  const kindModule = KIND_MODULES[resolvedKind];

  const htmlMarkersLayer = new HtmlMarkersLayer({
    container: config.container,
    camera: scene.camera,
    globeGroup,
  });
  if (config.htmlMarkers && config.htmlMarkers.length > 0) {
    htmlMarkersLayer.setMarkers(config.htmlMarkers);
  }

  const tooltip = new CountryTooltip({
    container: config.container,
    background: tokens['tooltip.backgroundColor'],
    textColor: tokens['tooltip.textColor'],
    fontSize: tokens['tooltip.fontSize'],
    fontFamily: tokens['tooltip.fontFamily'],
    padding: tokens['tooltip.padding'],
    borderRadius: tokens['tooltip.borderRadius'],
  });

  const markerTooltip = new MarkerTooltip({
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
        markersLayer.setHovered(marker?.id ?? null);
        if (marker) markerTooltip.showMarker(marker);
        else markerTooltip.clear();
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
        markersLayer.setHovered(null);
        markerTooltip.clear();
        return;
      }
      emitter.emit('markerHover', null);
      emitter.emit('countryHover', null);
      state.countryHighlightLayer?.clear();
      state.countryTooltip?.clear();
      markersLayer.setHovered(null);
      markerTooltip.clear();
    },
  });

  const state: InternalState = {
    config,
    scene,
    globeMesh,
    markersLayer,
    kindHandle: null,
    resolvedKind,
    countriesPickingLayer: null,
    countriesFillLayer: null,
    countryLabelsLayer: null,
    countryHighlightLayer: null,
    countryActiveLayer: null,
    countryTooltip: tooltip,
    htmlMarkersLayer,
    arcsLayer,
    atmosphereLayer,
    controls,
    raycaster,
    emitter,
    activeCountryId: null,
    countryData: config.countryData ?? null,
    legend: null,
    elapsedSeconds: 0,
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

      const fill = new CountriesFillLayer({
        features: features as ReadonlyArray<CountryFeature>,
        defaultColor: tokens['countries.fill.defaultColor'],
        defaultOpacity: tokens['countries.fill.opacity'],
      });
      globeGroup.add(fill.group);
      state.countriesFillLayer = fill;
      if (state.countryData) fill.setData(state.countryData);

      // Dispatch to the active kind module — outline draws borders, dotted
      // a Points cloud, wireframe a lat/lng grid (without country geometry),
      // future kinds whatever they want. The picking layer is mounted
      // separately below for kinds that opt into country interaction.
      state.kindHandle = kindModule.build({
        globeGroup,
        features: features as ReadonlyArray<CountryFeature>,
        tokens,
        config,
      });

      // Country interaction (picking + hover/active highlight) is gated by
      // the kind module — kinds without country surface (wireframe) skip
      // these entirely. Marker raycasting still works either way because
      // markers are a separate raycaster target.
      if (kindModule.hasCountryInteraction) {
        const picking = new CountriesPickingLayer({
          features: features as ReadonlyArray<CountryFeature>,
        });
        globeGroup.add(picking.group);
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
        globeGroup.add(highlight.object);
        state.countryHighlightLayer = highlight;

        const activeLayer = new CountryHighlightLayer({
          hoverColor: tokens['countries.borderActive.color'],
          hoverWidth: tokens['countries.borderActive.width'],
          hoverOpacity: tokens['countries.borderActive.opacity'],
          occludeBackSide: countries.hoverOccludeBackSide,
        });
        activeLayer.registerFeatures(features as ReadonlyArray<CountryFeature>);
        activeLayer.object.renderOrder = 11;
        globeGroup.add(activeLayer.object);
        state.countryActiveLayer = activeLayer;
        // Re-apply pending active country if user called setActiveCountry before features loaded
        if (state.activeCountryId) activeLayer.showCountry(state.activeCountryId);
      }

      const labelsConfig = config.countryLabels;
      const labelsLayer = new CountryLabelsLayer({
        container: config.container,
        camera: scene.camera,
        globeGroup,
        features: features as ReadonlyArray<CountryFeature>,
        color: tokens['countries.label.color'],
        fontSize: tokens['countries.label.fontSize'],
        fontFamily: tokens['countries.label.fontFamily'],
        fontWeight: tokens['countries.label.fontWeight'],
        textShadow: tokens['countries.label.textShadow'],
        ...(labelsConfig?.minScreenSize !== undefined && {
          minScreenSize: labelsConfig.minScreenSize,
        }),
        ...(labelsConfig?.labels !== undefined && { labels: labelsConfig.labels }),
      });
      if (labelsConfig?.enabled) labelsLayer.setEnabled(true);
      state.countryLabelsLayer = labelsLayer;
    } catch (error) {
      emitter.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Helper: convert a lat/lng given in globe-local coordinates (the natural
  // interpretation for users who just see the visible globe) into the WORLD
  // lat/lng equivalent that the camera controls expect. This compensates for
  // axisTilt and any future scene-level transforms applied to globeGroup.
  const globeLocalToWorldLatLng = (position: LatLng): LatLng => {
    globeGroup.updateMatrixWorld();
    const localVec = latLngToVector3(position, GLOBE_RADIUS);
    const worldVec = localVec.applyMatrix4(globeGroup.matrixWorld);
    return vector3ToLatLng(worldVec);
  };

  // Story orchestration. The adapter bridges StoryController (pure logic) to
  // the existing instance primitives. Scene popups use a reserved html-marker
  // id so they never collide with user-supplied markers.
  const STORY_POPUP_ID = '__story_popup';
  const storyController = new StoryController({
    flyTo: (position, distance, options) => {
      controls.flyTo(globeLocalToWorldLatLng(position), distance, options);
    },
    focusOnCountry: (id, options) => {
      const layer = state.countriesPickingLayer;
      if (!layer) return;
      const bounds = layer.getCountryBounds(id);
      if (!bounds) return;
      const padding = options.padding ?? 0.15;
      const distance = computeFocusDistance(
        bounds,
        scene.camera,
        padding,
        GLOBE_RADIUS,
        scene.camera.position.length()
      );
      const flyOptions: { duration?: number; easing?: typeof options.easing; elevation?: number } = {};
      if (options.duration !== undefined) flyOptions.duration = options.duration;
      if (options.easing !== undefined) flyOptions.easing = options.easing;
      if (options.elevation !== undefined) flyOptions.elevation = options.elevation;
      controls.flyTo(globeLocalToWorldLatLng(boundsCenter(bounds)), distance, flyOptions);
    },
    setActiveCountry: (id) => {
      state.activeCountryId = id;
      if (id === null) state.countryActiveLayer?.clear();
      else state.countryActiveLayer?.showCountry(id);
    },
    setAutoRotate: (enabled) => controls.setAutoRotate(enabled),
    setStoryPopup: (popup) => {
      htmlMarkersLayer.removeMarker(STORY_POPUP_ID);
      if (popup) {
        htmlMarkersLayer.addMarker({
          id: STORY_POPUP_ID,
          position: popup.position,
          content: popup.content,
          ...(popup.anchor && { anchor: popup.anchor }),
        });
      }
    },
    emitSceneEnter: (event) => emitter.emit('sceneEnter', event),
    emitSceneExit: (event) => emitter.emit('sceneExit', event),
    emitStoryComplete: (event) => emitter.emit('storyComplete', event),
  });

  const instance: GlobeInstance = {
    mount: () => {
      scene.start();
      void initCountries().then(() => emitter.emit('ready'));
    },
    destroy: () => {
      if (state.destroyed) return;
      state.destroyed = true;
      storyController.setStory(null);
      raycaster.destroy();
      controls.destroy();
      markersLayer.dispose();
      globeMesh.dispose();
      state.kindHandle?.dispose();
      state.countriesFillLayer?.dispose();
      state.legend?.dispose();
      state.countriesPickingLayer?.dispose();
      state.countryHighlightLayer?.dispose();
      state.countryActiveLayer?.dispose();
      state.countryLabelsLayer?.dispose();
      state.countryTooltip?.dispose();
      markerTooltip.dispose();
      state.htmlMarkersLayer.dispose();
      state.arcsLayer.dispose();
      starfieldLayer?.dispose();
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
      if (partial.countryData !== undefined) {
        state.countryData = partial.countryData;
        state.countriesFillLayer?.setData(partial.countryData);
      }
    },
    on: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => emitter.on(event, handler),
    off: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => emitter.off(event, handler),
    setRotation: (_position: LatLng) => {
      // implementacja do uzupełnienia - smooth rotation do danej pozycji
    },
    flyTo: (position, distance, options) => {
      controls.flyTo(globeLocalToWorldLatLng(position), distance, options ?? {});
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
    setCountryData: (data, scale) => {
      state.countryData = data;
      state.countriesFillLayer?.setData(data, scale);
    },
    getCountryData: () => state.countryData,
    setCountryLabelsEnabled: (enabled) => {
      state.countryLabelsLayer?.setEnabled(enabled);
    },
    setCountryLabels: (labels) => {
      state.countryLabelsLayer?.setLabels(labels);
    },
    showLegend: (scale, options) => {
      const tooltipFontSize = tokens['legend.fontSize'];
      const themedStyle = {
        background: tokens['legend.backgroundColor'],
        textColor: tokens['legend.textColor'],
        titleColor: tokens['legend.titleColor'],
        fontSize: tooltipFontSize,
        fontFamily: tokens['legend.fontFamily'],
        padding: tokens['legend.padding'],
        borderRadius: tokens['legend.borderRadius'],
      };
      const merged: LegendOptions = {
        ...options,
        style: { ...themedStyle, ...options?.style },
      };
      if (state.legend) {
        state.legend.update(scale, merged);
      } else {
        state.legend = createLegend({ container: config.container, scale, ...merged });
      }
    },
    hideLegend: () => {
      state.legend?.dispose();
      state.legend = null;
    },
    setStory: (story: StoryConfig | null) => storyController.setStory(story),
    playStory: () => storyController.play(),
    pauseStory: () => storyController.pause(),
    nextScene: () => storyController.next(),
    prevScene: () => storyController.prev(),
    goToScene: (id: string) => storyController.goTo(id),
    getCurrentScene: (): SceneConfig | null => storyController.getCurrentScene(),
    isStoryPlaying: () => storyController.isPlaying(),
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
      controls.flyTo(globeLocalToWorldLatLng(center), distance, options ?? {});
    },
    setMarkers: (markers: ReadonlyArray<MarkerConfig>) => markersLayer.setMarkers(markers),
    addMarker: (marker: MarkerConfig) => markersLayer.addMarker(marker),
    removeMarker: (id: string) => markersLayer.removeMarker(id),
    setHtmlMarkers: (markers) => htmlMarkersLayer.setMarkers(markers),
    addHtmlMarker: (marker) => htmlMarkersLayer.addMarker(marker),
    removeHtmlMarker: (id) => htmlMarkersLayer.removeMarker(id),
    setArcs: (arcs) => arcsLayer.setArcs(arcs),
    addArc: (arc) => arcsLayer.addArc(arc),
    removeArc: (id) => arcsLayer.removeArc(id),
    toImage: (options) =>
      new Promise((resolve, reject) => {
        try {
          // Force a fresh render so the canvas reflects the latest state.
          scene.renderer.render(scene.scene, scene.camera);
          const canvas = scene.renderer.domElement;
          if (options?.width && options?.height) {
            // Render at the requested resolution by temporarily resizing the
            // renderer; the host canvas keeps its CSS size, so visuals don't
            // flicker if user is watching.
            const prevSize = scene.renderer.getSize(new Vector2());
            scene.renderer.setSize(options.width, options.height, false);
            scene.renderer.render(scene.scene, scene.camera);
            const url = canvas.toDataURL('image/png');
            scene.renderer.setSize(prevSize.x, prevSize.y, false);
            scene.renderer.render(scene.scene, scene.camera);
            resolve(url);
          } else {
            resolve(canvas.toDataURL('image/png'));
          }
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
    resize: () => scene.resize(),
    getCanvas: () => scene.getCanvas(),
  };

  return instance;
};
