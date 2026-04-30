import {
  createGlobe,
  type ChartType,
  type ChartsDataEntry,
  type ChartsDataLayer,
  type ChartSeries,
  type DataLayer,
} from '@your-globe/core';
import {
  CO2_SERIES,
  GDP_SERIES,
  WORLD_CO2_EMISSIONS,
  WORLD_GDP_NOMINAL,
} from './charts-data';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

type DataSet = 'energy' | 'population' | 'quarterly' | 'kpi' | 'world-gdp' | 'world-co2';

type LabelsMode = 'off' | 'hover' | 'always' | 'occlusion';
type AnimOrder = 'sequential' | 'radial' | 'value' | 'reverse-value' | 'random';

interface Settings {
  chartType: ChartType;
  dataset: DataSet;
  size: number;
  height: number;
  innerRadius: number;
  padAngle: number;
  easing: string;
  durationMs: number;
  staggerMs: number;
  segmentStaggerMs: number;
  labels: LabelsMode;
  borders: boolean;
  highlight: boolean;
  animOrder: AnimOrder;
}

const settings: Settings = {
  chartType: 'bars-grouped',
  dataset: 'energy',
  size: 0.06,
  height: 0.1,
  innerRadius: 0.45,
  padAngle: 0.02,
  easing: 'ease-out-back',
  durationMs: 900,
  staggerMs: 35,
  segmentStaggerMs: 60,
  labels: 'hover',
  borders: false,
  highlight: true,
  animOrder: 'sequential',
};

// ---------------------------------------------------------------------------
// Datasets — small hand-curated samples so the demo loads instantly without
// hitting any external API. Real apps pipe their own arrays through
// setDataLayer(). Country ids = ISO 3166-1 numeric codes (matches the
// world-atlas TopoJSON the globe loads internally).
// ---------------------------------------------------------------------------

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

// "KPI" — single-value-per-country dataset for the gauge chart. Renewable
// energy share (% of total) reads cleanly on a 180° arc.
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

const datasetSeries: Record<DataSet, ReadonlyArray<ChartSeries>> = {
  energy: ENERGY_SERIES,
  population: POPULATION_SERIES,
  quarterly: QUARTERLY_SERIES,
  kpi: KPI_SERIES,
  'world-gdp': GDP_SERIES,
  'world-co2': CO2_SERIES,
};

const datasetData: Record<DataSet, ReadonlyArray<ChartsDataEntry>> = {
  energy: ENERGY_DATA,
  population: POPULATION_DATA,
  quarterly: QUARTERLY_DATA,
  kpi: KPI_DATA,
  'world-gdp': WORLD_GDP_NOMINAL,
  'world-co2': WORLD_CO2_EMISSIONS,
};

// ---------------------------------------------------------------------------
// Globe boot
// ---------------------------------------------------------------------------

const globe = createGlobe({
  container: container as HTMLElement,
  kind: 'outline',
  theme: 'outline-dark',
  countries: { resolution: 'low' },
  autoRotate: { enabled: true, speed: 0.06 },
  atmosphere: { enabled: true },
  starfield: { enabled: true },
});
globe.mount();
globe.flyTo([22, 18], 3, { duration: 1 });

// First-paint config — renders before features finish loading; the queue
// inside globe.ts re-runs setDataLayer once features are in.
applyLayer();

// ---------------------------------------------------------------------------
// HUD bindings
// ---------------------------------------------------------------------------

bindRowToggle('type-row', 'type', (value) => {
  settings.chartType = value as ChartType;
  reconcileDatasetForChartType();
  applyLayer();
});

function setActiveButton(rowId: string, attr: string, value: string): void {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.querySelectorAll('button').forEach((b) => {
    const btn = b as HTMLButtonElement;
    btn.classList.toggle('active', btn.dataset[attr] === value);
  });
}

bindRowToggle('data-row', 'set', (value) => {
  settings.dataset = value as DataSet;
  reconcileChartTypeForDataset();
  applyLayer();
});

bindSlider('size', 'size-value', 3, (v) => {
  settings.size = v;
  applyLayer();
});
bindSlider('height', 'height-value', 2, (v) => {
  settings.height = v;
  applyLayer();
});
bindSlider('inner', 'inner-value', 2, (v) => {
  settings.innerRadius = v;
  applyLayer();
});
bindSlider('pad', 'pad-value', 3, (v) => {
  settings.padAngle = v;
  applyLayer();
});
bindSlider('duration', 'duration-value', 0, (v) => {
  settings.durationMs = Math.round(v);
  applyLayer();
});
bindSlider('stagger', 'stagger-value', 0, (v) => {
  settings.staggerMs = Math.round(v);
  applyLayer();
});
bindSlider('seg-stagger', 'seg-stagger-value', 0, (v) => {
  settings.segmentStaggerMs = Math.round(v);
  applyLayer();
});

bindRowToggle('labels-row', 'labels', (v) => {
  settings.labels = v as LabelsMode;
  applyLayer();
});
bindRowToggle('borders-row', 'borders', (v) => {
  settings.borders = v === 'on';
  applyLayer();
});
bindRowToggle('highlight-row', 'highlight', (v) => {
  settings.highlight = v === 'on';
  applyLayer();
});
bindRowToggle('order-row', 'order', (v) => {
  settings.animOrder = v as AnimOrder;
  applyLayer();
});

const easingSelect = document.getElementById('easing') as HTMLSelectElement | null;
if (easingSelect) {
  easingSelect.addEventListener('change', () => {
    settings.easing = easingSelect.value;
    const el = document.getElementById('easing-value');
    if (el) el.textContent = settings.easing;
    applyLayer();
  });
}

const replayBtn = document.getElementById('anim-replay');
if (replayBtn) {
  replayBtn.addEventListener('click', () => applyLayer());
}

// ---------------------------------------------------------------------------
// Apply / status
// ---------------------------------------------------------------------------

function applyLayer(): void {
  const series = datasetSeries[settings.dataset];
  const data = datasetData[settings.dataset];
  // Whole-globe datasets (world-gdp, world-co2) drive `extruded` mode
  // visibly across the map — use a sequential scale so the value range
  // produces a clear gradient. Single-colour series fallback would
  // collapse every country to the same shade.
  const isWholeGlobe =
    settings.dataset === 'world-gdp' || settings.dataset === 'world-co2';
  const layer: ChartsDataLayer = {
    type: 'charts',
    chartType: settings.chartType,
    series,
    data,
    size: settings.size,
    height: settings.height,
    innerRadius: settings.innerRadius,
    padAngle: settings.padAngle,
    ...(settings.chartType === 'gauge' ? { gaugeMax: 100 } : {}),
    ...(isWholeGlobe
      ? {
          scale: {
            type: 'sequential',
            // Custom 5-stop gradient: dark teal → orange → bright yellow
            // (same palette as hexbin; reads cleanly on outline-dark).
            palette: ['#1d3a4f', '#3d8eb9', '#f4a261', '#ffd700', '#fff5b1'],
          },
        }
      : {}),
    animation: {
      duration: settings.durationMs,
      stagger: settings.staggerMs,
      easing: settings.easing as never,
      order: settings.animOrder,
    },
    ...(settings.borders ? { borderColor: '#ffffff', borderWidth: 0.45 } : {}),
    highlight: settings.highlight,
    segmentStagger: settings.segmentStaggerMs,
    labels:
      settings.labels === 'off' || settings.chartType === 'extruded'
        ? false
        : { mode: settings.labels, fontSize: 11 },
    events: {
      onHover: (payload) => {
        if (!payload) {
          tooltip.style.display = 'none';
          return;
        }
        const seriesLabel = series.find((s) => s.key === payload.seriesKey)?.label
          ?? payload.seriesKey
          ?? '?';
        tooltip.innerHTML = `<b>${payload.entry.label ?? payload.entry.id ?? '?'}</b><br/>${seriesLabel}: <b>${payload.value}</b>`;
        tooltip.style.display = 'block';
      },
      onClick: (payload) => {
        // eslint-disable-next-line no-console
        console.log('[charts] click', payload);
      },
    },
  };
  globe.setDataLayer(layer as DataLayer);
  setStatus(
    `${data.length} charts · ${series.length} series · type: <b>${settings.chartType}</b>`
  );
}

function reconcileDatasetForChartType(): void {
  // Auto-swap to a sensible dataset for the chosen chart-type.
  // - gauge: single value 0..max per country → 'kpi'
  // - extruded: whole-globe coverage so colour spreads across countries
  // - rest: multi-series default → 'energy'
  if (settings.chartType === 'gauge' && settings.dataset !== 'kpi') {
    settings.dataset = 'kpi';
    setActiveButton('data-row', 'set', 'kpi');
    return;
  }
  if (
    settings.chartType === 'extruded' &&
    settings.dataset !== 'world-gdp' &&
    settings.dataset !== 'world-co2'
  ) {
    settings.dataset = 'world-gdp';
    setActiveButton('data-row', 'set', 'world-gdp');
    return;
  }
  if (
    settings.chartType !== 'gauge' &&
    settings.chartType !== 'extruded' &&
    (settings.dataset === 'kpi' ||
      settings.dataset === 'world-gdp' ||
      settings.dataset === 'world-co2')
  ) {
    settings.dataset = 'energy';
    setActiveButton('data-row', 'set', 'energy');
  }
}

function reconcileChartTypeForDataset(): void {
  if (settings.dataset === 'kpi' && settings.chartType !== 'gauge') {
    settings.chartType = 'gauge';
    setActiveButton('type-row', 'type', 'gauge');
    return;
  }
  if (
    (settings.dataset === 'world-gdp' || settings.dataset === 'world-co2') &&
    settings.chartType !== 'extruded'
  ) {
    settings.chartType = 'extruded';
    setActiveButton('type-row', 'type', 'extruded');
    return;
  }
  if (
    settings.dataset !== 'kpi' &&
    settings.dataset !== 'world-gdp' &&
    settings.dataset !== 'world-co2' &&
    (settings.chartType === 'gauge' || settings.chartType === 'extruded')
  ) {
    settings.chartType = 'bars-grouped';
    setActiveButton('type-row', 'type', 'bars-grouped');
  }
}

const tooltip = document.getElementById('tooltip') as HTMLDivElement;
window.addEventListener('pointermove', (e) => {
  tooltip.style.left = `${e.clientX + 12}px`;
  tooltip.style.top = `${e.clientY + 12}px`;
});

function setStatus(html: string): void {
  const el = document.getElementById('stats');
  if (el) el.innerHTML = html;
}

function bindRowToggle(rowId: string, attr: string, onPick: (value: string) => void): void {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'BUTTON') return;
    const value = target.dataset[attr];
    if (!value) return;
    row.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    target.classList.add('active');
    onPick(value);
  });
}

function bindSlider(
  inputId: string,
  valueId: string,
  decimals: number,
  onChange: (v: number) => void
): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const valueEl = document.getElementById(valueId) as HTMLSpanElement | null;
  if (!input) return;
  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (valueEl) valueEl.textContent = v.toFixed(decimals);
    onChange(v);
  });
}
