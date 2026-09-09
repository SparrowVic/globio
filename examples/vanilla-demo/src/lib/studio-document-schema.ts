import type { ConfiguratorState } from '@/configurator/types';

type Section = 'globe' | 'heatmap' | 'hexbin' | 'charts';
type StringUnionKeys<T> = {
  [K in keyof T]: T[K] extends string ? (string extends T[K] ? never : K) : never;
}[keyof T];
type EnumPath = {
  [S in Section]: `${S}.${StringUnionKeys<ConfiguratorState[S]> & string}`;
}[Section] | 'activeLayer';

const animationStyles = ['rise', 'pop', 'fade', 'pulse'] as const;
const animationOrders = ['sequential', 'radial', 'value', 'reverse-value', 'random'] as const;
const animationEasings = [
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out',
  ...['quad', 'cubic', 'quart', 'quint', 'sine', 'expo', 'circ', 'back', 'elastic', 'bounce']
    .flatMap((curve) => [`ease-in-${curve}`, `ease-out-${curve}`, `ease-in-out-${curve}`]),
];
const curves = ['linear', 'smoothstep', 'cubic', 'sqrt'] as const;

/** Keep exhaustive: a new string-union setting must define its import choices. */
export const STUDIO_ENUMS = {
  activeLayer: ['heatmap', 'hexbin', 'charts', 'none'],
  'globe.kind': ['cinematic', 'outline', 'dotted', 'wireframe', 'paper', 'hologram'],
  'globe.theme': [
    'cinematic-night', 'cinematic-day', 'cinematic-dawn', 'cinematic-noir',
    'outline-dark', 'outline-light', 'outline-sunset', 'outline-cyber', 'outline-monochrome',
    'dotted-dark', 'wireframe-tron', 'paper-default', 'hologram-cyan',
  ],
  'globe.countryResolution': ['low', 'medium', 'high'],
  'globe.countryFillMode': ['none', 'always', 'palette', 'data'],
  'globe.dottedDotsMode': ['theme', 'palette', 'data'],
  'globe.atmosphereSide': ['back', 'front', 'double'],
  'globe.atmosphereBlending': ['additive', 'normal'],
  'globe.focusPulseOrigin': ['centroid', 'click'],
  'globe.arcDataset': ['hubs', 'pacific', 'med', 'polar', 'webby'],
  'globe.arcStyle': ['solid', 'dashed'],
  'globe.arcHeadEasing': ['linear', 'easeInOut', 'pulse'],
  'globe.markerDataset': ['capitals', 'megacities', 'pacific', 'ringoffire'],
  'globe.markerMode': ['dots', 'cards'],
  'globe.markerCardStyle': ['minimal', 'pill', 'badge', 'callout'],
  'globe.markerCardAnchor': ['top', 'center', 'bottom'],
  'globe.dottedDriftAxis': ['ns', 'ew', 'both'],
  'globe.hologramScanlineDirection': ['horizontal', 'vertical', 'diagonal'],
  'globe.hologramChromaticAberrationMode': ['rim', 'global'],
  'globe.hologramDataScanAxis': ['horizontal', 'vertical', 'radial'],
  'globe.cinematicLightingMode': ['hero', 'natural', 'eclipse'],
  'globe.cinematicQuality': ['auto', 'ultra', 'high', 'balanced'],
  'globe.cinematicSunMode': ['fixed', 'realtime', 'orbit'],
  'globe.cinematicTextures': ['none', 'earth-2k'],
  'globe.paperFillMode': ['single', 'pastel'],
  'globe.paperWatermarkPosition': ['center', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
  'globe.wireframeDataPacketsAxis': ['latitude', 'longitude', 'both'],
  'globe.wireframeGridPulseMode': ['fixed', 'random'],
  'globe.wireframePolePulseWhich': ['north', 'south', 'both'],
  'globe.zoomMode': ['classic', 'repel', 'attract'],
  'globe.pixelRatio': ['auto', '1', '1.5', '2'],
  'heatmap.dataset': [
    'countries', 'megacities', 'worldcities', 'earthquakes', 'random',
    'quakes-week', 'quakes-month', 'quakes-year',
  ],
  'heatmap.kernel': ['gaussian', 'epanechnikov', 'quartic', 'dome', 'uniform'],
  'heatmap.normalize': ['peak', 'absolute', 'log'],
  'heatmap.curve': curves,
  'heatmap.displacementCurve': curves,
  'heatmap.palette': [
    'blues', 'reds', 'greens', 'oranges', 'purples', 'viridis', 'magma',
    'plasma', 'inferno', 'RdBu', 'BrBG', 'PiYG', 'aurora',
  ],
  'heatmap.blendMode': ['normal', 'additive'],
  'heatmap.surfaceMode': ['country', 'topographic', 'smooth', 'peaks'],
  'heatmap.detailMode': ['topo', 'grid', 'clean'],
  'heatmap.domePreScale': ['linear', 'log', 'sqrt'],
  'heatmap.animationStyle': animationStyles,
  'heatmap.animationOrder': animationOrders,
  'heatmap.animationEasing': animationEasings,
  'hexbin.dataset': ['random-2k', 'random-10k', 'cluster', 'bands'],
  'hexbin.aggregate': ['sum', 'count', 'mean', 'min', 'max', 'median', 'p90'],
  'hexbin.animationStyle': animationStyles,
  'hexbin.animationOrder': animationOrders,
  'hexbin.animationEasing': animationEasings,
  'charts.dataset': ['energy', 'population', 'quarterly', 'kpi', 'world-gdp', 'world-co2'],
  'charts.chartType': [
    'bars-grouped', 'bars-stacked', 'pie', 'donut', 'radial', 'gauge', 'sunburst', 'extruded',
  ],
  'charts.labels': ['off', 'hover', 'always', 'occlusion'],
  'charts.animationOrder': animationOrders,
  'charts.animationEasing': animationEasings,
} satisfies Record<EnumPath, readonly string[]>;

/** Resource and geometry bounds; numeric zero remains a valid theme-reset sentinel. */
export const STUDIO_NUMBER_LIMITS: Readonly<Record<string, readonly [number, number, boolean?]>> = {
  'globe.initialLat': [-90, 90],
  'globe.initialLng': [-180, 180],
  'globe.paperCompassLat': [-90, 90],
  'globe.paperCompassLng': [-180, 180],
  'globe.wireframeGridPulseOriginLat': [-90, 90],
  'globe.wireframeGridPulseOriginLng': [-180, 180],
  'globe.axisTilt': [-180, 180],
  'globe.minZoom': [1, 100],
  'globe.maxZoom': [1, 100],
  'globe.maxFps': [1, 240],
  'globe.starfieldDensity': [0, 20000, true],
  'globe.cinematicCityLightCount': [0, 20000, true],
  'globe.cinematicNetworkConnections': [0, 2000, true],
  'globe.paperAgingCount': [0, 1000, true],
  'globe.hologramCalibrationTicksCount': [0, 1000, true],
  'globe.wireframePoleStreamsCount': [0, 2000, true],
  'globe.wireframeDataPacketsCount': [0, 2000, true],
  'globe.wireframeDensity': [0, 100],
  'globe.labelHaloSteps': [0, 64, true],
  'globe.dottedRippleMaxConcurrent': [0, 128, true],
  'globe.wireframeClickPulseMaxConcurrent': [0, 128, true],
  'globe.outlineHoverCrosshairTooltipDecimals': [0, 10, true],
  'globe.paperGridMajorEvery': [0, 360, true],
  ...Object.fromEntries(['outline', 'hologram', 'cinematic', 'paper']
    .map((kind) => [`globe.${kind}PulseSegments`, [0, 1024, true] as const])),
  'heatmap.meshLevel': [0, 2, true],
  'heatmap.textureLevel': [0, 2, true],
  'heatmap.blurPasses': [0, 16, true],
  'heatmap.threshold': [0, 1],
  'heatmap.shading': [0, 1],
  'hexbin.resolution': [0, 6, true],
  'hexbin.cellInset': [0, 1],
  'hexbin.opacity': [0, 1],
  'hexbin.borderOpacity': [0, 1],
  'charts.innerRadius': [0, 1],
};
