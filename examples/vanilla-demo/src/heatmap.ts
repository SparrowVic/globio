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
  WORLD_COUNTRIES_POPULATION,
  fetchEarthquakesWeek,
  fetchEarthquakesMonth,
  fetchEarthquakesYear,
} from './heatmap-data';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

// One-off custom palette so demos can advertise that the heatmap accepts
// arbitrary multi-stop hex arrays as a `ScalePalette`.
const AURORA: ScalePalette = ['#001b3d', '#0e3b5c', '#36b49f', '#a3ff8b', '#fff7a8', '#ffe4f1'];

type DataSet =
  | 'countries'
  | 'megacities'
  | 'worldcities'
  | 'earthquakes'
  | 'random'
  | 'quakes-week'
  | 'quakes-month'
  | 'quakes-year';

const LIVE_DATASETS: ReadonlySet<DataSet> = new Set([
  'quakes-week',
  'quakes-month',
  'quakes-year',
]);
type Kernel = NonNullable<HeatmapDataLayer['kernel']>;
type Normalize = NonNullable<HeatmapDataLayer['normalize']>;
type Curve = NonNullable<HeatmapDataLayer['curve']>;
type BlendMode = NonNullable<HeatmapDataLayer['blendMode']>;
type DispCurve = NonNullable<HeatmapDataLayer['displacementCurve']>;
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
  displacementCurve: DispCurve;
  palette: PaletteName;
  blendMode: BlendMode;
  radius: number;
  maxHeight: number;
  intensity: number;
  threshold: number;
  blurPasses: number;
  shading: number;
  meshLevel: number; // 0..2 → 256x128 / 1024x512 / 2048x1024
  textureLevel: number; // 0..3
}

const TEXTURE_RESOLUTIONS: ReadonlyArray<{ readonly width: number; readonly height: number }> = [
  { width: 1024, height: 512 },
  { width: 2048, height: 1024 },
  { width: 4096, height: 2048 },
  { width: 8192, height: 4096 },
];

const PRESETS: Record<string, Partial<Settings>> = {
  // Population heatmap covering every country. Log normalise so Vatican
  // (1k people) and India (1.4B) both stay visible. 3D peaks rise over
  // the most populous regions but don't dominate small countries.
  countries: {
    kernel: 'gaussian',
    normalize: 'log',
    curve: 'smoothstep',
    displacementCurve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'normal',
    radius: 0.09,
    maxHeight: 0.18,
    intensity: 1.0,
    threshold: 0.02,
    blurPasses: 2,
    meshLevel: 1,
    shading: 0.7,
  },
  // Flat 2D heat overlay — the classical Mapbox / deck.gl look. Vivid
  // colour ramp; no displacement (so no facets at the limb).
  urban: {
    kernel: 'gaussian',
    normalize: 'peak',
    curve: 'smoothstep',
    displacementCurve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'normal',
    radius: 0.09,
    maxHeight: 0,
    intensity: 1.2,
    threshold: 0.05,
    blurPasses: 2,
    meshLevel: 0,
    shading: 0,
  },
  // Sharp glowing bursts on the Pacific Ring of Fire. Quartic kernel keeps
  // each quake local; additive blending lets peaks bloom against the dark
  // ocean.
  seismic: {
    kernel: 'quartic',
    normalize: 'peak',
    curve: 'cubic',
    displacementCurve: 'cubic',
    palette: 'inferno',
    blendMode: 'additive',
    radius: 0.06,
    maxHeight: 0,
    intensity: 1.6,
    threshold: 0.08,
    blurPasses: 1,
    meshLevel: 0,
    shading: 0,
  },
  // Discrete hotspot disks — uniform kernel + high threshold strips out
  // anything that isn't a true cluster.
  hotspots: {
    kernel: 'uniform',
    normalize: 'peak',
    curve: 'linear',
    displacementCurve: 'linear',
    palette: 'plasma',
    blendMode: 'normal',
    radius: 0.05,
    maxHeight: 0,
    intensity: 1.0,
    threshold: 0.40,
    blurPasses: 0,
    meshLevel: 0,
    shading: 0,
  },
  // Smooth continental gradients. Log normalise compresses the wide
  // dynamic range so even small towns contribute. Aurora palette gives
  // a polar-aurora hero shot vibe.
  continental: {
    kernel: 'gaussian',
    normalize: 'log',
    curve: 'sqrt',
    displacementCurve: 'sqrt',
    palette: 'aurora',
    blendMode: 'normal',
    radius: 0.18,
    maxHeight: 0,
    intensity: 1.1,
    threshold: 0.02,
    blurPasses: 3,
    meshLevel: 0,
    shading: 0,
  },
  // 3D peaks rising over the globe — flagship preset. Smooth-step
  // displacement curve keeps the dome shape rather than plateauing;
  // hero-shot mesh resolution + Lambert shading gives real volume.
  topo: {
    kernel: 'gaussian',
    normalize: 'peak',
    curve: 'smoothstep',
    displacementCurve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'normal',
    radius: 0.09,
    maxHeight: 0.18,
    intensity: 1.0,
    threshold: 0.04,
    blurPasses: 3,
    meshLevel: 2,
    shading: 0.7,
  },
  // Designed for live USGS earthquake data: tens of thousands of points
  // with magnitudes in [2.5, 8]. `log` normalisation keeps small swarms
  // visible alongside headline M7+ events; small radius + lower-res
  // texture keeps the bake under 100ms even at 30k samples.
  'live-seismic': {
    kernel: 'quartic',
    normalize: 'log',
    curve: 'smoothstep',
    displacementCurve: 'smoothstep',
    palette: 'inferno',
    blendMode: 'additive',
    radius: 0.04,
    maxHeight: 0.0,
    intensity: 1.4,
    threshold: 0.06,
    blurPasses: 1,
    meshLevel: 0, // flat-mesh; displacement adds nothing here
    shading: 0,
  },
};

const MESH_RESOLUTIONS: ReadonlyArray<{ readonly width: number; readonly height: number }> = [
  { width: 256, height: 128 },   // flat-only, lightest
  { width: 1024, height: 512 },  // standard 3D
  { width: 2048, height: 1024 }, // hero 3D
];

const settings: Settings = {
  kind: 'outline',
  dataset: 'countries',
  kernel: 'gaussian',
  normalize: 'log',
  curve: 'smoothstep',
  displacementCurve: 'smoothstep',
  palette: 'inferno',
  blendMode: 'normal',
  radius: 0.09,
  maxHeight: 0.16,
  intensity: 1.0,
  threshold: 0.02,
  blurPasses: 2,
  shading: 0.7,
  meshLevel: 1,
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
  // Visually clear any active live-row button — same logical row.
  document
    .querySelectorAll('#live-row button.active')
    .forEach((b) => b.classList.remove('active'));
  void applyLayer();
});

bindRowToggle('live-row', 'set', (value) => {
  settings.dataset = value as DataSet;
  document
    .querySelectorAll('#data-row button.active')
    .forEach((b) => b.classList.remove('active'));
  // Live earthquake data has a magnitude range very different from the
  // city / synthetic datasets — auto-switch to a preset designed for it.
  // Without this, the topo / urban defaults wash out the magnitude data
  // and the globe looks empty.
  applyPreset('live-seismic');
  // Force a smaller texture for fast bake — overrides whatever the user
  // had set since 4096² with 30k samples can take 5+ seconds.
  settings.textureLevel = 0; // 1024×512
  syncControls();
  // Defer the bake by one tick so the "Fetching…" status renders first
  // — the bake is synchronous and would otherwise freeze the page until
  // it completes, hiding any progress UI.
  setTimeout(() => void applyLayer(), 0);
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

// Debounce sliders that trigger an actual texture rebake (radius, blur,
// kernel) — without this, dragging the radius slider re-bakes 60+ times
// per second on a 30k-sample dataset and freezes the page. Shader-side
// sliders (intensity, threshold, height) update instantly because the
// HeatmapLayer detects the bake-key match and skips the bake.
const debounce = <T extends (...args: never[]) => unknown>(fn: T, wait: number): T => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), wait);
  }) as T;
};
const applyLayerDebounced = debounce(() => {
  void applyLayer();
}, 150);

bindSlider('radius', 'radius-value', 3, (v) => {
  settings.radius = v;
  applyLayerDebounced();
});

bindSlider('height', 'height-value', 2, (v) => {
  settings.maxHeight = v;
  applyLayer(); // shader-only, no rebake
});

bindSlider('intensity', 'intensity-value', 2, (v) => {
  settings.intensity = v;
  applyLayer(); // shader-only
});

bindSlider('threshold', 'threshold-value', 2, (v) => {
  settings.threshold = v;
  applyLayer();
});

bindSlider('blur', 'blur-value', 0, (v) => {
  settings.blurPasses = Math.round(v);
  applyLayerDebounced(); // triggers re-bake → debounce
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
    // Atmosphere off — its outer halo washes out the heatmap's colour
    // contrast and competes with peak bloom in 3D mode.
    atmosphere: { enabled: false },
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

// Tracks which live dataset request is in-flight so out-of-order resolves
// from quick switching don't render a stale fetch result.
let activeRequestToken = 0;

async function applyLayer(): Promise<void> {
  const requestToken = ++activeRequestToken;
  const data = await loadDataset(settings.dataset);
  if (requestToken !== activeRequestToken) return; // user picked another set mid-flight
  if (!data) return; // fetch failed; status already reported

  const palette: ScalePalette = settings.palette === 'aurora' ? AURORA : settings.palette;
  const resolution = TEXTURE_RESOLUTIONS[settings.textureLevel] ?? TEXTURE_RESOLUTIONS[1]!;
  const meshRes = MESH_RESOLUTIONS[settings.meshLevel] ?? MESH_RESOLUTIONS[1]!;
  const t0 = performance.now();
  globe.setDataLayer({
    type: 'heatmap',
    data,
    scale: { type: 'sequential', palette },
    kernel: settings.kernel,
    normalize: settings.normalize,
    curve: settings.curve,
    displacementCurve: settings.displacementCurve,
    blendMode: settings.blendMode,
    radius: settings.radius,
    maxHeight: settings.maxHeight,
    intensity: settings.intensity,
    threshold: settings.threshold,
    blurPasses: settings.blurPasses,
    shading: settings.shading,
    textureResolution: resolution,
    meshResolution: meshRes,
    paletteSteps: 256,
  });
  const dt = performance.now() - t0;
  const stats = document.getElementById('stats');
  if (stats) {
    stats.innerHTML =
      `Bake: <b>${dt.toFixed(1)} ms</b> · Samples: <b>${data.length}</b> · ` +
      `Texture: <b>${resolution.width}×${resolution.height}</b> · ` +
      `Mesh: <b>${meshRes.width}×${meshRes.height}</b>`;
  }
  if (LIVE_DATASETS.has(settings.dataset)) {
    setLiveStatus(`Live USGS · ${data.length.toLocaleString()} earthquakes loaded.`);
  }
}

const liveCache = new Map<DataSet, ReadonlyArray<HeatmapDataEntry>>();

async function loadDataset(name: DataSet): Promise<ReadonlyArray<HeatmapDataEntry> | null> {
  switch (name) {
    case 'countries':
      return WORLD_COUNTRIES_POPULATION;
    case 'megacities':
      return MEGA_CITIES;
    case 'worldcities':
      return WORLD_CITIES;
    case 'earthquakes':
      return EARTHQUAKES;
    case 'random':
      return RANDOM_CLUSTERS;
    case 'quakes-week':
    case 'quakes-month':
    case 'quakes-year': {
      const cached = liveCache.get(name);
      if (cached) {
        // eslint-disable-next-line no-console
        console.log(`[heatmap] using cached USGS ${name}: ${cached.length} entries`);
        return cached;
      }
      const fetcher = LIVE_FETCHERS[name];
      setLiveStatus(`Fetching ${LIVE_LABELS[name]} from USGS…`);
      const t0 = performance.now();
      try {
        const entries = await fetcher();
        const dt = performance.now() - t0;
        // Quick magnitude / coord sanity report so it's obvious in the
        // console whether the fetch + parse worked.
        let minMag = Infinity;
        let maxMag = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        for (const e of entries) {
          if (e.value < minMag) minMag = e.value;
          if (e.value > maxMag) maxMag = e.value;
          if (e.position[0] < minLat) minLat = e.position[0];
          if (e.position[0] > maxLat) maxLat = e.position[0];
        }
        // eslint-disable-next-line no-console
        console.log(
          `[heatmap] USGS ${name}: ${entries.length} entries in ${dt.toFixed(0)}ms · ` +
            `mag range [${minMag.toFixed(1)} – ${maxMag.toFixed(1)}] · ` +
            `lat range [${minLat.toFixed(1)} – ${maxLat.toFixed(1)}]`
        );
        liveCache.set(name, entries);
        return entries;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error(`[heatmap] USGS fetch failed:`, err);
        setLiveStatus(`Failed to fetch live data: ${msg}`);
        return null;
      }
    }
  }
}

const LIVE_FETCHERS: Record<
  'quakes-week' | 'quakes-month' | 'quakes-year',
  () => Promise<ReadonlyArray<HeatmapDataEntry>>
> = {
  'quakes-week': fetchEarthquakesWeek,
  'quakes-month': fetchEarthquakesMonth,
  'quakes-year': fetchEarthquakesYear,
};
const LIVE_LABELS: Record<'quakes-week' | 'quakes-month' | 'quakes-year', string> = {
  'quakes-week': 'past week (~3k)',
  'quakes-month': 'past month (~12k)',
  'quakes-year': 'past year M2.5+ (~30k)',
};

function setLiveStatus(text: string): void {
  const el = document.getElementById('live-status');
  if (el) el.textContent = text;
}

// Re-export LatLng so the (intentionally large) data file can stay terse.
export type { LatLng };

// Apply default preset on first paint. `countries` covers every UN member
// state with a population-weighted kernel — best at-a-glance demo of what
// the heatmap can do without any API call or curated city list.
applyPreset('countries');
const presetRow = document.getElementById('preset-row');
presetRow?.querySelectorAll('button').forEach((b) => {
  const btn = b as HTMLButtonElement;
  btn.classList.toggle('active', btn.dataset['preset'] === 'countries');
});
syncControls();
void applyLayer();
