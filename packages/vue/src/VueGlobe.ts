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
  type AtmosphereConfig,
  type AutoRotateConfig,
  type CountriesConfig,
  type CountryEvent,
  type GlobeConfig,
  type GlobeInstance,
  type GlobeMode,
  type LatLng,
  type MarkerConfig,
  type MarkerEvent,
  type PerformanceConfig,
} from '@your-globe/core';

export const VueGlobe = defineComponent({
  name: 'VueGlobe',
  props: {
    mode: { type: String as PropType<GlobeMode>, default: undefined },
    backgroundColor: { type: String, default: undefined },
    globeColor: { type: String, default: undefined },
    textureUrl: { type: String, default: undefined },
    countries: { type: Object as PropType<CountriesConfig>, default: undefined },
    markers: { type: Array as PropType<ReadonlyArray<MarkerConfig>>, default: () => [] },
    atmosphere: { type: Object as PropType<AtmosphereConfig>, default: undefined },
    autoRotate: { type: Object as PropType<AutoRotateConfig>, default: undefined },
    performance: { type: Object as PropType<PerformanceConfig>, default: undefined },
    initialPosition: { type: Array as unknown as PropType<LatLng>, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
  },
  emits: {
    countryClick: (event: CountryEvent) => Boolean(event),
    countryHover: (event: CountryEvent | null) => event === null || Boolean(event),
    markerClick: (event: MarkerEvent) => Boolean(event),
    markerHover: (event: MarkerEvent | null) => event === null || Boolean(event),
    ready: () => true,
    error: (error: Error) => Boolean(error),
  },
  setup(props, { emit, expose }) {
    const hostRef = ref<HTMLDivElement | null>(null);
    let instance: GlobeInstance | null = null;

    const buildConfig = (): Omit<GlobeConfig, 'container'> => ({
      mode: props.mode,
      backgroundColor: props.backgroundColor,
      globeColor: props.globeColor,
      textureUrl: props.textureUrl,
      countries: props.countries,
      markers: props.markers,
      atmosphere: props.atmosphere,
      autoRotate: props.autoRotate,
      performance: props.performance,
      initialPosition: props.initialPosition,
      minZoom: props.minZoom,
      maxZoom: props.maxZoom,
    });

    onMounted(() => {
      if (!hostRef.value) return;
      const globe = createGlobe({ container: hostRef.value, ...buildConfig() });
      globe.on('countryClick', (e) => emit('countryClick', e));
      globe.on('countryHover', (e) => emit('countryHover', e));
      globe.on('markerClick', (e) => emit('markerClick', e));
      globe.on('markerHover', (e) => emit('markerHover', e));
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
