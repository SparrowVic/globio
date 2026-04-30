import { AmbientLight, DirectionalLight, Group, Vector2 } from 'three';
import { SceneManager } from './renderer/scene-manager';
import { GlobeMesh } from './renderer/globe-mesh';
import { MarkersLayer } from './renderer/markers-layer';
import type { CountryFeature } from './renderer/country-feature';
import { CountriesPickingLayer } from './renderer/countries-picking-layer';
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
import type { OutlineKindHandle } from './kinds/outline';
import type { DottedKindHandle } from './kinds/dotted';
import type { WireframeKindHandle } from './kinds/wireframe';
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
 * Whether two same-type data-layer configs differ only in fields that the
 * existing handle can swap via `setData()` (samples, kernel, scale, …).
 * Structural fields — texture / mesh resolution — own GPU buffers allocated
 * at construction time, so changes there force a full dispose + rebuild.
 */
const canUpdateInPlace = (
  prev: import('./data-layers/types').DataLayer,
  next: import('./data-layers/types').DataLayer
): boolean => {
  if (prev.type !== 'heatmap' || next.type !== 'heatmap') return true;
  const a = prev.textureResolution;
  const b = next.textureResolution;
  if ((a?.width ?? -1) !== (b?.width ?? -1)) return false;
  if ((a?.height ?? -1) !== (b?.height ?? -1)) return false;
  const m = prev.meshResolution;
  const n = next.meshResolution;
  if ((m?.width ?? -1) !== (n?.width ?? -1)) return false;
  if ((m?.height ?? -1) !== (n?.height ?? -1)) return false;
  return true;
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
  /**
   * Loaded country features. Set once `initCountries()` resolves; data-layer
   * builders read this so they can scaffold their geometry without re-loading.
   */
  features: ReadonlyArray<CountryFeature> | null;
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
  /**
   * Active data layer slot. `setDataLayer(...)` replaces the entire pair —
   * disposes the previous handle, builds a new one via the active kind's
   * decoration, swaps it in. Null when no data layer is mounted.
   */
  dataLayer: { config: import('./data-layers/types').DataLayer; handle: import('./data-layers/types').DataLayerHandle } | null;
  legend: LegendInstance | null;
  /** Last surface click in lat/lng. Used for the focus-pulse `origin: 'click'` mode. */
  lastClickLatLng: LatLng | null;
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
      state.kindHandle?.decorations?.focusPulse?.update?.(delta);
      state.dataLayer?.handle.update?.(delta, state.elapsedSeconds);
      state.htmlMarkersLayer.update();
      state.markersLayer.update(delta);
      state.countryHighlightLayer?.update(delta);
      state.countryActiveLayer?.update(delta);
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

  // Outline + dotted kinds both expose `setHoveredCountry` to drive their
  // hover-only effects (glow halo / dot expansion) from the same signal as
  // `CountryHighlightLayer`. The optional call no-ops on other kinds.
  const setKindHover = (id: string | null): void => {
    const handle = state.kindHandle as
      | (OutlineKindHandle & DottedKindHandle)
      | null;
    handle?.setHoveredCountry?.(id);
  };

  const handleCountryHit = (
    object: Object3D | null,
    point: Vector3 | undefined
  ): { country: CountryData; point: LatLng } | null => {
    if (!object || !state.countriesPickingLayer) return null;
    const id = object.userData['countryId'];
    if (typeof id !== 'string') return null;
    const country = state.countriesPickingLayer.getCountry(id);
    if (!country) return null;
    // Raycaster gives us world-space hit points. Convert to globe-LOCAL
    // before lat/lng so consumers (notably `focusOnCountry({ center })`,
    // which re-applies globeLocalToWorldLatLng internally) don't double-
    // transform when an axisTilt is set on the globeGroup.
    let ll: LatLng = [0, 0];
    if (point) {
      const local = point.clone();
      globeGroup.updateMatrixWorld();
      local.applyMatrix4(globeGroup.matrixWorld.clone().invert());
      ll = vector3ToLatLng(local);
    }
    return { country, point: ll };
  };

  // Stream every pointer move to the active kind so it can drive
  // follow-cursor extras (crosshair, lat/lng readout). The base `onHover`
  // path is debounced by hit-key change and would miss intra-country moves.
  const dispatchPointerMove = (
    hit: { type: 'marker' | 'country' | 'surface'; point?: Vector3 } | null,
    pixel: { x: number; y: number }
  ): void => {
    const handle = state.kindHandle as (KindHandle & {
      setPointerPixel?(x: number, y: number): void;
    }) | null;
    handle?.setPointerPixel?.(pixel.x, pixel.y);
    if (hit?.type === 'marker') {
      handle?.onPointerMove?.(null, null);
      return;
    }
    if (hit?.point) {
      const localPoint = hit.point.clone();
      globeGroup.updateMatrixWorld();
      const inverse = globeGroup.matrixWorld.clone().invert();
      localPoint.applyMatrix4(inverse);
      handle?.onPointerMove?.(localPoint, vector3ToLatLng(localPoint));
      return;
    }
    handle?.onPointerMove?.(null, null);
  };

  const raycaster = new PointerRaycaster({
    camera: scene.camera,
    domElement: scene.renderer.domElement,
    targets: [{ type: 'marker', object: markersLayer.mesh }],
    onMove: dispatchPointerMove,
    onClick: (hit) => {
      // Kind-level click hook fires for any surface hit so kinds can launch
      // ripples / pulses from the impact point. We hand it the raycast
      // intersection in globe-local 3D and the same as lat/lng.
      let clickLatLng: LatLng | null = null;
      if (hit?.point) {
        const localPoint = hit.point.clone();
        globeGroup.updateMatrixWorld();
        const inverse = globeGroup.matrixWorld.clone().invert();
        localPoint.applyMatrix4(inverse);
        clickLatLng = vector3ToLatLng(localPoint);
        state.lastClickLatLng = clickLatLng;
        state.kindHandle?.onPointerDown?.(localPoint, clickLatLng);
      }
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        if (marker) emitter.emit('markerClick', { marker });
        return;
      }
      if (hit?.type === 'country') {
        const event = handleCountryHit(hit.object, hit.point);
        if (event) emitter.emit('countryClick', event);
        return;
      }
      // Surface click that didn't land on a country (water / void) —
      // optionally fire a focus pulse from the click point. Gated by both
      // the master `focusPulse.enabled` and the per-event opt-in.
      if (
        clickLatLng &&
        state.config.focusPulse?.enabled !== false &&
        state.config.focusPulse?.pulseOnSurfaceClick &&
        state.kindHandle?.decorations?.focusPulse
      ) {
        state.kindHandle.decorations.focusPulse.spawn(clickLatLng, 'click');
      }
      if (clickLatLng) emitter.emit('surfaceClick', { point: clickLatLng });
    },
    onHover: (hit) => {
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        emitter.emit('markerHover', marker ? { marker } : null);
        emitter.emit('countryHover', null);
        state.countryHighlightLayer?.clear();
        setKindHover(null);
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
          setKindHover(event.country.id);
          state.countryTooltip?.showCountry(event.country);
        } else {
          state.countryHighlightLayer?.clear();
          setKindHover(null);
          state.countryTooltip?.clear();
        }
        markersLayer.setHovered(null);
        markerTooltip.clear();
        return;
      }
      emitter.emit('markerHover', null);
      emitter.emit('countryHover', null);
      state.countryHighlightLayer?.clear();
      setKindHover(null);
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
    features: null,
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
    dataLayer: null,
    legend: null,
    lastClickLatLng: null,
    elapsedSeconds: 0,
    destroyed: false,
  };

  if (config.markers && config.markers.length > 0) {
    markersLayer.setMarkers(config.markers);
  }

  // Queue for `setDataLayer` calls that arrive before features (and the
  // active kind's decorators) have loaded. Drained inside `initCountries`
  // once `state.kindHandle` is built.
  let pendingDataLayer: import('./data-layers/types').DataLayer | null = null;

  const initCountries = async (): Promise<void> => {
    if (!config.countries) return;
    try {
      const features = await loadCountries({ resolution: countries.resolution });
      if (state.destroyed) return;
      state.features = features as ReadonlyArray<CountryFeature>;

      // Dispatch to the active kind module — outline draws borders + fills,
      // dotted a Points cloud, wireframe a lat/lng grid (without country
      // geometry), future kinds whatever they want. The picking layer is
      // mounted separately below for kinds that opt into country interaction.
      state.kindHandle = kindModule.build({
        globeGroup,
        features: features as ReadonlyArray<CountryFeature>,
        tokens,
        config,
        globeSurfaceMesh: globeMesh.mesh,
      });
      // Re-apply pending data layer (or legacy countryData) once the kind's
      // decorators are live. setDataLayer queues silently when kindHandle is
      // null; here we drain the queue. Order matters: explicit dataLayer
      // overrides any pending choropleth set via setCountryData.
      if (pendingDataLayer) {
        const queued = pendingDataLayer;
        pendingDataLayer = null;
        instance.setDataLayer(queued);
      } else if (state.countryData) {
        instance.setDataLayer({ type: 'choropleth', data: state.countryData });
      }
      // Re-apply pending active country to kind handle (e.g. wireframe ring)
      // if user called setActiveCountry before features loaded.
      if (state.activeCountryId) {
        (state.kindHandle as WireframeKindHandle | null)?.setActiveCountry?.(
          state.activeCountryId
        );
      }

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
          { type: 'surface', object: globeMesh.mesh },
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
      } else {
        // No country surface (wireframe). Marker raycasting plus the globe
        // sphere as a generic 'surface' target so kinds can still react to
        // any-click pulses via onPointerDown.
        raycaster.setTargets([
          { type: 'marker', object: markersLayer.mesh },
          { type: 'surface', object: globeMesh.mesh },
        ]);
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
      (state.kindHandle as WireframeKindHandle | null)?.setActiveCountry?.(id);
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
      state.dataLayer?.handle.dispose();
      state.kindHandle?.dispose();
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
        instance.setCountryData(partial.countryData);
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
      (state.kindHandle as WireframeKindHandle | null)?.setActiveCountry?.(id);
    },
    getActiveCountry: () => state.activeCountryId,
    setCountryData: (data, scale) => {
      // Legacy convenience API; routes through the new DataLayer pipeline so
      // choropleth rendering goes through the active kind's decoration.
      // Clearing only yanks the slot when it's currently choropleth — leaves
      // bars/extruded/heatmap untouched.
      const prev = state.countryData;
      state.countryData = data;
      state.kindHandle?.onCountryDataChange?.(data, prev);
      if (data === null) {
        if (state.dataLayer?.config.type === 'choropleth') {
          instance.setDataLayer(null);
        }
        return;
      }
      instance.setDataLayer({
        type: 'choropleth',
        data,
        ...(scale && { scale }),
      });
    },
    getCountryData: () => state.countryData,
    setDataLayer: (layer) => {
      if (!layer) {
        state.dataLayer?.handle.dispose();
        state.dataLayer = null;
        pendingDataLayer = null;
        return;
      }
      // No kindHandle yet (features still loading) → queue, drain in
      // initCountries once decorators are ready.
      if (!state.kindHandle) {
        state.dataLayer?.handle.dispose();
        state.dataLayer = null;
        pendingDataLayer = layer;
        return;
      }
      // In-place update fast path: same type + handle exposes setData →
      // re-use the existing shader / texture / mesh and let the handle
      // diff the layer config. Critical for slider performance — without
      // this every tick re-allocates the entire heatmap pipeline.
      //
      // Structural fields (texture / mesh resolution) live in fixed-size
      // GPU buffers allocated at construction, so a change there forces a
      // full rebuild — the in-place path can't grow them.
      if (
        state.dataLayer &&
        state.dataLayer.config.type === layer.type &&
        state.dataLayer.handle.setData &&
        canUpdateInPlace(state.dataLayer.config, layer)
      ) {
        state.dataLayer.handle.setData(layer);
        state.dataLayer = { config: layer, handle: state.dataLayer.handle };
        return;
      }
      // Different type (or no current layer / handle without setData) →
      // tear down + build fresh.
      state.dataLayer?.handle.dispose();
      state.dataLayer = null;
      const builder = state.kindHandle.decorations?.dataLayers?.[layer.type];
      if (!builder) {
        // eslint-disable-next-line no-console
        console.warn(
          `[globio] kind '${state.resolvedKind}' has no '${layer.type}' data-layer decoration; layer not rendered.`
        );
        return;
      }
      const handle = builder(layer, {
        globeGroup,
        features: state.features ?? [],
        tokens,
      });
      state.dataLayer = { config: layer, handle };
    },
    getDataLayer: () => state.dataLayer?.config ?? null,
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
      // `options.center` lets callers override the camera target — keeps the
      // country's bounds-derived distance (so Russia still frames as Russia)
      // but centers on whatever lat/lng the caller passed (e.g. the exact
      // click point for "direct-focus" mode in the demo).
      const center = options?.center ?? boundsCenter(bounds);
      if (pauseAutoRotate) controls.setAutoRotate(false);
      controls.flyTo(globeLocalToWorldLatLng(center), distance, options ?? {});
      state.kindHandle?.onCountryFocus?.(center, id);
      // Focus pulse via decoration. Origin defaults to the country centroid;
      // 'click' uses the most recent surface-click lat/lng so the pulse
      // lands exactly where the user pointed (falling back to centroid).
      if (state.config.focusPulse?.enabled === false) return;
      const origin = state.config.focusPulse?.origin ?? 'centroid';
      const pulseLatLng =
        origin === 'click' && state.lastClickLatLng
          ? state.lastClickLatLng
          : center;
      state.kindHandle?.decorations?.focusPulse?.spawn(pulseLatLng, 'focus');
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
