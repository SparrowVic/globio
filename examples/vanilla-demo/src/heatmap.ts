import {
  createGlobe,
  type GlobeKind,
  type HeatmapDataEntry,
  type LatLng,
} from '@your-globe/core';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

type DataSet = 'cities' | 'random';

const state: {
  kind: GlobeKind;
  data: DataSet;
  radius: number;
  maxHeight: number;
  subdivisions: number;
} = {
  kind: 'outline',
  data: 'cities',
  radius: 0.12,
  maxHeight: 0.18,
  subdivisions: 6,
};

let globe = mountGlobe(state.kind);

bindRadioRow('kind-row', 'kind', (value) => {
  state.kind = value as GlobeKind;
  remount();
});
bindRadioRow('data-row', 'set', (value) => {
  state.data = value as DataSet;
  applyLayer();
});

bindSlider('radius', 'radius-value', (v) => {
  state.radius = v;
  applyLayer();
});
bindSlider('height', 'height-value', (v) => {
  state.maxHeight = v;
  applyLayer();
});
bindSlider('subs', 'subs-value', (v) => {
  state.subdivisions = Math.round(v);
  applyLayer();
});

function bindRadioRow(rowId: string, attr: string, onPick: (value: string) => void): void {
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

function bindSlider(inputId: string, valueId: string, onChange: (v: number) => void): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const valueEl = document.getElementById(valueId) as HTMLSpanElement | null;
  if (!input || !valueEl) return;
  const update = () => {
    const v = Number(input.value);
    valueEl.textContent = v.toFixed(input.step.includes('.') ? 2 : 0);
    onChange(v);
  };
  input.addEventListener('input', update);
}

function mountGlobe(kind: GlobeKind) {
  container!.innerHTML = '';
  const instance = createGlobe({
    container: container as HTMLElement,
    kind,
    theme: kind === 'dotted' ? 'dotted-dark' : 'outline-dark',
    countries: { resolution: 'low' },
    autoRotate: { enabled: true, speed: 0.05 },
    starfield: { enabled: true },
    atmosphere: { enabled: kind === 'outline' },
    axisTilt: 23.5,
  });
  instance.mount();
  return instance;
}

function remount(): void {
  globe.destroy();
  globe = mountGlobe(state.kind);
  applyLayer();
}

function applyLayer(): void {
  const data = state.data === 'cities' ? CITIES_DATA : RANDOM_DATA;
  const palette = state.data === 'cities' ? 'magma' : 'viridis';
  globe.setDataLayer({
    type: 'heatmap',
    data,
    scale: { type: 'sequential', palette },
    radius: state.radius,
    maxHeight: state.maxHeight,
    subdivisions: state.subdivisions,
  });
}

// Top ~50 mega-cities, value ≈ population in millions of metro area.
const CITIES_DATA: ReadonlyArray<HeatmapDataEntry> = Object.freeze([
  entry([35.6762, 139.6503], 37), // Tokyo
  entry([28.7041, 77.1025], 32), // Delhi
  entry([31.2304, 121.4737], 29), // Shanghai
  entry([23.815, 90.4252], 23), // Dhaka
  entry([-23.5505, -46.6333], 23), // São Paulo
  entry([19.4326, -99.1332], 22), // Mexico City
  entry([30.0444, 31.2357], 22), // Cairo
  entry([39.9042, 116.4074], 22), // Beijing
  entry([19.076, 72.8777], 21), // Mumbai
  entry([34.0522, -118.2437], 19), // Los Angeles
  entry([-34.6037, -58.3816], 16), // Buenos Aires
  entry([22.5726, 88.3639], 15), // Kolkata
  entry([13.7563, 100.5018], 17), // Bangkok
  entry([-6.2088, 106.8456], 11), // Jakarta
  entry([41.0082, 28.9784], 16), // Istanbul
  entry([24.8607, 67.0011], 17), // Karachi
  entry([55.7558, 37.6173], 13), // Moscow
  entry([14.5995, 120.9842], 14), // Manila
  entry([6.5244, 3.3792], 15), // Lagos
  entry([35.6892, 51.389], 9), // Tehran
  entry([40.7128, -74.006], 19), // New York
  entry([13.0827, 80.2707], 11), // Chennai
  entry([12.9716, 77.5946], 13), // Bangalore
  entry([28.6139, 77.209], 11), // New Delhi
  entry([23.1291, 113.2644], 14), // Guangzhou
  entry([22.5431, 114.0579], 13), // Shenzhen
  entry([34.6937, 135.5023], 19), // Osaka
  entry([4.711, -74.0721], 11), // Bogotá
  entry([-26.2041, 28.0473], 10), // Johannesburg
  entry([41.9028, 12.4964], 4), // Rome
  entry([48.8566, 2.3522], 11), // Paris
  entry([51.5074, -0.1278], 9), // London
  entry([52.52, 13.405], 4), // Berlin
  entry([40.4168, -3.7038], 7), // Madrid
  entry([37.5665, 126.978], 25), // Seoul
  entry([1.3521, 103.8198], 6), // Singapore
  entry([21.0285, 105.8542], 8), // Hanoi
  entry([10.8231, 106.6297], 9), // Ho Chi Minh
  entry([3.139, 101.6869], 7), // Kuala Lumpur
  entry([25.2048, 55.2708], 4), // Dubai
  entry([-33.8688, 151.2093], 5), // Sydney
  entry([-37.8136, 144.9631], 5), // Melbourne
  entry([45.4215, -75.6972], 1), // Ottawa
  entry([43.6532, -79.3832], 6), // Toronto
  entry([41.8781, -87.6298], 9), // Chicago
  entry([29.7604, -95.3698], 7), // Houston
  entry([29.4241, -98.4936], 2), // San Antonio
  entry([-22.9068, -43.1729], 13), // Rio de Janeiro
  entry([-12.0464, -77.0428], 11), // Lima
  entry([9.082, 8.6753], 5), // Abuja
]);

// Pseudo-random clusters on three continents, deterministic across reloads.
const RANDOM_DATA: ReadonlyArray<HeatmapDataEntry> = Object.freeze(generateRandom());

function entry(position: LatLng, value: number): HeatmapDataEntry {
  return { position, value };
}

function generateRandom(): Array<HeatmapDataEntry> {
  const out: Array<HeatmapDataEntry> = [];
  const seed = (n: number) => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  // Three cluster centroids, scatter samples around each.
  const centroids: ReadonlyArray<LatLng> = [
    [50, 10], // Europe
    [10, 80], // South Asia
    [-15, -55], // South America
  ];
  let counter = 0;
  for (const [clat, clng] of centroids) {
    for (let i = 0; i < 60; i++) {
      counter++;
      const dLat = (seed(counter) - 0.5) * 30;
      const dLng = (seed(counter + 9000) - 0.5) * 40;
      const value = 5 + seed(counter + 4242) * 95;
      out.push({ position: [clat + dLat, clng + dLng], value });
    }
  }
  return out;
}

// Kick off after all module-level `const`s are initialised — calling
// applyLayer() before this point hits the temporal dead zone for
// CITIES_DATA / RANDOM_DATA.
applyLayer();
