import {
  createGlobe,
  type BarsDataEntry,
  type CountryDataMap,
  type DataLayer,
  type GlobeKind,
} from '@your-globe/core';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

type LayerType = 'bars' | 'extruded' | 'none';
type DataSet = 'population' | 'gdp';

const state: { kind: GlobeKind; layer: LayerType; data: DataSet } = {
  kind: 'outline',
  layer: 'bars',
  data: 'population',
};

let globe = mountGlobe(state.kind);

bindRadioRow('kind-row', 'kind', (value) => {
  state.kind = value as GlobeKind;
  remount();
});
bindRadioRow('layer-row', 'layer', (value) => {
  state.layer = value as LayerType;
  applyLayer();
});
bindRadioRow('data-row', 'set', (value) => {
  state.data = value as DataSet;
  applyLayer();
});

applyLayer();

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

function mountGlobe(kind: GlobeKind) {
  container!.innerHTML = '';
  const instance = createGlobe({
    container: container as HTMLElement,
    kind,
    theme: kind === 'dotted' ? 'dotted-dark' : 'outline-dark',
    countries: { resolution: 'medium' },
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
  if (state.layer === 'none') {
    globe.setDataLayer(null);
    return;
  }
  const layer: DataLayer =
    state.layer === 'bars' ? buildBarsLayer(state.data) : buildExtrudedLayer(state.data);
  globe.setDataLayer(layer);
}

function buildBarsLayer(set: DataSet): DataLayer {
  const palette = set === 'population' ? 'oranges' : 'viridis';
  const entries: ReadonlyArray<BarsDataEntry> =
    set === 'population' ? toBarEntries(POPULATION) : toBarEntries(GDP_PER_CAPITA);
  return {
    type: 'bars',
    data: entries,
    scale: { type: 'sequential', palette },
    width: 0.018,
    height: { min: 0.02, max: 0.5 },
    animateOnMount: 'rise',
    mountDurationMs: 900,
  };
}

function buildExtrudedLayer(set: DataSet): DataLayer {
  const palette = set === 'population' ? 'oranges' : 'viridis';
  const data: CountryDataMap = set === 'population' ? POPULATION : GDP_PER_CAPITA;
  return {
    type: 'extruded',
    data,
    scale: { type: 'sequential', palette },
    height: { min: 0.005, max: 0.22 },
    animateOnMount: 'rise',
    mountDurationMs: 900,
  };
}

function toBarEntries(map: CountryDataMap): ReadonlyArray<BarsDataEntry> {
  const out: Array<BarsDataEntry> = [];
  for (const id in map) {
    const v = map[id]?.value;
    if (typeof v === 'number') out.push({ id, value: v });
  }
  return out;
}

// Country IDs use the world-atlas numeric ISO 3166-1 convention.
const POPULATION: CountryDataMap = Object.freeze({
  '156': { value: 1410 }, // China
  '356': { value: 1410 }, // India
  '840': { value: 333 }, // United States
  '360': { value: 275 }, // Indonesia
  '586': { value: 240 }, // Pakistan
  '566': { value: 224 }, // Nigeria
  '076': { value: 215 }, // Brazil
  '050': { value: 170 }, // Bangladesh
  '643': { value: 144 }, // Russia
  '484': { value: 130 }, // Mexico
  '392': { value: 125 }, // Japan
  '231': { value: 120 }, // Ethiopia
  '608': { value: 115 }, // Philippines
  '818': { value: 110 }, // Egypt
  '180': { value: 102 }, // DR Congo
  '704': { value: 100 }, // Vietnam
  '364': { value: 89 }, // Iran
  '792': { value: 86 }, // Turkey
  '276': { value: 84 }, // Germany
  '764': { value: 71 }, // Thailand
  '826': { value: 67 }, // United Kingdom
  '250': { value: 65 }, // France
  '834': { value: 65 }, // Tanzania
  '710': { value: 60 }, // South Africa
  '380': { value: 59 }, // Italy
  '104': { value: 54 }, // Myanmar
  '404': { value: 53 }, // Kenya
  '410': { value: 52 }, // South Korea
  '170': { value: 51 }, // Colombia
  '724': { value: 47 }, // Spain
});

const GDP_PER_CAPITA: CountryDataMap = Object.freeze({
  '442': { value: 130000 }, // Luxembourg
  '372': { value: 100000 }, // Ireland
  '756': { value: 95000 }, // Switzerland
  '702': { value: 90000 }, // Singapore
  '578': { value: 90000 }, // Norway
  '634': { value: 80000 }, // Qatar
  '840': { value: 75000 }, // United States
  '352': { value: 70000 }, // Iceland
  '208': { value: 68000 }, // Denmark
  '036': { value: 65000 }, // Australia
  '528': { value: 60000 }, // Netherlands
  '752': { value: 58000 }, // Sweden
  '040': { value: 55000 }, // Austria
  '376': { value: 55000 }, // Israel
  '124': { value: 53000 }, // Canada
  '056': { value: 52000 }, // Belgium
  '276': { value: 50000 }, // Germany
  '246': { value: 50000 }, // Finland
  '826': { value: 48000 }, // United Kingdom
  '554': { value: 47000 }, // New Zealand
  '250': { value: 45000 }, // France
  '784': { value: 43000 }, // UAE
  '392': { value: 40000 }, // Japan
  '414': { value: 38000 }, // Kuwait
  '380': { value: 36000 }, // Italy
  '410': { value: 35000 }, // South Korea
  '705': { value: 32000 }, // Slovenia
  '724': { value: 31000 }, // Spain
  '203': { value: 30000 }, // Czech Republic
  '682': { value: 28000 }, // Saudi Arabia
});
