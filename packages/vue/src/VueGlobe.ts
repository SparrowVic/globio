import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from 'vue';
import {
  createGlobe,
  pickGlobeConfig,
  type ArcConfig,
  type AtmosphereConfig,
  type AutoRotateConfig,
  type CinematicConfig,
  type CountriesConfig,
  type CountryDataMap,
  type CountryEvent,
  type CountryLabelsConfig,
  type DottedConfig,
  type FramingConfig,
  type GlobeConfig,
  type GlobeInstance,
  type GlobeKind,
  type GlobeMode,
  type HologramConfig,
  type HtmlMarkerConfig,
  type LatLng,
  type MarkerConfig,
  type MarkerEvent,
  type OutlineConfig,
  type PaperConfig,
  type PerformanceConfig,
  type PostProcessingConfig,
  type StarfieldConfig,
  type StoryCompleteEvent,
  type StorySceneEvent,
  type SurfaceClickEvent,
  type ThemeInput,
  type WireframeConfig,
  type ZoomConfig,
} from '@your-globe/core';

/**
 * `<VueGlobe />` — every `GlobeConfig` key is a prop (kebab-case in
 * templates), every globe event is an emit, and `getInstance()` on the
 * component ref hands out the underlying `GlobeInstance` for anything
 * imperative (camera moves, legends, stories).
 */
export const VueGlobe = defineComponent({
  name: 'VueGlobe',
  props: {
    mode: { type: String as PropType<GlobeMode>, default: undefined },
    kind: { type: String as PropType<GlobeKind>, default: undefined },
    theme: { type: [String, Object] as PropType<ThemeInput>, default: undefined },
    countries: { type: Object as PropType<CountriesConfig>, default: undefined },
    countryLabels: { type: Object as PropType<CountryLabelsConfig>, default: undefined },
    countryData: { type: Object as PropType<CountryDataMap>, default: undefined },
    markers: { type: Array as PropType<ReadonlyArray<MarkerConfig>>, default: undefined },
    htmlMarkers: { type: Array as PropType<ReadonlyArray<HtmlMarkerConfig>>, default: undefined },
    arcs: { type: Array as PropType<ReadonlyArray<ArcConfig>>, default: undefined },
    atmosphere: { type: Object as PropType<AtmosphereConfig>, default: undefined },
    focusPulse: { type: Object as PropType<GlobeConfig['focusPulse']>, default: undefined },
    outline: { type: Object as PropType<OutlineConfig>, default: undefined },
    cinematic: { type: Object as PropType<CinematicConfig>, default: undefined },
    dotted: { type: Object as PropType<DottedConfig>, default: undefined },
    wireframe: { type: Object as PropType<WireframeConfig>, default: undefined },
    paper: { type: Object as PropType<PaperConfig>, default: undefined },
    hologram: { type: Object as PropType<HologramConfig>, default: undefined },
    starfield: { type: Object as PropType<StarfieldConfig>, default: undefined },
    postprocessing: { type: Object as PropType<PostProcessingConfig>, default: undefined },
    axisTilt: { type: Number, default: undefined },
    autoRotate: { type: Object as PropType<AutoRotateConfig>, default: undefined },
    performance: { type: Object as PropType<PerformanceConfig>, default: undefined },
    initialPosition: { type: Array as unknown as PropType<LatLng>, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zoom: { type: Object as PropType<ZoomConfig>, default: undefined },
    transparent: { type: Boolean, default: undefined },
    framing: { type: Object as PropType<FramingConfig>, default: undefined },
  },
  emits: {
    countryClick: (event: CountryEvent) => Boolean(event),
    countryHover: (event: CountryEvent | null) => event === null || Boolean(event),
    markerClick: (event: MarkerEvent) => Boolean(event),
    markerHover: (event: MarkerEvent | null) => event === null || Boolean(event),
    surfaceClick: (event: SurfaceClickEvent) => Boolean(event),
    sceneEnter: (event: StorySceneEvent) => Boolean(event),
    sceneExit: (event: StorySceneEvent) => Boolean(event),
    storyComplete: (event: StoryCompleteEvent) => Boolean(event),
    ready: () => true,
    error: (error: Error) => Boolean(error),
  },
  setup(props, { emit, expose }) {
    const hostRef = ref<HTMLDivElement | null>(null);
    let instance: GlobeInstance | null = null;

    const buildConfig = () => pickGlobeConfig(props as unknown as Record<string, unknown>);

    onMounted(() => {
      if (!hostRef.value) return;
      const globe = createGlobe({ container: hostRef.value, ...buildConfig() });
      globe.on('countryClick', (e) => emit('countryClick', e));
      globe.on('countryHover', (e) => emit('countryHover', e));
      globe.on('markerClick', (e) => emit('markerClick', e));
      globe.on('markerHover', (e) => emit('markerHover', e));
      globe.on('surfaceClick', (e) => emit('surfaceClick', e));
      globe.on('sceneEnter', (e) => emit('sceneEnter', e));
      globe.on('sceneExit', (e) => emit('sceneExit', e));
      globe.on('storyComplete', (e) => emit('storyComplete', e));
      globe.on('ready', () => emit('ready'));
      globe.on('error', (err) => emit('error', err));
      globe.mount();
      instance = globe;
    });

    watch(
      () => buildConfig(),
      (config) => instance?.update(config),
      { deep: true }
    );

    onBeforeUnmount(() => {
      instance?.destroy();
      instance = null;
    });

    expose({
      /** The underlying engine instance, or null before mount / after unmount. */
      getInstance: (): GlobeInstance | null => instance,
      setRotation: (position: LatLng, animate?: boolean) => instance?.setRotation(position, animate),
      addMarker: (marker: MarkerConfig) => instance?.addMarker(marker),
      removeMarker: (id: string) => instance?.removeMarker(id),
      resize: () => instance?.resize(),
      getCanvas: () => instance?.getCanvas() ?? null,
    });

    return () =>
      h('div', {
        ref: hostRef,
        style: { width: '100%', height: '100%' },
      });
  },
});
