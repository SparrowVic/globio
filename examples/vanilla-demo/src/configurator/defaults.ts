import type {
  ActiveLayer,
  ConfiguratorState,
  GlobeSettings,
  HeatmapSettings,
  HeatmapSurfaceMode,
} from './types';

export const defaultGlobeSettings: GlobeSettings = {
  kind: 'outline',
  theme: 'outline-dark',
  countryResolution: 'low',
  hoverEnabled: true,
  hoverOccludeBackSide: true,
  countryLabels: false,
  labelMinScreenSize: 72,
  autoRotate: true,
  autoRotateSpeed: 0.08,
  axisTilt: 23.5,
  atmosphere: true,
  starfield: true,
  focusPulse: true,
  zoomMode: 'attract',
  zoomStrength: 0.7,
  smoothZoom: true,
  pixelRatio: 'auto',
  adaptiveQuality: true,
};

export const defaultHeatmapSettings: HeatmapSettings = {
  dataset: 'countries',
  kernel: 'dome',
  normalize: 'absolute',
  curve: 'smoothstep',
  displacementCurve: 'cubic',
  palette: 'aurora',
  blendMode: 'normal',
  surfaceMode: 'country',
  detailMode: 'topo',
  radius: 0.075,
  maxHeight: 0.15,
  intensity: 1.6,
  threshold: 0.04,
  blurPasses: 1,
  shading: 0.74,
  meshLevel: 1,
  textureLevel: 1,
  domeCenterArea: 0.85,
  domeShoulderHeight: 0.83,
  domeEdgeSteepness: 1.4,
  domePreScale: 'log',
  animationEnabled: true,
  animationStyle: 'rise',
  animationOrder: 'sequential',
  animationEasing: 'ease-out-cubic',
  animationDurationMs: 1200,
  animationStaggerMs: 10,
  animationDelayMs: 0,
};

export const heatmapSurfacePresets: Readonly<Record<HeatmapSurfaceMode, Partial<HeatmapSettings>>> = {
  country: {
    dataset: 'countries',
    kernel: 'dome',
    normalize: 'absolute',
    curve: 'smoothstep',
    displacementCurve: 'cubic',
    palette: 'aurora',
    blendMode: 'normal',
    detailMode: 'topo',
    radius: 0.075,
    maxHeight: 0.15,
    intensity: 1.6,
    threshold: 0.04,
    blurPasses: 1,
    shading: 0.74,
    meshLevel: 1,
  },
  topographic: {
    kernel: 'gaussian',
    normalize: 'peak',
    curve: 'smoothstep',
    displacementCurve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'normal',
    detailMode: 'topo',
    radius: 0.09,
    maxHeight: 0.12,
    intensity: 1.05,
    threshold: 0.04,
    blurPasses: 3,
    shading: 0.58,
    meshLevel: 1,
  },
  smooth: {
    kernel: 'gaussian',
    normalize: 'log',
    curve: 'sqrt',
    displacementCurve: 'sqrt',
    palette: 'aurora',
    blendMode: 'normal',
    detailMode: 'grid',
    radius: 0.17,
    maxHeight: 0.028,
    intensity: 0.96,
    threshold: 0,
    blurPasses: 5,
    shading: 0.22,
    meshLevel: 0,
  },
  peaks: {
    kernel: 'quartic',
    normalize: 'log',
    curve: 'cubic',
    displacementCurve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'additive',
    detailMode: 'clean',
    radius: 0.055,
    maxHeight: 0.035,
    intensity: 1.45,
    threshold: 0.07,
    blurPasses: 1,
    shading: 0.15,
    meshLevel: 0,
  },
};

export const defaultState: ConfiguratorState = {
  activeLayer: 'hexbin',
  lastPresetId: null,
  dirtySincePreset: false,
  globe: defaultGlobeSettings,
  heatmap: defaultHeatmapSettings,
  hexbin: {
    dataset: 'cluster',
    resolution: 3,
    aggregate: 'count',
    heightMax: 0.085,
    cellInset: 0.97,
    opacity: 0.94,
    showEmpty: true,
    borders: false,
    borderOpacity: 0.3,
    highlight: true,
    animationEnabled: true,
    animationStyle: 'rise',
    animationOrder: 'radial',
    animationEasing: 'ease-out-cubic',
    animationDurationMs: 1300,
    animationStaggerMs: 2.5,
  },
  charts: {
    dataset: 'energy',
    chartType: 'bars-grouped',
    size: 0.06,
    height: 0.1,
    innerRadius: 0.45,
    padAngle: 0.02,
    labels: 'hover',
    borders: false,
    highlight: true,
    animationEnabled: true,
    animationOrder: 'sequential',
    animationEasing: 'ease-out-back',
    animationDurationMs: 900,
    animationStaggerMs: 35,
    segmentStaggerMs: 60,
  },
};

const layerFromPath = (pathname: string): ActiveLayer => {
  if (pathname.includes('heatmap')) return 'heatmap';
  if (pathname.includes('charts')) return 'charts';
  if (pathname.includes('hexbin')) return 'hexbin';
  return 'hexbin';
};

export const initialStateForPath = (pathname: string): ConfiguratorState => ({
  ...defaultState,
  activeLayer: layerFromPath(pathname),
});

export const configuratorPresets: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly patch: Partial<ConfiguratorState>;
}> = [
  {
    id: 'hexbin-ops',
    label: 'Hexbin operations',
    patch: {
      activeLayer: 'hexbin',
      globe: { ...defaultGlobeSettings, theme: 'outline-dark', kind: 'outline' },
      hexbin: { ...defaultState.hexbin, dataset: 'cluster', aggregate: 'count', resolution: 3 },
    },
  },
  {
    id: 'heatmap-population',
    label: 'Population relief',
    patch: {
      activeLayer: 'heatmap',
      globe: { ...defaultGlobeSettings, theme: 'outline-dark', kind: 'outline', atmosphere: false },
      heatmap: { ...defaultHeatmapSettings, ...heatmapSurfacePresets.country, surfaceMode: 'country' },
    },
  },
  {
    id: 'charts-economy',
    label: 'Economy charts',
    patch: {
      activeLayer: 'charts',
      globe: { ...defaultGlobeSettings, theme: 'outline-dark', kind: 'outline' },
      charts: {
        ...defaultState.charts,
        chartType: 'extruded',
        dataset: 'world-gdp',
        labels: 'off',
        animationOrder: 'value',
      },
    },
  },
  {
    id: 'hologram-sensors',
    label: 'Hologram sensors',
    patch: {
      activeLayer: 'hexbin',
      globe: {
        ...defaultGlobeSettings,
        kind: 'hologram',
        theme: 'hologram-cyan',
        atmosphere: true,
        starfield: true,
      },
      hexbin: { ...defaultState.hexbin, dataset: 'random-2k', aggregate: 'sum', showEmpty: false },
    },
  },
];
