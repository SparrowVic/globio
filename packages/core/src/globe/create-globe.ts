import { AmbientLight, DirectionalLight, Group, Vector2 } from 'three';
import { SceneManager } from '../renderer/scene-manager';
import { GlobeMesh } from '../renderer/globe-mesh';
import type { CountryFeature } from '../renderer/country-feature';
import { CountriesPickingLayer } from '../renderer/countries-picking-layer';
import { CountryTooltip } from '../renderer/country-tooltip';
import { MarkerTooltip } from '../renderer/marker-tooltip';
import { HtmlMarkersLayer } from '../renderer/html-markers-layer';
// Renderer/* still owns the canonical *type* shapes for the layers
// dispatched through `kindModule.layers` — every per-kind class is
// structurally compatible with these. Imported as `type` only; the
// runtime constructor comes from the kind registry.
import type { StarfieldLayer } from '../renderer/starfield-layer';
import { StoryController } from '../story/story-controller';
import type { SceneConfig, StoryConfig } from '../story/types';
import { KIND_MODULES } from '../kinds/registry';
import type { GlobeKind, KindHandle, KindLayerRegistry, Public } from '../kinds/types';
import type { OutlineKindHandle } from '../kinds/outline';
import type { DottedKindHandle } from '../kinds/dotted';
import type { HologramKindHandle } from '../kinds/hologram';
import { GlobeControls } from '../interaction/controls';
import { PointerRaycaster } from '../interaction/raycaster';
import { GlobeEventEmitter } from '../interaction/events';
import { loadCountries } from '../data/geo-loader';
import { createLegend, type LegendOptions } from '../data/legend';
import { resolveTheme } from '../theme/resolver';
import { GLOBE_RADIUS, latLngToVector3, vector3ToLatLng } from '../utils/coordinates';
import { boundsCenter } from '../utils/country-bounds';
import type {
  CountryData,
  GlobeConfig,
  GlobeEventName,
  GlobeEvents,
  GlobeInstance,
  LatLng,
  MarkerConfig,
  StarfieldConfig,
} from '../types';
import type { ResolvedTokens } from '../theme';
import type { Object3D, Vector3 } from 'three';
import { DEFAULT_COUNTRIES, DEFAULT_PERFORMANCE, resolveActiveKind } from './defaults';
import { canUpdateInPlace } from './data-layer-diff';
import { computeFocusDistance } from './focus-distance';
import { computeFramedDistance } from './framing';
import type { InternalState } from './internal-state';

export const createGlobe = (config: GlobeConfig): GlobeInstance => {
  const emitter = new GlobeEventEmitter();
  const tokens = resolveTheme(config.theme);
  const performance = { ...DEFAULT_PERFORMANCE, ...config.performance };
  const countries = config.countries
    ? { ...DEFAULT_COUNTRIES, ...config.countries }
    : DEFAULT_COUNTRIES;

  const scene = new SceneManager({
    container: config.container,
    backgroundColor: config.transparent ? null : tokens['background.color'],
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
      state.countryFillLayer?.update(delta);
      state.countryLabelsLayer?.update();
      starfieldLayer?.update(delta);
      atmosphereLayer?.update(delta);
    },
    onResize: (width, height) => {
      // Keep LineMaterial resolution uniforms in sync so screen-space
      // pixel widths stay accurate after a viewport / panel resize.
      arcsLayer.setResolution(width, height);
    },
  });

  // Camera framing — pull the camera back so the globe + atmosphere fits
  // comfortably inside the canvas rather than clipping against the edge.
  // The visible halo extent is ~1.25 × GLOBE_RADIUS in screen space
  // (atmosphere mesh @ 1.15 + Fresnel falloff). Solve the perspective
  // equation `half_height = distance * tan(fov/2)` for distance:
  //   distance = (1.25 * (1 + padding)) / tan(fov/2)
  // and assign before GlobeControls reads `camera.position` to seed its
  // spherical coordinates.
  const framedDistance = computeFramedDistance(config.framing, scene.camera);
  if (framedDistance !== null) {
    scene.camera.position.set(0, 0, framedDistance);
    scene.camera.lookAt(0, 0, 0);
  }

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

  // The active globe kind decides every shared-layer constructor below.
  // Resolved up here (rather than after the layer constructions like the
  // pre-Phase-B layout) so `kindModule.layers.X` is in scope for every
  // `new` site — labels, starfield, arcs, markers, atmosphere, hover.
  const resolvedKind: GlobeKind = resolveActiveKind(config);
  const kindModule = KIND_MODULES[resolvedKind];

  // `let` so `update({ starfield })` can swap the layer in-place when a
  // geometry-baked field changes (density, palette, sizeVariety) — the
  // rest of the scene keeps rendering uninterrupted, only the points
  // cloud blinks for one frame.
  let starfieldLayer: Public<StarfieldLayer> | null = config.starfield?.enabled
    ? buildStarfieldLayer(config.starfield, tokens, kindModule.layers.StarfieldLayer)
    : null;
  if (starfieldLayer) scene.scene.add(starfieldLayer.object);

  const globeMesh = new GlobeMesh({
    color: tokens['globe.surfaceColor'],
    ...(tokens['globe.surfaceTextureUrl'] !== '' && {
      textureUrl: tokens['globe.surfaceTextureUrl'],
    }),
  });
  globeGroup.add(globeMesh.mesh);

  const markersLayer = new kindModule.layers.MarkersLayer({
    defaultColor: tokens['markers.defaultColor'],
  });
  globeGroup.add(markersLayer.mesh);

  const arcsLayer = new kindModule.layers.ArcsLayer({
    defaultColor: tokens['arcs.color'],
    defaultWidth: tokens['arcs.width'],
    defaultOpacity: tokens['arcs.opacity'],
    headColor: tokens['arcs.headColor'],
    headSize: tokens['arcs.headSize'],
    resolution: new Vector2(
      config.container.clientWidth || window.innerWidth,
      config.container.clientHeight || window.innerHeight,
    ),
  });
  globeGroup.add(arcsLayer.group);
  if (config.arcs && config.arcs.length > 0) arcsLayer.setArcs(config.arcs);

  // Always construct so live setters can flip enabled / color / intensity
  // without rebuilding. `enabled: false` just hides the mesh.
  //
  // Sentinel filter for `radiusScale`/`power`: we drop the field when the
  // caller passes `0` (or radiusScale ≤ 1) so the layer's own DEFAULTS
  // kick in. The configurator wires these through unconditionally with
  // `0` meaning "use theme/layer default" — without the filter the
  // value `0` reached `??` (which only falls back on `undefined`) and
  // built a degenerate `SphereGeometry(0, …)` mesh that disappeared
  // entirely. Color/intensity already had this filter inline above; the
  // live-update path at the bottom of `update()` keeps the same
  // semantics so init and runtime behave the same way.
  const atmosphereLayer = new kindModule.layers.AtmosphereLayer({
    color:
      config.atmosphere?.color && config.atmosphere.color !== ''
        ? config.atmosphere.color
        : tokens['atmosphere.color'],
    intensity:
      config.atmosphere?.intensity && config.atmosphere.intensity > 0
        ? config.atmosphere.intensity
        : tokens['atmosphere.intensity'],
    ...(config.atmosphere?.radiusScale !== undefined &&
      config.atmosphere.radiusScale > 1 && {
        radiusScale: config.atmosphere.radiusScale,
      }),
    ...(config.atmosphere?.power !== undefined &&
      config.atmosphere.power > 0 && { power: config.atmosphere.power }),
    ...(config.atmosphere?.threshold !== undefined && {
      threshold: config.atmosphere.threshold,
    }),
    ...(config.atmosphere?.side !== undefined && { side: config.atmosphere.side }),
    ...(config.atmosphere?.blending !== undefined && { blending: config.atmosphere.blending }),
    ...(config.atmosphere?.pulse !== undefined && { pulse: config.atmosphere.pulse }),
  });
  atmosphereLayer.setVisible(config.atmosphere?.enabled !== false);
  globeGroup.add(atmosphereLayer.mesh);

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

  // When framing.lockZoom is on, force min/max zoom to the framed distance
  // so the user can't zoom out of (or further into) the carefully framed
  // composition. The caller's own minZoom/maxZoom take precedence if set.
  const lockedDistance =
    config.framing?.lockZoom && framedDistance !== null ? framedDistance : null;
  const minDistance = config.minZoom ?? lockedDistance ?? undefined;
  const maxDistance = config.maxZoom ?? lockedDistance ?? undefined;

  const controls = new GlobeControls({
    camera: scene.camera,
    domElement: scene.renderer.domElement,
    ...(config.autoRotate?.speed !== undefined && { autoRotateSpeed: config.autoRotate.speed }),
    ...(minDistance !== undefined && { minDistance }),
    ...(maxDistance !== undefined && { maxDistance }),
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
      // Drive the country-fill state-override slot from the same hover
      // signal. Empty string color → undefined (`setHoverState` treats
      // `undefined` as "no override" — country renders with its base
      // mode color). Reads the latest config so live changes propagate
      // without a rebuild.
      const fillHover = state.config.countries?.fill;
      const setFillHover = (id: string | null): void => {
        const color =
          fillHover?.hoverColor && fillHover.hoverColor !== '' ? fillHover.hoverColor : undefined;
        const opacity =
          fillHover?.hoverOpacity !== undefined && fillHover.hoverOpacity > 0
            ? fillHover.hoverOpacity
            : undefined;
        state.countryFillLayer?.setHoverState(id, color, opacity);
      };
      if (hit?.type === 'marker' && hit.instanceId !== undefined) {
        const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
        emitter.emit('markerHover', marker ? { marker } : null);
        emitter.emit('countryHover', null);
        state.countryHighlightLayer?.clear();
        setFillHover(null);
        setKindHover(null);
        state.countryTooltip?.clear();
        markersLayer.setHovered(marker?.id ?? null);
        if (marker) markerTooltip.showMarker(marker);
        else markerTooltip.clear();
        return;
      }
      if (hit?.type === 'country') {
        if (state.config.countries?.hoverEnabled === false) {
          emitter.emit('countryHover', null);
          emitter.emit('markerHover', null);
          state.countryHighlightLayer?.clear();
          setFillHover(null);
          setKindHover(null);
          state.countryTooltip?.clear();
          markersLayer.setHovered(null);
          markerTooltip.clear();
          return;
        }
        const event = handleCountryHit(hit.object, hit.point);
        emitter.emit('countryHover', event);
        emitter.emit('markerHover', null);
        if (event) {
          state.countryHighlightLayer?.showCountry(event.country.id);
          setFillHover(event.country.id);
          setKindHover(event.country.id);
          state.countryTooltip?.showCountry(event.country);
        } else {
          state.countryHighlightLayer?.clear();
          setFillHover(null);
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
      setFillHover(null);
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
    countryFillLayer: null,
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
  let pendingDataLayer: import('../data-layers/types').DataLayer | null = null;

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
      // Surface the kind's country-fill layer (if mounted) so the global
      // hover / active wiring + the live-update branch + the choropleth
      // builder all see the same instance. Outline always mounts;
      // future kinds opt in by implementing `getCountryFillLayer`.
      state.countryFillLayer =
        (
          state.kindHandle as
            | { readonly getCountryFillLayer?: () => InternalState['countryFillLayer'] }
            | null
        )?.getCountryFillLayer?.() ?? null;
      // If the user pinned a country before features loaded, re-apply the
      // pinned-fill override now that the layer exists.
      if (state.activeCountryId && state.countryFillLayer) {
        const fillCfg = state.config.countries?.fill;
        const c = fillCfg?.activeColor && fillCfg.activeColor !== '' ? fillCfg.activeColor : undefined;
        const o =
          fillCfg?.activeOpacity !== undefined && fillCfg.activeOpacity > 0
            ? fillCfg.activeOpacity
            : undefined;
        state.countryFillLayer.setActiveState(state.activeCountryId, c, o);
      }
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
      // Re-apply pending active country to kind handle (e.g. wireframe ring
      // or dotted pinned-pulse) if user called setActiveCountry before
      // features loaded.
      if (state.activeCountryId) {
        (state.kindHandle as
          | { readonly setActiveCountry?: (id: string | null) => void }
          | null
        )?.setActiveCountry?.(state.activeCountryId);
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

        // Mount the standard outline-stroke hover + active layers only if
        // the kind opts in. Kinds with their own visual language for
        // hover / active feedback (e.g. dotted's brightening dots) set
        // `usesStandardCountryHighlight: false` so the line-segments
        // strokes don't fight their aesthetic.
        const useStandardHighlight = kindModule.usesStandardCountryHighlight !== false;
        if (useStandardHighlight) {
          // Outline kind is pure linework — the legacy 1.0025 default lift
          // shows up as a duplicated stroke. Default outline lift to 0 so
          // the highlight redraws the existing border rather than stacking
          // above it; expose the knob via OutlineConfig.hover.lift if a
          // caller wants the lifted look back. Other kinds keep the default
          // since their fills mask any z-fight on the same radius.
          const highlightSurfaceRadius =
            resolvedKind === 'outline'
              ? GLOBE_RADIUS * (1 + (config.outline?.hover?.lift ?? 0))
              : undefined;

          // Per-instance overrides for hover/active stroke color + width
          // + opacity. Empty string / non-positive numeric → fall back to
          // the theme token (same sentinel pattern as atmosphere/labels).
          const hoverCfg = config.countries?.borderHover;
          const activeCfg = config.countries?.borderActive;
          const pickColor = (override: string | undefined, token: string): string =>
            override && override !== '' ? override : token;
          const pickPositive = (override: number | undefined, token: number): number =>
            override !== undefined && override > 0 ? override : token;

          const highlight = new kindModule.layers.SelectionLayer({
            hoverColor: pickColor(hoverCfg?.color, tokens['countries.borderHover.color']),
            hoverWidth: pickPositive(hoverCfg?.width, tokens['countries.borderHover.width']),
            hoverOpacity: pickPositive(
              hoverCfg?.opacity,
              tokens['countries.borderHover.opacity']
            ),
            occludeBackSide: countries.hoverOccludeBackSide,
            ...(highlightSurfaceRadius !== undefined
              ? { surfaceRadius: highlightSurfaceRadius }
              : {}),
          });
          highlight.registerFeatures(features as ReadonlyArray<CountryFeature>);
          globeGroup.add(highlight.object);
          state.countryHighlightLayer = highlight;

          const activeLayer = new kindModule.layers.SelectionLayer({
            hoverColor: pickColor(activeCfg?.color, tokens['countries.borderActive.color']),
            hoverWidth: pickPositive(activeCfg?.width, tokens['countries.borderActive.width']),
            hoverOpacity: pickPositive(
              activeCfg?.opacity,
              tokens['countries.borderActive.opacity']
            ),
            occludeBackSide: countries.hoverOccludeBackSide,
            ...(highlightSurfaceRadius !== undefined
              ? { surfaceRadius: highlightSurfaceRadius }
              : {}),
          });
          activeLayer.registerFeatures(features as ReadonlyArray<CountryFeature>);
          activeLayer.object.renderOrder = 11;
          globeGroup.add(activeLayer.object);
          state.countryActiveLayer = activeLayer;
          // Re-apply pending active country if user called
          // setActiveCountry before features loaded.
          if (state.activeCountryId) activeLayer.showCountry(state.activeCountryId);
        }
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
      const labelsLayer = new kindModule.layers.LabelsLayer({
        container: config.container,
        camera: scene.camera,
        globeGroup,
        features: features as ReadonlyArray<CountryFeature>,
        // Empty-string color / non-positive size / empty-string weight
        // mean "use the theme default" — same sentinel semantics as
        // the live update path so the construction + update share a
        // single mental model.
        color:
          labelsConfig?.color && labelsConfig.color !== ''
            ? labelsConfig.color
            : tokens['countries.label.color'],
        fontSize:
          labelsConfig?.fontSize && labelsConfig.fontSize > 0
            ? labelsConfig.fontSize
            : tokens['countries.label.fontSize'],
        fontFamily: tokens['countries.label.fontFamily'],
        fontWeight:
          labelsConfig?.fontWeight && labelsConfig.fontWeight !== ''
            ? labelsConfig.fontWeight
            : tokens['countries.label.fontWeight'],
        textShadow: tokens['countries.label.textShadow'],
        ...(labelsConfig?.minScreenSize !== undefined && {
          minScreenSize: labelsConfig.minScreenSize,
        }),
        ...(labelsConfig?.sizeFadeRange !== undefined && {
          sizeFadeRange: labelsConfig.sizeFadeRange,
        }),
        ...(labelsConfig?.occlusionFade !== undefined && {
          occlusionFade: labelsConfig.occlusionFade,
        }),
        ...(labelsConfig?.transitionMs !== undefined && {
          transitionMs: labelsConfig.transitionMs,
        }),
        ...(labelsConfig?.halo !== undefined && labelsConfig.halo !== null
          ? { halo: labelsConfig.halo }
          : {}),
        ...(labelsConfig?.padding !== undefined && { padding: labelsConfig.padding }),
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
      // Mirror the pinned-state on the fill layer — its setActiveState
      // override recolors the pinned country with the configured active
      // fill (if any) on top of whatever the mode produced.
      const fillCfg = state.config.countries?.fill;
      const activeColor =
        fillCfg?.activeColor && fillCfg.activeColor !== '' ? fillCfg.activeColor : undefined;
      const activeOpacity =
        fillCfg?.activeOpacity !== undefined && fillCfg.activeOpacity > 0
          ? fillCfg.activeOpacity
          : undefined;
      state.countryFillLayer?.setActiveState(id, activeColor, activeOpacity);
      // Forward to any kind handle that surfaces a `setActiveCountry`
      // hook (wireframe ring, dotted pinned-pulse, …). Cast through a
      // duck-typed shape so each kind-handle interface stays its own
      // concern.
      (state.kindHandle as
        | { readonly setActiveCountry?: (id: string | null) => void }
        | null
      )?.setActiveCountry?.(id);
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
      const prev = state.config;
      state.config = mergeRuntimeConfig(state.config, partial);
      if (partial.markers !== undefined) markersLayer.setMarkers(partial.markers);
      if (partial.htmlMarkers !== undefined) htmlMarkersLayer.setMarkers(partial.htmlMarkers);
      if (partial.arcs !== undefined) arcsLayer.setArcs(partial.arcs);
      if (partial.autoRotate) {
        const nextAutoRotate = state.config.autoRotate ?? partial.autoRotate;
        controls.setAutoRotate(nextAutoRotate.enabled ?? false, nextAutoRotate.speed);
      }
      if (partial.zoom !== undefined) {
        controls.setZoom(partial.zoom);
      }
      if (partial.countryData !== undefined) {
        instance.setCountryData(partial.countryData);
      }

      // Country labels — every field is live-updatable because the
      // labels layer reads thresholds per-frame and per-element CSS is
      // walkable. setEnabled toggles host visibility, the rest just
      // mutate state used by the existing render path.
      if (partial.countryLabels !== undefined) {
        const next = partial.countryLabels;
        const layer = state.countryLabelsLayer;
        if (layer) {
          if (next.enabled !== undefined) layer.setEnabled(next.enabled);
          if (next.minScreenSize !== undefined) layer.setMinScreenSize(next.minScreenSize);
          if (next.sizeFadeRange !== undefined) layer.setSizeFadeRange(next.sizeFadeRange);
          if (next.occlusionFade !== undefined) layer.setOcclusionFade(next.occlusionFade);
          if (next.transitionMs !== undefined) layer.setTransitionMs(next.transitionMs);
          if (next.halo !== undefined) {
            layer.setHalo(state.config.countryLabels?.halo ?? next.halo);
          }
          // Color / font: an empty-string color or non-positive size /
          // empty-string weight means "reset to theme default" so the
          // workshop's clear-override flow restores the layer state.
          // Otherwise the literal value is applied.
          if (next.color !== undefined) {
            if (next.color === '') layer.resetColor();
            else layer.setColor(next.color);
          }
          if (next.fontSize !== undefined) {
            if (next.fontSize <= 0) layer.resetFontSize();
            else layer.setFontSize(next.fontSize);
          }
          if (next.fontWeight !== undefined) {
            if (next.fontWeight === '') layer.resetFontWeight();
            else layer.setFontWeight(next.fontWeight);
          }
          if (next.labels !== undefined) layer.setLabels(next.labels);
        }
      }

      // Starfield — split between uniform-friendly fields (size,
      // twinkle, master toggle) which mutate live, and geometry-baked
      // fields (density, palette, sizeVariety) which need the layer
      // rebuilt in-place. We compare against the previous config so
      // the workshop / studio can pass a full StarfieldConfig and the
      // engine decides what's cheap vs what needs a swap.
      if (partial.starfield !== undefined) {
        const next = state.config.starfield ?? partial.starfield;
        const prevStars = prev.starfield;
        const enabledNow = next.enabled !== undefined ? next.enabled : prevStars?.enabled === true;
        // Geometry-baked fields → in-place layer swap. Compare palette
        // by *content* not reference (callers usually rebuild the
        // array each render, so reference comparison would flag every
        // tick as a change and thrash the GPU).
        const wantRebuild =
          enabledNow &&
          (next.density !== prevStars?.density ||
            !palettesEqual(next.palette, prevStars?.palette) ||
            next.sizeVariety !== prevStars?.sizeVariety);

        if (!enabledNow) {
          // Toggle off → keep the layer mounted but hide it. setVisible
          // is a flag flip on Three.Object3D.visible, no GPU work.
          starfieldLayer?.setVisible(false);
        } else if (!starfieldLayer) {
          // Toggle on for the first time → build the layer fresh.
          starfieldLayer = buildStarfieldLayer(next, tokens, kindModule.layers.StarfieldLayer);
          scene.scene.add(starfieldLayer.object);
        } else if (wantRebuild) {
          // Geometry-baked field changed → swap the layer atomically.
          // Only the points cloud blinks for one frame; rest of the
          // scene keeps rendering uninterrupted.
          scene.scene.remove(starfieldLayer.object);
          starfieldLayer.dispose();
          starfieldLayer = buildStarfieldLayer(next, tokens, kindModule.layers.StarfieldLayer);
          scene.scene.add(starfieldLayer.object);
        } else {
          // Live uniform updates — no rebuild, no blink.
          starfieldLayer.setVisible(true);
          if (next.size !== undefined) starfieldLayer.setSize(next.size);
          if (partial.starfield.twinkle !== undefined) {
            starfieldLayer.setTwinkle(next.twinkle ?? partial.starfield.twinkle);
          }
        }
      }

      // Top-level focus pulse — origin / pulseOnSurfaceClick are read
      // from `state.config.focusPulse` at click time, so spreading the
      // partial into `state.config` (above) is enough. The kind-specific
      // band geometry is handled by `partial.outline.focusPulse` below.
      // No-op here, kept as a placeholder + comment for clarity.

      // Atmosphere — visibility flip + (live) shader uniforms +
      // geometry rebuild for radius scale. Empty-string color / non-
      // positive numerics are reset-to-theme-default sentinels.
      if (partial.atmosphere !== undefined) {
        const a = partial.atmosphere;
        if (a.enabled !== undefined) atmosphereLayer?.setVisible(a.enabled);
        if (a.color !== undefined) {
          if (a.color === '') atmosphereLayer?.resetColor();
          else atmosphereLayer?.setColor(a.color);
        }
        if (a.intensity !== undefined) {
          if (a.intensity <= 0) atmosphereLayer?.resetIntensity();
          else atmosphereLayer?.setIntensity(a.intensity);
        }
        if (a.power !== undefined) {
          if (a.power <= 0) atmosphereLayer?.resetPower();
          else atmosphereLayer?.setPower(a.power);
        }
        if (a.threshold !== undefined) atmosphereLayer?.setThreshold(a.threshold);
        if (a.radiusScale !== undefined) {
          if (a.radiusScale <= 1) atmosphereLayer?.resetRadiusScale();
          else atmosphereLayer?.setRadiusScale(a.radiusScale);
        }
        if (a.side !== undefined) atmosphereLayer?.setSide(a.side);
        if (a.blending !== undefined) atmosphereLayer?.setBlending(a.blending);
        if (a.pulse !== undefined) {
          atmosphereLayer?.setPulse(state.config.atmosphere?.pulse ?? a.pulse);
        }
      }

      // Country selection (hover stroke + active stroke + glow halo).
      // Each setter is a no-op on the sentinel value (empty-string color,
      // ≤ 0 numeric) so the configurator's "leave as-is" path doesn't
      // reset live mid-tweak. `hoverEnabled` is read by the pointer
      // hit path, so spreading the partial into `state.config` above is
      // enough for the live toggle.
      if (partial.countries !== undefined) {
        const occ = partial.countries.hoverOccludeBackSide;
        if (occ !== undefined) {
          state.countryHighlightLayer?.setOccludeBackSide(occ);
          state.countryActiveLayer?.setOccludeBackSide(occ);
        }
        const hCfg = partial.countries.borderHover;
        if (hCfg !== undefined) {
          if (hCfg.color !== undefined) state.countryHighlightLayer?.setColor(hCfg.color);
          if (hCfg.width !== undefined) state.countryHighlightLayer?.setWidth(hCfg.width);
          if (hCfg.opacity !== undefined)
            state.countryHighlightLayer?.setOpacity(hCfg.opacity);
          // Glow setters live on the outline kind handle (only outline
          // mounts a glow halo today). Cast through the duck-typed shape
          // so non-outline kinds silently no-op.
          const handle = state.kindHandle as
            | (KindHandle & {
                setHoverGlowColor?: (c: string) => void;
                setHoverGlowWidth?: (w: number) => void;
                setHoverGlowOpacity?: (o: number) => void;
              })
            | null;
          if (hCfg.glowColor !== undefined) handle?.setHoverGlowColor?.(hCfg.glowColor);
          if (hCfg.glowWidth !== undefined) handle?.setHoverGlowWidth?.(hCfg.glowWidth);
          if (hCfg.glowOpacity !== undefined) handle?.setHoverGlowOpacity?.(hCfg.glowOpacity);
        }
        const aCfg = partial.countries.borderActive;
        if (aCfg !== undefined) {
          if (aCfg.color !== undefined) state.countryActiveLayer?.setColor(aCfg.color);
          if (aCfg.width !== undefined) state.countryActiveLayer?.setWidth(aCfg.width);
          if (aCfg.opacity !== undefined) state.countryActiveLayer?.setOpacity(aCfg.opacity);
        }
        // Country-fill live updates. Mode flips, palette swaps, and
        // hover/active overrides all hit the same shared layer that the
        // choropleth data-layer also writes to via `setData`.
        const fCfg = partial.countries.fill;
        if (fCfg !== undefined) {
          if (fCfg.defaultColor !== undefined)
            state.countryFillLayer?.setDefaultColor(fCfg.defaultColor);
          if (fCfg.defaultOpacity !== undefined)
            state.countryFillLayer?.setDefaultOpacity(fCfg.defaultOpacity);
          if (fCfg.mode !== undefined) state.countryFillLayer?.setMode(fCfg.mode);
          if (fCfg.palette !== undefined) state.countryFillLayer?.setPalette(fCfg.palette);
          // Re-apply current hover / active selection with the new
          // colour overrides — the dedicated `setHoverOverride` /
          // `setActiveOverride` setters update colour/opacity in place
          // without dropping the existing hover/active id, so a knob
          // tweak mid-hover repaints the country immediately rather
          // than waiting for the next hover event.
          if (fCfg.hoverColor !== undefined || fCfg.hoverOpacity !== undefined) {
            const merged = state.config.countries?.fill;
            const c =
              merged?.hoverColor && merged.hoverColor !== '' ? merged.hoverColor : undefined;
            const o =
              merged?.hoverOpacity !== undefined && merged.hoverOpacity > 0
                ? merged.hoverOpacity
                : undefined;
            state.countryFillLayer?.setHoverOverride(c, o);
          }
          if (fCfg.activeColor !== undefined || fCfg.activeOpacity !== undefined) {
            const merged = state.config.countries?.fill;
            const c =
              merged?.activeColor && merged.activeColor !== ''
                ? merged.activeColor
                : undefined;
            const o =
              merged?.activeOpacity !== undefined && merged.activeOpacity > 0
                ? merged.activeOpacity
                : undefined;
            state.countryFillLayer?.setActiveOverride(c, o);
          }
        }
      }

      // Paper-kind decorations — every PaperConfig sub-section is
      // live-tunable via PaperKindHandle.setPaperConfig. The handle
      // routes color / numeric / mode changes to the relevant layer
      // setters; sentinel reset semantics (empty-string color = use
      // default, < 0 numeric = reset where the natural domain is ≥ 0)
      // are handled inside each setter.
      if (partial.paper !== undefined) {
        const paperHandle = state.kindHandle as
          | { readonly setPaperConfig?: (next: NonNullable<GlobeConfig['paper']>) => void }
          | null;
        paperHandle?.setPaperConfig?.(state.config.paper ?? partial.paper);
      }

      // Outline-kind decorations — focus pulse band geometry / timing
      // / color is now live via the FocusPulseDecorator.setOptions()
      // hatch. Other outline extras (hover lift, glow, continentDim,
      // crosshair) live on the kindHandle and are routed below.
      if (partial.outline !== undefined) {
        const mergedOutline = state.config.outline ?? partial.outline;
        const outlineHandle = state.kindHandle as
          | { readonly setOutlineConfig?: (next: NonNullable<GlobeConfig['outline']>) => void }
          | null;
        outlineHandle?.setOutlineConfig?.(mergedOutline);
        if (partial.outline.focusPulse) {
          const pulse = mergedOutline.focusPulse ?? partial.outline.focusPulse;
          state.kindHandle?.decorations?.focusPulse?.setOptions?.({
            ...(pulse.durationMs !== undefined
              ? { durationSeconds: pulse.durationMs / 1000 }
              : {}),
            ...(pulse.angularRadiusBase !== undefined && {
              angularRadiusBase: pulse.angularRadiusBase,
            }),
            ...(pulse.angularBand !== undefined && { angularBand: pulse.angularBand }),
            ...(pulse.scaleMin !== undefined && { scaleMin: pulse.scaleMin }),
            ...(pulse.scaleMax !== undefined && { scaleMax: pulse.scaleMax }),
            ...(pulse.peakOpacity !== undefined && { peakOpacity: pulse.peakOpacity }),
            ...(pulse.radiusFactor !== undefined && { radiusFactor: pulse.radiusFactor }),
            ...(pulse.segments !== undefined && { segments: pulse.segments }),
            ...(pulse.color !== undefined && { color: pulse.color }),
          });
        }
      }

      // Dotted-kind decorations — every dotted knob lives on the
      // kindHandle's `setDottedConfig` setter (color, size, ripple,
      // flash, drift, hover, cursor wake, latitude bands, breath,
      // constellation). All update in place via shader uniforms /
      // material props, so no rebuild is needed for any of them.
      if (partial.dotted !== undefined) {
        const dottedHandle = state.kindHandle as DottedKindHandle | null;
        dottedHandle?.setDottedConfig?.(state.config.dotted ?? partial.dotted);
      }

      // Hologram-kind decorations — every knob is uniform-driven on the
      // shell shader (or a small interval flip on the borders glitch
      // scheduler). No rebuilds.
      if (partial.hologram !== undefined) {
        const hologramHandle = state.kindHandle as HologramKindHandle | null;
        hologramHandle?.setHologramConfig?.(state.config.hologram ?? partial.hologram);
      }

      // Wireframe-kind extras — every knob in WireframeConfig is routed
      // through the kindHandle's setWireframeConfig live setter (color,
      // density, click pulse, emphasis, equator beam, glitch, active
      // ring, pole streams, data packets, compass, autonomous grid +
      // pole pulses). Only the master `enabled` flag still requires a
      // rebuild — that's tracked by the workshop's `rebuildKeys`.
      if (partial.wireframe !== undefined) {
        const wireframeHandle = state.kindHandle as
          | { readonly setWireframeConfig?: (next: NonNullable<GlobeConfig['wireframe']>) => void }
          | null;
        wireframeHandle?.setWireframeConfig?.(state.config.wireframe ?? partial.wireframe);
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
      // Mirror to the fill layer's active-state override slot.
      const fillCfg = state.config.countries?.fill;
      const activeColor =
        fillCfg?.activeColor && fillCfg.activeColor !== '' ? fillCfg.activeColor : undefined;
      const activeOpacity =
        fillCfg?.activeOpacity !== undefined && fillCfg.activeOpacity > 0
          ? fillCfg.activeOpacity
          : undefined;
      state.countryFillLayer?.setActiveState(id, activeColor, activeOpacity);
      (state.kindHandle as
        | { readonly setActiveCountry?: (nextId: string | null) => void }
        | null
      )?.setActiveCountry?.(id);
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
        camera: scene.camera,
        domElement: scene.renderer.domElement,
      });
      state.dataLayer = { config: layer, handle };
    },
    getDataLayer: () => state.dataLayer?.config ?? null,
    playDataLayerAnimation: () => {
      const play = state.dataLayer?.handle.playAnimation;
      if (!play) return false;
      return play();
    },
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

/**
 * `globe.update()` accepts a top-level Partial<GlobeConfig>, while most
 * nested config sections are themselves sparse live-update objects. Keep
 * existing nested values when a caller updates just one sub-field, but
 * still replace arrays and primitive values wholesale.
 */
const mergeRuntimeConfig = (
  prev: GlobeConfig,
  partial: Partial<GlobeConfig>,
): GlobeConfig => {
  const merged: Record<string, unknown> = { ...prev, ...partial };

  assignMergedSection(merged, 'countries', prev.countries, partial.countries);
  assignMergedSection(merged, 'countryLabels', prev.countryLabels, partial.countryLabels);
  assignMergedSection(merged, 'atmosphere', prev.atmosphere, partial.atmosphere);
  assignMergedSection(merged, 'focusPulse', prev.focusPulse, partial.focusPulse);
  assignMergedSection(merged, 'outline', prev.outline, partial.outline);
  assignMergedSection(merged, 'dotted', prev.dotted, partial.dotted);
  assignMergedSection(merged, 'wireframe', prev.wireframe, partial.wireframe);
  assignMergedSection(merged, 'paper', prev.paper, partial.paper);
  assignMergedSection(merged, 'hologram', prev.hologram, partial.hologram);
  assignMergedSection(merged, 'starfield', prev.starfield, partial.starfield);
  assignMergedSection(merged, 'autoRotate', prev.autoRotate, partial.autoRotate);
  assignMergedSection(merged, 'performance', prev.performance, partial.performance);
  assignMergedSection(merged, 'zoom', prev.zoom, partial.zoom);
  assignMergedSection(merged, 'framing', prev.framing, partial.framing);

  return merged as unknown as GlobeConfig;
};

const assignMergedSection = <K extends keyof GlobeConfig>(
  target: Record<string, unknown>,
  key: K,
  prev: GlobeConfig[K],
  next: Partial<GlobeConfig>[K],
): void => {
  const value = next === undefined ? prev : mergeConfigValue(prev, next);
  if (value === undefined) {
    delete target[String(key)];
  } else {
    target[String(key)] = value;
  }
};

const mergeConfigValue = (prev: unknown, next: unknown): unknown => {
  if (next === undefined) return prev;
  if (!isPlainConfigObject(prev) || !isPlainConfigObject(next)) return next;

  const merged: Record<string, unknown> = { ...prev };
  for (const [key, value] of Object.entries(next)) {
    merged[key] = mergeConfigValue(prev[key], value);
  }
  return merged;
};

const isPlainConfigObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Shallow content equality for palette arrays. Used to skip
 * starfield-layer rebuilds when the array's contents are unchanged
 * even though callers may pass a fresh reference each render.
 */
const palettesEqual = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/**
 * Construct a StarfieldLayer from a StarfieldConfig + theme tokens.
 * Extracted so `update({ starfield })` can rebuild the layer in-place
 * when geometry-baked fields change (density / palette / sizeVariety)
 * — the rest of the scene keeps rendering uninterrupted.
 *
 * Takes the active kind's `StarfieldLayer` constructor so the rebuild
 * stays per-kind even mid-session — when the user toggles density on a
 * paper globe, the new layer is a `PaperStarfieldLayer`, not the shared
 * default.
 */
const buildStarfieldLayer = (
  starfield: StarfieldConfig,
  tokens: ResolvedTokens,
  Ctor: KindLayerRegistry['StarfieldLayer'],
): Public<StarfieldLayer> => {
  return new Ctor({
    count: starfield.density ?? tokens['starfield.density'],
    color: tokens['starfield.color'],
    size: starfield.size ?? tokens['starfield.size'],
    ...(starfield.palette !== undefined && { palette: starfield.palette }),
    ...(starfield.sizeVariety !== undefined && { sizeVariety: starfield.sizeVariety }),
    ...(starfield.twinkle !== undefined && { twinkle: starfield.twinkle }),
  });
};
