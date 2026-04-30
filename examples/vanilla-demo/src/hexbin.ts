import {
  createGlobe,
  type DataLayer,
  type HexBinDataEntry,
  type HexBinDataLayer,
} from '@your-globe/core';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

type AggregateMode = 'sum' | 'count' | 'mean' | 'max';
type DataSet = 'random-2k' | 'random-10k' | 'cluster' | 'bands';

interface Settings {
  resolution: number;
  aggregate: AggregateMode;
  dataset: DataSet;
  height: number;
  inset: number;
  opacity: number;
  showEmpty: boolean;
  durationMs: number;
  staggerMs: number;
}

const settings: Settings = {
  resolution: 3,
  aggregate: 'sum',
  dataset: 'cluster',
  height: 0.06,
  inset: 0.96,
  opacity: 0.95,
  showEmpty: false,
  durationMs: 1400,
  staggerMs: 3,
};

// Deterministic RNG so the demo is repeatable on reload.
const seededRandom = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489917);
    s = (s ^= s >>> 16) >>> 0;
    return s / 4294967296;
  };
};

const buildRandom = (count: number, seed: number): ReadonlyArray<HexBinDataEntry> => {
  const rng = seededRandom(seed);
  const out: Array<HexBinDataEntry> = [];
  for (let i = 0; i < count; i++) {
    // Uniformly distributed on a sphere → invert lat through arcsin so
    // density is even across the globe (otherwise the poles look crowded).
    const u = rng();
    const v = rng();
    const lat = (Math.asin(2 * u - 1) * 180) / Math.PI;
    const lng = v * 360 - 180;
    out.push({ position: [lat, lng], value: 0.5 + rng() * 2 });
  }
  return out;
};

const buildClusters = (): ReadonlyArray<HexBinDataEntry> => {
  // Three dense clusters around major regions (NA, EU, SE Asia) plus a
  // sparse halo so the rest of the globe isn't completely empty.
  const rng = seededRandom(42);
  const centers: ReadonlyArray<readonly [number, number, number]> = [
    [40, -100, 1.2], // North America
    [50, 15, 1.0], // Europe
    [12, 105, 1.4], // SE Asia
  ];
  const out: Array<HexBinDataEntry> = [];
  for (const [lat, lng, w] of centers) {
    for (let i = 0; i < 600; i++) {
      const dLat = (rng() - 0.5) * 25;
      const dLng = (rng() - 0.5) * 50;
      out.push({ position: [lat + dLat, lng + dLng], value: w * (0.4 + rng()) });
    }
  }
  // Sparse halo across the rest.
  for (let i = 0; i < 400; i++) {
    const u = rng();
    const v = rng();
    const lat = (Math.asin(2 * u - 1) * 180) / Math.PI;
    const lng = v * 360 - 180;
    out.push({ position: [lat, lng], value: 0.1 + rng() * 0.4 });
  }
  return out;
};

const buildLatBands = (): ReadonlyArray<HexBinDataEntry> => {
  // Concentric latitude bands — values spike at equator + 30°N + 60°S.
  const rng = seededRandom(7);
  const out: Array<HexBinDataEntry> = [];
  const targetLats: ReadonlyArray<number> = [0, 30, -60];
  for (let i = 0; i < 4000; i++) {
    const v = rng();
    const lng = v * 360 - 180;
    const which = i % 3;
    const targetLat = targetLats[which]!;
    const lat = targetLat + (rng() - 0.5) * 12;
    out.push({ position: [lat, lng], value: 1 + rng() });
  }
  return out;
};

const datasets: Record<DataSet, () => ReadonlyArray<HexBinDataEntry>> = {
  'random-2k': () => buildRandom(2000, 1),
  'random-10k': () => buildRandom(10000, 2),
  cluster: () => buildClusters(),
  bands: () => buildLatBands(),
};

const cellsForLevel = (l: number): number => 20 * Math.pow(4, l);

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
applyLayer();

// ---------------------------------------------------------------------------
// HUD bindings
// ---------------------------------------------------------------------------

bindRowToggle('agg-row', 'agg', (v) => {
  settings.aggregate = v as AggregateMode;
  applyLayer();
});
bindRowToggle('data-row', 'set', (v) => {
  settings.dataset = v as DataSet;
  applyLayer();
});
bindRowToggle('empty-row', 'empty', (v) => {
  settings.showEmpty = v === 'on';
  applyLayer();
});

bindSlider('resolution', 'res-value', 0, (v) => {
  settings.resolution = Math.round(v);
  const cellsEl = document.getElementById('cells-value');
  if (cellsEl) cellsEl.textContent = cellsForLevel(settings.resolution).toString();
  applyLayer();
});
bindSlider('height', 'height-value', 3, (v) => {
  settings.height = v;
  applyLayer();
});
bindSlider('inset', 'inset-value', 2, (v) => {
  settings.inset = v;
  applyLayer();
});
bindSlider('opacity', 'opacity-value', 2, (v) => {
  settings.opacity = v;
  applyLayer();
});
bindSlider('duration', 'duration-value', 0, (v) => {
  settings.durationMs = Math.round(v);
  applyLayer();
});
bindSlider('stagger', 'stagger-value', 1, (v) => {
  settings.staggerMs = v;
  applyLayer();
});

const replayBtn = document.getElementById('anim-replay');
if (replayBtn) replayBtn.addEventListener('click', () => applyLayer());

// ---------------------------------------------------------------------------
// Apply / status
// ---------------------------------------------------------------------------

function applyLayer(): void {
  const data = datasets[settings.dataset]();
  const t0 = performance.now();
  const layer: HexBinDataLayer = {
    type: 'hexbin',
    data,
    resolution: settings.resolution,
    aggregate: settings.aggregate,
    height: { min: 0, max: settings.height },
    cellInset: settings.inset,
    opacity: settings.opacity,
    showEmpty: settings.showEmpty,
    scale: {
      type: 'sequential',
      // 'inferno' (red→yellow) reads much better than viridis on the dark
      // outline-dark globe — viridis's bottom 50% is dark purple/blue and
      // disappears into the background.
      palette: 'inferno',
    },
    animation: {
      duration: settings.durationMs,
      stagger: settings.staggerMs,
      easing: 'ease-out-cubic',
    },
  };
  globe.setDataLayer(layer as DataLayer);
  const dt = performance.now() - t0;
  setStatus(
    `${data.length.toLocaleString()} samples → ${cellsForLevel(settings.resolution).toLocaleString()} cells · agg <b>${settings.aggregate}</b> · bake ${dt.toFixed(0)} ms`
  );
}

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
