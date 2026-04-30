import {
  createGlobe,
  registerThemePreset,
  type GlobeKind,
  type HeatmapDataEntry,
  type HeatmapDataLayer,
  type LatLng,
  type ScalePalette,
} from '@your-globe/core';

import {
  MEGA_CITIES,
  WORLD_CITIES,
  EARTHQUAKES,
  RANDOM_CLUSTERS,
} from './heatmap-data';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

// One-off custom palette so demos can advertise that the heatmap accepts
// arbitrary multi-stop hex arrays as a `ScalePalette`.
const AURORA: ScalePalette = ['#001b3d', '#0e3b5c', '#36b49f', '#a3ff8b', '#fff7a8', '#ffe4f1'];

type DataSet = 'megacities' | 'worldcities' | 'earthquakes' | 'random';
type Kernel = NonNullable<HeatmapDataLayer['kernel']>;
type Normalize = NonNullable<HeatmapDataLayer['normalize']>;
type Curve = NonNullable<HeatmapDataLayer['curve']>;
type BlendMode = NonNullable<HeatmapDataLayer['blendMode']>;
type PaletteName =
  | 'magma'
  | 'inferno'
  | 'viridis'
  | 'plasma'
  | 'RdBu'
  | 'aurora';

interface Settings {
  kind: GlobeKind;
  dataset: DataSet;
  kernel: Kernel;
  normalize: Normalize;
  curve: Curve;
  palette: PaletteName;
  blendMode: BlendMode;
  radius: number;
  maxHeight: number;
  intensity: number;
  threshold: number;
  blurPasses: number;
  textureLevel: number; // 0..3
}

const TEXTURE_RESOLUTIONS: ReadonlyArray<{ readonly width: number; readonly height: number }> = [
  { width: 1024, height: 512 },
  { width: 2048, height: 1024 },
  { width: 4096, height: 2048 },
  { width: 8192, height: 4096 },
];

const PRESETS: Record<string, Partial<Settings>> = {
  // Flat 2D heat overlay — the classical Mapbox / deck.gl look. Vivid
  // colour ramp; no displacement (so no facets at the limb).
  urban: {
    kernel: 'gaussian',
    normalize: 'peak',
    curve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'normal',
    radius: 0.09,
    maxHeight: 0,
    intensity: 1.2,
    threshold: 0.05,
    blurPasses: 2,
  },
  // Sharp glowing bursts on the Pacific Ring of Fire. Quartic kernel keeps
  // each quake local; additive blending lets peaks bloom against the dark
  // ocean.
  seismic: {
    kernel: 'quartic',
    normalize: 'peak',
    curve: 'cubic',
    palette: 'inferno',
    blendMode: 'additive',
    radius: 0.06,
    maxHeight: 0,
    intensity: 1.6,
    threshold: 0.08,
    blurPasses: 1,
  },
  // Discrete hotspot disks — uniform kernel + high threshold strips out
  // anything that isn't a true cluster.
  hotspots: {
    kernel: 'uniform',
    normalize: 'peak',
    curve: 'linear',
    palette: 'plasma',
    blendMode: 'normal',
    radius: 0.05,
    maxHeight: 0,
    intensity: 1.0,
    threshold: 0.40,
    blurPasses: 0,
  },
  // Smooth continental gradients. Log normalise compresses the wide
  // dynamic range so even small towns contribute. Aurora palette gives
  // a polar-aurora hero shot vibe.
  continental: {
    kernel: 'gaussian',
    normalize: 'log',
    curve: 'sqrt',
    palette: 'aurora',
    blendMode: 'normal',
    radius: 0.18,
    maxHeight: 0,
    intensity: 1.1,
    threshold: 0.02,
    blurPasses: 3,
  },
  // 3D peaks rising over the globe — opt-in displacement showcase. Uses
  // the high-res sphere mesh (auto-bumped when maxHeight > 0) so the
  // surface stays smooth at the limb.
  topo: {
    kernel: 'gaussian',
    normalize: 'log',
    curve: 'cubic',
    palette: 'viridis',
    blendMode: 'normal',
    radius: 0.12,
    maxHeight: 0.22,
    intensity: 1.3,
    threshold: 0.05,
    blurPasses: 2,
  },
};

const settings: Settings = {
  kind: 'outline',
  dataset: 'megacities',
  kernel: 'gaussian',
  normalize: 'peak',
  curve: 'cubic',
  palette: 'inferno',
  blendMode: 'normal',
  radius: 0.10,
  maxHeight: 0,
  intensity: 1.2,
  threshold: 0.05,
  blurPasses: 2,
  textureLevel: 1,
};

// Slightly darker variant of outline-dark so the heatmap colours have more
// pop. Registering as a preset keeps the demo's theme system honest.
registerThemePreset('heatmap-deep', {
  'background.color': '#03050d',
  'globe.surfaceColor': '#0b1530',
  'countries.border.color': '#3a8bd8',
  'countries.border.opacity': 0.32,
  'atmosphere.color': '#1e6fff',
  'atmosphere.intensity': 0.55,
  'starfield.color': '#9bb6ff',
  'starfield.density': 1500,
});

let globe = mountGlobe(settings.kind);

bindRowToggle('preset-row', 'preset', (value) => {
  applyPreset(value);
  syncControls();
  applyLayer();
});

bindRowToggle('data-row', 'set', (value) => {
  settings.dataset = value as DataSet;
  applyLayer();
});

bindRowToggle('kind-row', 'kind', (value) => {
  settings.kind = value as GlobeKind;
  remount();
});

bindRowToggle('kernel-row', 'kernel', (value) => {
  settings.kernel = value as Kernel;
  applyLayer();
});

bindRowToggle('normalize-row', 'normalize', (value) => {
  settings.normalize = value as Normalize;
  applyLayer();
});

bindRowToggle('curve-row', 'curve', (value) => {
  settings.curve = value as Curve;
  applyLayer();
});

bindRowToggle('palette-row', 'palette', (value) => {
  settings.palette = value as PaletteName;
  applyLayer();
});

bindSlider('radius', 'radius-value', 3, (v) => {
  settings.radius = v;
  applyLayer();
});

bindSlider('height', 'height-value', 2, (v) => {
  settings.maxHeight = v;
  applyLayer();
});

bindSlider('intensity', 'intensity-value', 2, (v) => {
  settings.intensity = v;
  applyLayer();
});

bindSlider('threshold', 'threshold-value', 2, (v) => {
  settings.threshold = v;
  applyLayer();
});

bindSlider('blur', 'blur-value', 0, (v) => {
  settings.blurPasses = Math.round(v);
  applyLayer();
});

bindRowToggle('blend-row', 'blend', (value) => {
  settings.blendMode = value as BlendMode;
  applyLayer();
});

bindSlider('tex', 'tex-value', 0, (v) => {
  settings.textureLevel = Math.round(v);
  const r = TEXTURE_RESOLUTIONS[settings.textureLevel] ?? TEXTURE_RESOLUTIONS[1]!;
  const el = document.getElementById('tex-value');
  if (el) el.textContent = `${r.width}×${r.height}`;
  applyLayer();
});

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
  const update = () => {
    const v = Number(input.value);
    if (valueEl && inputId !== 'tex') valueEl.textContent = v.toFixed(decimals);
    onChange(v);
  };
  input.addEventListener('input', update);
}

function applyPreset(name: string): void {
  const preset = PRESETS[name];
  if (!preset) return;
  Object.assign(settings, preset);
}

function syncControls(): void {
  const set = (id: string, value: string | number, decimals = 0) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.value = String(value);
    const valueEl = document.getElementById(`${id}-value`);
    if (valueEl && typeof value === 'number') valueEl.textContent = value.toFixed(decimals);
  };
  set('radius', settings.radius, 3);
  set('height', settings.maxHeight, 2);
  set('intensity', settings.intensity, 2);
  set('threshold', settings.threshold, 2);
  set('blur', settings.blurPasses);

  const setActive = (rowId: string, attr: string, value: string) => {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.querySelectorAll('button').forEach((b) => {
      const btn = b as HTMLButtonElement;
      btn.classList.toggle('active', btn.dataset[attr] === value);
    });
  };
  setActive('kernel-row', 'kernel', settings.kernel);
  setActive('normalize-row', 'normalize', settings.normalize);
  setActive('curve-row', 'curve', settings.curve);
  setActive('palette-row', 'palette', settings.palette);
  setActive('blend-row', 'blend', settings.blendMode);
}

function mountGlobe(kind: GlobeKind) {
  container!.innerHTML = '';
  const themeName = kind === 'dotted' ? 'dotted-dark' : 'heatmap-deep';
  const instance = createGlobe({
    container: container as HTMLElement,
    kind,
    theme: themeName,
    countries: { resolution: 'low' },
    autoRotate: { enabled: true, speed: 0.06 },
    starfield: { enabled: true },
    atmosphere: { enabled: kind === 'outline' },
    axisTilt: 23.5,
  });
  instance.mount();
  return instance;
}

function remount(): void {
  globe.destroy();
  globe = mountGlobe(settings.kind);
  applyLayer();
}

function applyLayer(): void {
  const data = pickDataset(settings.dataset);
  const palette: ScalePalette = settings.palette === 'aurora' ? AURORA : settings.palette;
  const resolution = TEXTURE_RESOLUTIONS[settings.textureLevel] ?? TEXTURE_RESOLUTIONS[1]!;
  const t0 = performance.now();
  globe.setDataLayer({
    type: 'heatmap',
    data,
    scale: { type: 'sequential', palette },
    kernel: settings.kernel,
    normalize: settings.normalize,
    curve: settings.curve,
    blendMode: settings.blendMode,
    radius: settings.radius,
    maxHeight: settings.maxHeight,
    intensity: settings.intensity,
    threshold: settings.threshold,
    blurPasses: settings.blurPasses,
    textureResolution: resolution,
    paletteSteps: 256,
  });
  const dt = performance.now() - t0;
  const stats = document.getElementById('stats');
  if (stats) {
    stats.innerHTML = `Bake: <b>${dt.toFixed(1)} ms</b> · Samples: <b>${data.length}</b> · Texture: <b>${resolution.width}×${resolution.height}</b>`;
  }
}

function pickDataset(name: DataSet): ReadonlyArray<HeatmapDataEntry> {
  switch (name) {
    case 'megacities':
      return MEGA_CITIES;
    case 'worldcities':
      return WORLD_CITIES;
    case 'earthquakes':
      return EARTHQUAKES;
    case 'random':
      return RANDOM_CLUSTERS;
  }
}

// Re-export LatLng so the (intentionally large) data file can stay terse.
export type { LatLng };

// Apply default preset on first paint.
applyPreset('urban');
syncControls();
applyLayer();
