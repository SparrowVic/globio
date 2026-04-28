import type { ThemeInput } from './theme/types';

export type LatLng = readonly [latitude: number, longitude: number];

export type ResolutionLevel = 'low' | 'medium' | 'high';

export type CountryStyle = 'borders' | 'dotted' | 'filled';

export type GlobeMode = 'sphere' | 'flat';

export interface CountryData {
  readonly id: string;
  readonly name: string;
  readonly iso2?: string;
  readonly iso3?: string;
}

export interface CountryEvent {
  readonly country: CountryData;
  readonly point: LatLng;
}

export interface MarkerConfig {
  readonly id: string;
  readonly position: LatLng;
  readonly color?: string;
  readonly size?: number;
  readonly label?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface MarkerEvent {
  readonly marker: MarkerConfig;
}

export interface CountriesConfig {
  readonly resolution?: ResolutionLevel;
  readonly style?: CountryStyle;
  readonly hoverEnabled?: boolean;
}

export interface AtmosphereConfig {
  readonly enabled?: boolean;
}

export interface AutoRotateConfig {
  readonly enabled?: boolean;
  readonly speed?: number;
}

/**
 * Zoom interaction mode.
 *
 * - `classic`: scroll changes camera distance only; angles unchanged.
 * - `repel`: each scroll step rotates the camera so the world point under
 *   the cursor stays under the cursor — the cursor "anchors" to that point.
 * - `attract`: each scroll step rotates the camera to pull the world point
 *   under the cursor toward the center of the screen.
 */
export type ZoomMode = 'classic' | 'repel' | 'attract';

export interface ZoomConfig {
  readonly mode?: ZoomMode;
  /** 0..1 — intensity of repel/attract correction. Ignored for `classic`. */
  readonly strength?: number;
}

export interface PerformanceConfig {
  readonly antialias?: boolean;
  readonly pixelRatio?: number | 'auto';
  readonly maxFps?: number;
  readonly adaptiveQuality?: boolean;
}

export interface GlobeConfig {
  readonly container: HTMLElement;
  readonly mode?: GlobeMode;
  readonly theme?: ThemeInput;
  readonly countries?: CountriesConfig;
  readonly markers?: ReadonlyArray<MarkerConfig>;
  readonly atmosphere?: AtmosphereConfig;
  readonly autoRotate?: AutoRotateConfig;
  readonly performance?: PerformanceConfig;
  readonly initialPosition?: LatLng;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly zoom?: ZoomConfig;
}

export interface GlobeEvents {
  readonly countryClick: (event: CountryEvent) => void;
  readonly countryHover: (event: CountryEvent | null) => void;
  readonly markerClick: (event: MarkerEvent) => void;
  readonly markerHover: (event: MarkerEvent | null) => void;
  readonly ready: () => void;
  readonly error: (error: Error) => void;
}

export type GlobeEventName = keyof GlobeEvents;

export type GlobeEventUnsubscribe = () => void;

export interface GlobeInstance {
  readonly mount: () => void;
  readonly destroy: () => void;
  readonly update: (config: Partial<GlobeConfig>) => void;
  readonly on: <K extends GlobeEventName>(
    event: K,
    handler: GlobeEvents[K]
  ) => GlobeEventUnsubscribe;
  readonly off: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => void;
  readonly setRotation: (position: LatLng, animate?: boolean) => void;
  readonly setMarkers: (markers: ReadonlyArray<MarkerConfig>) => void;
  readonly addMarker: (marker: MarkerConfig) => void;
  readonly removeMarker: (id: string) => void;
  readonly resize: () => void;
  readonly getCanvas: () => HTMLCanvasElement;
}
