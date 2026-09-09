import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ForwardedRef,
} from 'react';
import {
  createGlobe,
  type CountryEvent,
  type GlobeConfig,
  type GlobeInstance,
  type LatLng,
  type MarkerConfig,
  type MarkerEvent,
  type StoryCompleteEvent,
  type StorySceneEvent,
  type SurfaceClickEvent,
} from '@globiojs/core';

/**
 * `<Globe />` — every `GlobeConfig` key is a prop and every globe event an
 * `on*` callback. The ref handle exposes the common imperative calls plus
 * `getInstance()` for everything else on `GlobeInstance`.
 */
export type GlobeProps = Omit<GlobeConfig, 'container'> & {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly onCountryClick?: (event: CountryEvent) => void;
  readonly onCountryHover?: (event: CountryEvent | null) => void;
  readonly onMarkerClick?: (event: MarkerEvent) => void;
  readonly onMarkerHover?: (event: MarkerEvent | null) => void;
  readonly onSurfaceClick?: (event: SurfaceClickEvent) => void;
  readonly onSceneEnter?: (event: StorySceneEvent) => void;
  readonly onSceneExit?: (event: StorySceneEvent) => void;
  readonly onStoryComplete?: (event: StoryCompleteEvent) => void;
  readonly onReady?: () => void;
  readonly onError?: (error: Error) => void;
};

export interface GlobeHandle {
  /** The underlying engine instance, or null before mount / after unmount. */
  readonly getInstance: () => GlobeInstance | null;
  readonly setRotation: (position: LatLng, animate?: boolean) => void;
  readonly setMarkers: (markers: ReadonlyArray<MarkerConfig>) => void;
  readonly addMarker: (marker: MarkerConfig) => void;
  readonly removeMarker: (id: string) => void;
  readonly resize: () => void;
  readonly getCanvas: () => HTMLCanvasElement | null;
}

const DEFAULT_STYLE: CSSProperties = { width: '100%', height: '100%' };

const GlobeComponent = (props: GlobeProps, ref: ForwardedRef<GlobeHandle>): JSX.Element => {
  const {
    className,
    style,
    onCountryClick,
    onCountryHover,
    onMarkerClick,
    onMarkerHover,
    onSurfaceClick,
    onSceneEnter,
    onSceneExit,
    onStoryComplete,
    onReady,
    onError,
    ...config
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);
  const handlers = {
    onCountryClick,
    onCountryHover,
    onMarkerClick,
    onMarkerHover,
    onSurfaceClick,
    onSceneEnter,
    onSceneExit,
    onStoryComplete,
    onReady,
    onError,
  };
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const instance = createGlobe({ container, ...config });
    instanceRef.current = instance;

    const offCountryClick = instance.on('countryClick', (e) => handlersRef.current.onCountryClick?.(e));
    const offCountryHover = instance.on('countryHover', (e) => handlersRef.current.onCountryHover?.(e));
    const offMarkerClick = instance.on('markerClick', (e) => handlersRef.current.onMarkerClick?.(e));
    const offMarkerHover = instance.on('markerHover', (e) => handlersRef.current.onMarkerHover?.(e));
    const offSurfaceClick = instance.on('surfaceClick', (e) => handlersRef.current.onSurfaceClick?.(e));
    const offSceneEnter = instance.on('sceneEnter', (e) => handlersRef.current.onSceneEnter?.(e));
    const offSceneExit = instance.on('sceneExit', (e) => handlersRef.current.onSceneExit?.(e));
    const offStoryComplete = instance.on('storyComplete', (e) => handlersRef.current.onStoryComplete?.(e));
    const offReady = instance.on('ready', () => handlersRef.current.onReady?.());
    const offError = instance.on('error', (err) => handlersRef.current.onError?.(err));

    instance.mount();

    return () => {
      offCountryClick();
      offCountryHover();
      offMarkerClick();
      offMarkerHover();
      offSurfaceClick();
      offSceneEnter();
      offSceneExit();
      offStoryComplete();
      offReady();
      offError();
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.update(config);
  }, [config]);

  useImperativeHandle(
    ref,
    () => ({
      getInstance: () => instanceRef.current,
      setRotation: (position, animate) => instanceRef.current?.setRotation(position, animate),
      setMarkers: (markers) => instanceRef.current?.setMarkers(markers),
      addMarker: (marker) => instanceRef.current?.addMarker(marker),
      removeMarker: (id) => instanceRef.current?.removeMarker(id),
      resize: () => instanceRef.current?.resize(),
      getCanvas: () => instanceRef.current?.getCanvas() ?? null,
    }),
    []
  );

  return <div ref={containerRef} className={className} style={{ ...DEFAULT_STYLE, ...style }} />;
};

export const Globe = forwardRef<GlobeHandle, GlobeProps>(GlobeComponent);
Globe.displayName = 'Globe';
