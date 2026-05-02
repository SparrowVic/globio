import type {
  ChartSeries,
  ChartsDataEntry,
  HeatmapDataEntry,
  HexBinDataEntry,
  ScalePalette,
} from '@your-globe/core';

import {
  CO2_SERIES,
  GDP_SERIES,
  WORLD_CO2_EMISSIONS,
  WORLD_GDP_NOMINAL,
} from '../charts-data';
import {
  EARTHQUAKES,
  MEGA_CITIES,
  RANDOM_CLUSTERS,
  WORLD_CITIES,
  WORLD_COUNTRIES_POPULATION,
  fetchEarthquakesMonth,
  fetchEarthquakesWeek,
  fetchEarthquakesYear,
} from '../heatmap-data';
import type { ChartDatasetId, HeatmapDatasetId, HeatmapPaletteName, HexbinDatasetId } from './types';

export const AURORA_PALETTE: ScalePalette = [
  '#001b3d',
  '#0e3b5c',
  '#36b49f',
  '#a3ff8b',
  '#fff7a8',
  '#ffe4f1',
];

export const HOTSPOT_PALETTE: ScalePalette = [
  '#123447',
  '#2f7e9d',
  '#73c68a',
  '#ffd166',
  '#f97316',
  '#ef4444',
];

export const resolveHeatmapPalette = (palette: HeatmapPaletteName): ScalePalette =>
  palette === 'aurora' ? AURORA_PALETTE : palette;

export interface LabeledOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
}

export const heatmapDatasetOptions: ReadonlyArray<LabeledOption<HeatmapDatasetId>> = [
  { value: 'countries', label: 'Population by country' },
  { value: 'megacities', label: 'Mega cities' },
  { value: 'worldcities', label: 'World cities' },
  { value: 'earthquakes', label: 'Ring of fire' },
  { value: 'random', label: 'Synthetic clusters' },
  { value: 'quakes-week', label: 'USGS week' },
  { value: 'quakes-month', label: 'USGS month' },
  { value: 'quakes-year', label: 'USGS year' },
];

export const liveHeatmapDatasets = new Set<HeatmapDatasetId>([
  'quakes-week',
  'quakes-month',
  'quakes-year',
]);

const localHeatmapDatasets: Readonly<Record<Exclude<HeatmapDatasetId, 'quakes-week' | 'quakes-month' | 'quakes-year'>, ReadonlyArray<HeatmapDataEntry>>> = {
  countries: WORLD_COUNTRIES_POPULATION,
  megacities: MEGA_CITIES,
  worldcities: WORLD_CITIES,
  earthquakes: EARTHQUAKES,
  random: RANDOM_CLUSTERS,
};

const liveHeatmapFetchers: Readonly<Record<Extract<HeatmapDatasetId, 'quakes-week' | 'quakes-month' | 'quakes-year'>, () => Promise<ReadonlyArray<HeatmapDataEntry>>>> = {
  'quakes-week': fetchEarthquakesWeek,
  'quakes-month': fetchEarthquakesMonth,
  'quakes-year': fetchEarthquakesYear,
};

export const getHeatmapDataset = async (
  id: HeatmapDatasetId
): Promise<ReadonlyArray<HeatmapDataEntry>> => {
  if (id in localHeatmapDatasets) {
    return localHeatmapDatasets[id as keyof typeof localHeatmapDatasets];
  }
  return liveHeatmapFetchers[id as keyof typeof liveHeatmapFetchers]();
};

const ENERGY_SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'fossil', label: 'Fossil', color: '#f25c5c' },
  { key: 'nuclear', label: 'Nuclear', color: '#ffd700' },
  { key: 'hydro', label: 'Hydro', color: '#5cb8ff' },
  { key: 'renew', label: 'Other renewables', color: '#65d18a' },
];

const ENERGY_DATA: ReadonlyArray<ChartsDataEntry> = [
  { id: '840', label: 'USA', values: { fossil: 60, nuclear: 19, hydro: 6, renew: 15 } },
  { id: '124', label: 'Canada', values: { fossil: 19, nuclear: 15, hydro: 60, renew: 6 } },
  { id: '826', label: 'UK', values: { fossil: 38, nuclear: 14, hydro: 2, renew: 46 } },
  { id: '276', label: 'Germany', values: { fossil: 44, nuclear: 6, hydro: 3, renew: 47 } },
  { id: '250', label: 'France', values: { fossil: 8, nuclear: 65, hydro: 11, renew: 16 } },
  { id: '380', label: 'Italy', values: { fossil: 60, nuclear: 0, hydro: 16, renew: 24 } },
  { id: '392', label: 'Japan', values: { fossil: 71, nuclear: 6, hydro: 8, renew: 15 } },
];

const POPULATION_SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'youth', label: '0-14', color: '#5cb8ff' },
  { key: 'adult', label: '15-64', color: '#ffd700' },
  { key: 'senior', label: '65+', color: '#f25c5c' },
];

const POPULATION_DATA: ReadonlyArray<ChartsDataEntry> = [
  { id: '156', label: 'China', values: { youth: 17, adult: 70, senior: 13 } },
  { id: '356', label: 'India', values: { youth: 25, adult: 67, senior: 8 } },
  { id: '840', label: 'USA', values: { youth: 18, adult: 65, senior: 17 } },
  { id: '360', label: 'Indonesia', values: { youth: 24, adult: 68, senior: 8 } },
  { id: '586', label: 'Pakistan', values: { youth: 35, adult: 60, senior: 5 } },
  { id: '076', label: 'Brazil', values: { youth: 21, adult: 69, senior: 10 } },
  { id: '566', label: 'Nigeria', values: { youth: 43, adult: 54, senior: 3 } },
  { id: '050', label: 'Bangladesh', values: { youth: 27, adult: 67, senior: 6 } },
  { id: '643', label: 'Russia', values: { youth: 18, adult: 66, senior: 16 } },
  { id: '484', label: 'Mexico', values: { youth: 25, adult: 67, senior: 8 } },
  { id: '392', label: 'Japan', values: { youth: 12, adult: 59, senior: 29 } },
  { id: '276', label: 'Germany', values: { youth: 14, adult: 64, senior: 22 } },
];

const QUARTERLY_SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'q1', label: 'Q1', color: '#5cb8ff' },
  { key: 'q2', label: 'Q2', color: '#65d18a' },
  { key: 'q3', label: 'Q3', color: '#ffd700' },
  { key: 'q4', label: 'Q4', color: '#f25c5c' },
];

const QUARTERLY_DATA: ReadonlyArray<ChartsDataEntry> = [
  { id: '840', label: 'USA', values: { q1: 84, q2: 92, q3: 102, q4: 118 } },
  { id: '156', label: 'China', values: { q1: 130, q2: 140, q3: 138, q4: 145 } },
  { id: '392', label: 'Japan', values: { q1: 38, q2: 42, q3: 48, q4: 56 } },
  { id: '276', label: 'Germany', values: { q1: 42, q2: 46, q3: 44, q4: 52 } },
  { id: '826', label: 'UK', values: { q1: 30, q2: 34, q3: 38, q4: 44 } },
  { id: '250', label: 'France', values: { q1: 28, q2: 32, q3: 36, q4: 40 } },
  { id: '356', label: 'India', values: { q1: 50, q2: 60, q3: 70, q4: 82 } },
  { id: '076', label: 'Brazil', values: { q1: 22, q2: 26, q3: 30, q4: 34 } },
];

const KPI_SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'kpi', label: 'Renewables share %', color: '#65d18a' },
];

const KPI_DATA: ReadonlyArray<ChartsDataEntry> = [
  { id: '578', label: 'Norway', values: { kpi: 98 } },
  { id: '752', label: 'Sweden', values: { kpi: 60 } },
  { id: '208', label: 'Denmark', values: { kpi: 67 } },
  { id: '276', label: 'Germany', values: { kpi: 47 } },
  { id: '826', label: 'UK', values: { kpi: 46 } },
  { id: '250', label: 'France', values: { kpi: 27 } },
  { id: '724', label: 'Spain', values: { kpi: 50 } },
  { id: '380', label: 'Italy', values: { kpi: 41 } },
  { id: '840', label: 'USA', values: { kpi: 22 } },
  { id: '156', label: 'China', values: { kpi: 31 } },
  { id: '356', label: 'India', values: { kpi: 22 } },
  { id: '076', label: 'Brazil', values: { kpi: 89 } },
];

export interface ChartDataset {
  readonly label: string;
  readonly series: ReadonlyArray<ChartSeries>;
  readonly data: ReadonlyArray<ChartsDataEntry>;
}

export const chartDatasetOptions: ReadonlyArray<LabeledOption<ChartDatasetId>> = [
  { value: 'energy', label: 'Energy mix (G7)' },
  { value: 'population', label: 'Population age' },
  { value: 'quarterly', label: 'Quarterly sales' },
  { value: 'kpi', label: 'Renewables gauge' },
  { value: 'world-gdp', label: 'World GDP' },
  { value: 'world-co2', label: 'World CO2' },
];

export const chartDatasets: Readonly<Record<ChartDatasetId, ChartDataset>> = {
  energy: { label: 'Energy mix (G7)', series: ENERGY_SERIES, data: ENERGY_DATA },
  population: { label: 'Population age', series: POPULATION_SERIES, data: POPULATION_DATA },
  quarterly: { label: 'Quarterly sales', series: QUARTERLY_SERIES, data: QUARTERLY_DATA },
  kpi: { label: 'Renewables gauge', series: KPI_SERIES, data: KPI_DATA },
  'world-gdp': { label: 'World GDP', series: GDP_SERIES, data: WORLD_GDP_NOMINAL },
  'world-co2': { label: 'World CO2', series: CO2_SERIES, data: WORLD_CO2_EMISSIONS },
};

export const getChartDataset = (id: ChartDatasetId): ChartDataset => chartDatasets[id];

const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state =
      Math.imul(state ^ (state >>> 15), 2246822507) ^
      Math.imul(state ^ (state >>> 13), 3266489917);
    state = (state ^ (state >>> 16)) >>> 0;
    return state / 4294967296;
  };
};

const buildRandomHexbins = (count: number, seed: number): ReadonlyArray<HexBinDataEntry> => {
  const rng = seededRandom(seed);
  const data: Array<HexBinDataEntry> = [];
  for (let index = 0; index < count; index++) {
    const u = rng();
    const v = rng();
    const latitude = (Math.asin(2 * u - 1) * 180) / Math.PI;
    const longitude = v * 360 - 180;
    data.push({ position: [latitude, longitude], value: 0.5 + rng() * 2 });
  }
  return data;
};

const buildClusterHexbins = (): ReadonlyArray<HexBinDataEntry> => {
  const rng = seededRandom(42);
  const centers: ReadonlyArray<readonly [number, number, number]> = [
    [40, -100, 1.2],
    [50, 15, 1.0],
    [12, 105, 1.4],
  ];
  const data: Array<HexBinDataEntry> = [];
  for (const [latitude, longitude, weight] of centers) {
    for (let index = 0; index < 600; index++) {
      data.push({
        position: [latitude + (rng() - 0.5) * 25, longitude + (rng() - 0.5) * 50],
        value: weight * (0.4 + rng()),
      });
    }
  }
  for (let index = 0; index < 400; index++) {
    const u = rng();
    const v = rng();
    data.push({
      position: [(Math.asin(2 * u - 1) * 180) / Math.PI, v * 360 - 180],
      value: 0.1 + rng() * 0.4,
    });
  }
  return data;
};

const buildBandHexbins = (): ReadonlyArray<HexBinDataEntry> => {
  const rng = seededRandom(7);
  const targets: ReadonlyArray<number> = [0, 30, -60];
  const data: Array<HexBinDataEntry> = [];
  for (let index = 0; index < 4000; index++) {
    const targetLatitude = targets[index % targets.length] ?? 0;
    data.push({
      position: [targetLatitude + (rng() - 0.5) * 12, rng() * 360 - 180],
      value: 1 + rng(),
    });
  }
  return data;
};

const hexbinCache = new Map<HexbinDatasetId, ReadonlyArray<HexBinDataEntry>>();

const hexbinBuilders: Readonly<Record<HexbinDatasetId, () => ReadonlyArray<HexBinDataEntry>>> = {
  'random-2k': () => buildRandomHexbins(2000, 1),
  'random-10k': () => buildRandomHexbins(10000, 2),
  cluster: buildClusterHexbins,
  bands: buildBandHexbins,
};

export const hexbinDatasetOptions: ReadonlyArray<LabeledOption<HexbinDatasetId>> = [
  { value: 'cluster', label: 'Regional clusters' },
  { value: 'bands', label: 'Latitude bands' },
  { value: 'random-2k', label: 'Random 2k' },
  { value: 'random-10k', label: 'Random 10k' },
];

export const getHexbinDataset = (id: HexbinDatasetId): ReadonlyArray<HexBinDataEntry> => {
  const cached = hexbinCache.get(id);
  if (cached) return cached;
  const data = hexbinBuilders[id]();
  hexbinCache.set(id, data);
  return data;
};

export const cellsForHexbinResolution = (resolution: number): number =>
  20 * Math.pow(4, resolution);
