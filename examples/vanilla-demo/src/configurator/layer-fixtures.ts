import type {
  ArcConfig,
  HtmlMarkerConfig,
  LatLng,
  MarkerConfig,
} from '@your-globe/core';

export interface ArcFixture {
  readonly id: string;
  readonly from: LatLng;
  readonly to: LatLng;
}

export const arcFixtures = {
  hubs: [
    { id: 'nyc-lon', from: [40.71, -74.0], to: [51.51, -0.13] },
    { id: 'tyo-sfo', from: [35.68, 139.69], to: [37.77, -122.42] },
    { id: 'syd-lax', from: [-33.87, 151.21], to: [33.94, -118.41] },
    { id: 'dxb-sea', from: [25.27, 55.3], to: [47.61, -122.33] },
    { id: 'jnb-fra', from: [-26.2, 28.04], to: [50.11, 8.68] },
    { id: 'gig-mad', from: [-22.91, -43.17], to: [40.42, -3.7] },
    { id: 'sin-ist', from: [1.35, 103.82], to: [41.01, 28.98] },
  ],
  pacific: [
    { id: 'sfo-tyo', from: [37.77, -122.42], to: [35.68, 139.69] },
    { id: 'lax-syd', from: [33.94, -118.41], to: [-33.87, 151.21] },
    { id: 'sea-hkg', from: [47.61, -122.33], to: [22.32, 114.17] },
    { id: 'yvr-icn', from: [49.28, -123.12], to: [37.45, 126.45] },
    { id: 'lim-akl', from: [-12.05, -77.04], to: [-36.85, 174.76] },
  ],
  med: [
    { id: 'rom-ist', from: [41.9, 12.5], to: [41.01, 28.98] },
    { id: 'bcn-tlv', from: [41.39, 2.16], to: [32.07, 34.78] },
    { id: 'mar-ath', from: [43.3, 5.37], to: [37.98, 23.72] },
    { id: 'mad-cai', from: [40.42, -3.7], to: [30.04, 31.24] },
    { id: 'lis-tun', from: [38.72, -9.14], to: [36.81, 10.18] },
    { id: 'mil-bey', from: [45.46, 9.19], to: [33.89, 35.5] },
  ],
  polar: [
    { id: 'jfk-hkg', from: [40.71, -74.0], to: [22.32, 114.17] },
    { id: 'ord-pek', from: [41.88, -87.63], to: [39.91, 116.4] },
    { id: 'osl-anc', from: [59.91, 10.75], to: [61.22, -149.9] },
  ],
  webby: [
    { id: 'lon-nyc', from: [51.51, -0.13], to: [40.71, -74.0] },
    { id: 'lon-cdg', from: [51.51, -0.13], to: [49.01, 2.55] },
    { id: 'lon-fra', from: [51.51, -0.13], to: [50.11, 8.68] },
    { id: 'lon-rom', from: [51.51, -0.13], to: [41.9, 12.5] },
    { id: 'lon-mad', from: [51.51, -0.13], to: [40.42, -3.7] },
    { id: 'lon-ist', from: [51.51, -0.13], to: [41.01, 28.98] },
    { id: 'lon-dxb', from: [51.51, -0.13], to: [25.27, 55.3] },
    { id: 'lon-sin', from: [51.51, -0.13], to: [1.35, 103.82] },
    { id: 'lon-tyo', from: [51.51, -0.13], to: [35.68, 139.69] },
    { id: 'lon-syd', from: [51.51, -0.13], to: [-33.87, 151.21] },
    { id: 'lon-jnb', from: [51.51, -0.13], to: [-26.2, 28.04] },
    { id: 'lon-gru', from: [51.51, -0.13], to: [-23.55, -46.63] },
    { id: 'lon-yyz', from: [51.51, -0.13], to: [43.65, -79.38] },
    { id: 'lon-mex', from: [51.51, -0.13], to: [19.43, -99.13] },
    { id: 'lon-bom', from: [51.51, -0.13], to: [19.07, 72.88] },
  ],
} as const satisfies Readonly<Record<string, ReadonlyArray<ArcFixture>>>;

export type ArcDatasetId = keyof typeof arcFixtures;
export type ArcLineStyle = 'solid' | 'dashed';
export type ArcHeadEasing = 'linear' | 'easeInOut' | 'pulse';

export interface ArcWorkshopSettings {
  readonly arcDataset: ArcDatasetId;
  readonly arcWidth: number;
  readonly arcHeight: number;
  readonly arcMinHeight: number;
  readonly arcMaxHeight: number;
  readonly arcColor: string;
  readonly arcPerArcGradient: boolean;
  readonly arcStyle: ArcLineStyle;
  readonly arcDashSize: number;
  readonly arcDashGap: number;
  readonly arcAnimated: boolean;
  readonly arcAnimationDuration: number;
  readonly arcHeadEasing: ArcHeadEasing;
}

export const defaultArcSettings: ArcWorkshopSettings = {
  arcDataset: 'hubs',
  arcWidth: 2,
  arcHeight: 0,
  arcMinHeight: 0.15,
  arcMaxHeight: 0.6,
  arcColor: '#22d3ee',
  arcPerArcGradient: true,
  arcStyle: 'solid',
  arcDashSize: 0.04,
  arcDashGap: 0.02,
  arcAnimated: true,
  arcAnimationDuration: 2,
  arcHeadEasing: 'pulse',
};

export const arcDatasetOptions = [
  { value: 'hubs', label: 'World hubs' },
  { value: 'pacific', label: 'Trans-pacific' },
  { value: 'med', label: 'Mediterranean' },
  { value: 'polar', label: 'Polar' },
  { value: 'webby', label: 'Web from London' },
] as const;

export const arcStyleOptions = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
] as const;

export const arcHeadEasingOptions = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeInOut', label: 'Ease' },
  { value: 'pulse', label: 'Pulse' },
] as const;

const ARC_ACCENTS: ReadonlyArray<string> = [
  '#22d3ee',
  '#67e8f9',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
];

export const buildArcs = (settings: ArcWorkshopSettings): ReadonlyArray<ArcConfig> => {
  const fixtures = arcFixtures[settings.arcDataset] ?? arcFixtures.hubs;
  return fixtures.map((arc, i) => ({
    id: arc.id,
    from: arc.from,
    to: arc.to,
    width: settings.arcWidth,
    height: settings.arcHeight === 0 ? 'auto' : settings.arcHeight,
    minHeight: settings.arcMinHeight,
    maxHeight: settings.arcMaxHeight,
    color: settings.arcPerArcGradient
      ? ARC_ACCENTS[i % ARC_ACCENTS.length]!
      : settings.arcColor,
    style: settings.arcStyle,
    ...(settings.arcStyle === 'dashed'
      ? { dashSize: settings.arcDashSize, dashGap: settings.arcDashGap }
      : {}),
    ...(settings.arcAnimated
      ? {
          animated: true,
          animationDuration: settings.arcAnimationDuration,
          headEasing: settings.arcHeadEasing,
        }
      : {}),
  }));
};

export interface MarkerFixture {
  readonly id: string;
  readonly position: LatLng;
  readonly label: string;
}

export const markerFixtures = {
  capitals: [
    { id: 'lon', position: [51.51, -0.13], label: 'London' },
    { id: 'par', position: [48.86, 2.35], label: 'Paris' },
    { id: 'ber', position: [52.52, 13.4], label: 'Berlin' },
    { id: 'rom', position: [41.9, 12.5], label: 'Rome' },
    { id: 'mad', position: [40.42, -3.7], label: 'Madrid' },
    { id: 'ist', position: [41.01, 28.98], label: 'Istanbul' },
    { id: 'cai', position: [30.04, 31.24], label: 'Cairo' },
    { id: 'nyc', position: [40.71, -74.0], label: 'New York' },
    { id: 'rio', position: [-22.91, -43.17], label: 'Rio' },
    { id: 'tyo', position: [35.68, 139.69], label: 'Tokyo' },
    { id: 'syd', position: [-33.87, 151.21], label: 'Sydney' },
    { id: 'cpt', position: [-33.92, 18.42], label: 'Cape Town' },
  ],
  megacities: [
    { id: 'tyo', position: [35.68, 139.69], label: 'Tokyo' },
    { id: 'del', position: [28.7, 77.1], label: 'Delhi' },
    { id: 'sha', position: [31.23, 121.47], label: 'Shanghai' },
    { id: 'spa', position: [-23.55, -46.63], label: 'Sao Paulo' },
    { id: 'mex', position: [19.43, -99.13], label: 'Mexico City' },
    { id: 'cai', position: [30.04, 31.24], label: 'Cairo' },
    { id: 'mum', position: [19.07, 72.88], label: 'Mumbai' },
    { id: 'pek', position: [39.91, 116.4], label: 'Beijing' },
    { id: 'dhk', position: [23.81, 90.41], label: 'Dhaka' },
    { id: 'osa', position: [34.69, 135.5], label: 'Osaka' },
    { id: 'nyc', position: [40.71, -74.0], label: 'New York' },
    { id: 'kar', position: [24.86, 67.0], label: 'Karachi' },
  ],
  pacific: [
    { id: 'tyo', position: [35.68, 139.69], label: 'Tokyo' },
    { id: 'sfo', position: [37.77, -122.42], label: 'San Francisco' },
    { id: 'syd', position: [-33.87, 151.21], label: 'Sydney' },
    { id: 'akl', position: [-36.85, 174.76], label: 'Auckland' },
    { id: 'hnl', position: [21.31, -157.86], label: 'Honolulu' },
    { id: 'gua', position: [13.45, 144.79], label: 'Guam' },
    { id: 'rar', position: [-21.21, -159.78], label: 'Rarotonga' },
    { id: 'lim', position: [-12.05, -77.04], label: 'Lima' },
  ],
  ringoffire: [
    { id: 'fuji', position: [35.36, 138.73], label: 'Fuji' },
    { id: 'aso', position: [32.88, 131.1], label: 'Aso' },
    { id: 'pinatubo', position: [15.13, 120.35], label: 'Pinatubo' },
    { id: 'krakatoa', position: [-6.1, 105.42], label: 'Krakatoa' },
    { id: 'merapi', position: [-7.54, 110.45], label: 'Merapi' },
    { id: 'ruapehu', position: [-39.28, 175.57], label: 'Ruapehu' },
    { id: 'erebus', position: [-77.53, 167.17], label: 'Erebus' },
    { id: 'cotopaxi', position: [-0.68, -78.44], label: 'Cotopaxi' },
    { id: 'osorno', position: [-41.1, -72.49], label: 'Osorno' },
    { id: 'st-helens', position: [46.2, -122.18], label: 'St. Helens' },
    { id: 'rainier', position: [46.85, -121.76], label: 'Rainier' },
    { id: 'kilauea', position: [19.42, -155.29], label: 'Kilauea' },
  ],
} as const satisfies Readonly<Record<string, ReadonlyArray<MarkerFixture>>>;

export type MarkerDatasetId = keyof typeof markerFixtures;
export type MarkerMode = 'dots' | 'cards';
export type MarkerCardStyle = 'minimal' | 'pill' | 'badge' | 'callout';
export type MarkerCardAnchor = 'top' | 'center' | 'bottom';

export interface MarkerWorkshopSettings {
  readonly markerDataset: MarkerDatasetId;
  readonly markerMode: MarkerMode;
  readonly markerSize: number;
  readonly markerHoverScale: number;
  readonly markerColor: string;
  readonly markerPerMarkerColor: boolean;
  readonly markerPulse: boolean;
  readonly markerPulseSpeed: number;
  readonly markerPulseAmplitude: number;
  readonly markerPulsePhaseOffset: boolean;
  readonly markerCardStyle: MarkerCardStyle;
  readonly markerCardAnchor: MarkerCardAnchor;
  readonly markerCardOffsetY: number;
  readonly markerCardAccent: string;
  readonly markerCardHideOccluded: boolean;
}

export const defaultMarkerSettings: MarkerWorkshopSettings = {
  markerDataset: 'capitals',
  markerMode: 'dots',
  markerSize: 1.5,
  markerHoverScale: 1.65,
  markerColor: '#67e8f9',
  markerPerMarkerColor: false,
  markerPulse: true,
  markerPulseSpeed: 1.5,
  markerPulseAmplitude: 0.4,
  markerPulsePhaseOffset: true,
  markerCardStyle: 'pill',
  markerCardAnchor: 'bottom',
  markerCardOffsetY: -8,
  markerCardAccent: '#67e8f9',
  markerCardHideOccluded: true,
};

export const markerDatasetOptions = [
  { value: 'capitals', label: 'Capitals' },
  { value: 'megacities', label: 'Mega-cities' },
  { value: 'pacific', label: 'Pacific rim' },
  { value: 'ringoffire', label: 'Ring of fire' },
] as const;

export const markerRenderModeOptions = [
  { value: 'dots', label: '3D dots' },
  { value: 'cards', label: 'HTML cards' },
] as const;

export const markerCardStyleOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'pill', label: 'Pill' },
  { value: 'badge', label: 'Badge' },
  { value: 'callout', label: 'Callout' },
] as const;

export const markerCardAnchorOptions = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
] as const;

const MARKER_ACCENTS: ReadonlyArray<string> = [
  '#67e8f9',
  '#fbbf24',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fde68a',
];

export const buildMarkerDots = (
  settings: MarkerWorkshopSettings,
): ReadonlyArray<MarkerConfig> => {
  const fixtures = markerFixtures[settings.markerDataset] ?? markerFixtures.capitals;
  return fixtures.map((m, i) => {
    const phaseShift = settings.markerPulsePhaseOffset ? i * 0.18 : 0;
    return {
      id: m.id,
      position: m.position,
      color: settings.markerPerMarkerColor
        ? MARKER_ACCENTS[i % MARKER_ACCENTS.length]!
        : settings.markerColor,
      size: settings.markerSize,
      hoverScale: settings.markerHoverScale,
      ...(settings.markerPulse
        ? {
            pulse: {
              speed:
                phaseShift !== 0
                  ? settings.markerPulseSpeed * (1 + phaseShift * 0.04)
                  : settings.markerPulseSpeed,
              amplitude: settings.markerPulseAmplitude,
            },
          }
        : {}),
    };
  });
};

export const buildMarkerCards = (
  settings: MarkerWorkshopSettings,
): ReadonlyArray<HtmlMarkerConfig> => {
  const fixtures = markerFixtures[settings.markerDataset] ?? markerFixtures.capitals;
  return fixtures.map((m) => ({
    id: m.id,
    position: m.position,
    content: () => makeCardElement(m.label, settings.markerCardStyle, settings.markerCardAccent),
    anchor: settings.markerCardAnchor,
    offset: [0, settings.markerCardOffsetY] as const,
    hideWhenOccluded: settings.markerCardHideOccluded,
  }));
};

const makeCardElement = (
  label: string,
  style: MarkerCardStyle,
  accent: string,
): HTMLElement => {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.userSelect = 'none';
  el.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
  el.style.whiteSpace = 'nowrap';
  el.style.transformOrigin = 'center bottom';
  if (style === 'minimal') {
    el.textContent = label;
    el.style.color = '#ffffff';
    el.style.fontSize = '11px';
    el.style.fontWeight = '500';
    el.style.letterSpacing = '0.03em';
    el.style.textShadow = '0 1px 4px rgba(0, 0, 0, 0.7)';
  } else if (style === 'pill') {
    el.textContent = label;
    el.style.color = '#0a0d18';
    el.style.background = accent;
    el.style.fontSize = '10.5px';
    el.style.fontWeight = '600';
    el.style.letterSpacing = '0.04em';
    el.style.padding = '3px 8px';
    el.style.borderRadius = '999px';
    el.style.boxShadow = `0 0 12px ${accent}88, 0 1px 3px rgba(0,0,0,0.4)`;
  } else if (style === 'badge') {
    el.style.background = 'rgba(10, 13, 24, 0.9)';
    el.style.border = `1px solid ${accent}`;
    el.style.padding = '4px 10px';
    el.style.borderRadius = '6px';
    el.style.boxShadow = `0 0 14px ${accent}55`;
    const dot = document.createElement('span');
    dot.style.display = 'inline-block';
    dot.style.width = '6px';
    dot.style.height = '6px';
    dot.style.borderRadius = '50%';
    dot.style.background = accent;
    dot.style.marginRight = '6px';
    dot.style.verticalAlign = 'middle';
    dot.style.boxShadow = `0 0 6px ${accent}`;
    const text = document.createElement('span');
    text.textContent = label;
    text.style.color = '#ffffff';
    text.style.fontSize = '10.5px';
    text.style.fontWeight = '500';
    text.style.letterSpacing = '0.04em';
    text.style.verticalAlign = 'middle';
    el.appendChild(dot);
    el.appendChild(text);
  } else {
    el.style.background = 'rgba(10, 13, 24, 0.92)';
    el.style.border = `1px solid ${accent}66`;
    el.style.padding = '6px 10px 7px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = `0 8px 24px -6px rgba(0,0,0,0.6), 0 0 16px ${accent}33`;
    el.style.position = 'relative';
    const tag = document.createElement('div');
    tag.textContent = 'CITY';
    tag.style.color = accent;
    tag.style.fontSize = '8.5px';
    tag.style.fontWeight = '600';
    tag.style.letterSpacing = '0.18em';
    tag.style.marginBottom = '2px';
    const text = document.createElement('div');
    text.textContent = label;
    text.style.color = '#ffffff';
    text.style.fontSize = '12px';
    text.style.fontWeight = '600';
    text.style.letterSpacing = '0.02em';
    el.appendChild(tag);
    el.appendChild(text);
    const tail = document.createElement('span');
    tail.style.cssText = [
      'position:absolute',
      'left:50%',
      'bottom:-4px',
      'transform:translateX(-50%) rotate(45deg)',
      'width:6px',
      'height:6px',
      'background:rgba(10,13,24,0.92)',
      `border-right:1px solid ${accent}66`,
      `border-bottom:1px solid ${accent}66`,
    ].join(';');
    el.appendChild(tail);
  }
  return el;
};
