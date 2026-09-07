import type {
  ArcConfig,
  CountryDataMap,
  MarkerConfig,
  ScaleConfig,
  StoryConfig,
} from '@your-globe/core';

// Population, millions. Keys are the numeric ISO 3166-1 codes world-atlas
// uses as feature ids (zero-padded, e.g. '032' Argentina).
export const POPULATION: CountryDataMap = {
  '156': { value: 1412 }, // CN
  '356': { value: 1380 }, // IN
  '840': { value: 332 }, // US
  '360': { value: 273 }, // ID
  '586': { value: 225 }, // PK
  '076': { value: 213 }, // BR
  '566': { value: 219 }, // NG
  '050': { value: 166 }, // BD
  '643': { value: 144 }, // RU
  '484': { value: 128 }, // MX
  '392': { value: 125 }, // JP
  '231': { value: 118 }, // ET
  '608': { value: 111 }, // PH
  '818': { value: 109 }, // EG
  '704': { value: 98 }, // VN
  '180': { value: 96 }, // CD
  '792': { value: 85 }, // TR
  '364': { value: 85 }, // IR
  '276': { value: 84 }, // DE
  '764': { value: 70 }, // TH
  '826': { value: 67 }, // GB
  '250': { value: 65 }, // FR
  '380': { value: 59 }, // IT
  '710': { value: 60 }, // ZA
  '404': { value: 54 }, // KE
  '032': { value: 45 }, // AR
  '124': { value: 38 }, // CA
  '616': { value: 38 }, // PL
  '036': { value: 26 }, // AU
  '682': { value: 35 }, // SA
  '170': { value: 51 }, // CO
  '724': { value: 47 }, // ES
  '804': { value: 41 }, // UA
  '504': { value: 37 }, // MA
  '604': { value: 33 }, // PE
  '752': { value: 10 }, // SE
  '578': { value: 5 }, // NO
  '246': { value: 6 }, // FI
  '398': { value: 19 }, // KZ
  '496': { value: 3 }, // MN
};

export const SCALE: ScaleConfig = {
  type: 'sequential',
  palette: ['#6fb4ff', '#ff8a4c'],
  domain: [0, 1500],
  noDataColor: '#1a2029',
};

export const MARKERS: ReadonlyArray<MarkerConfig> = [
  { id: 'tokyo', position: [35.68, 139.69], color: '#ff8a4c', size: 1.9, pulse: true, label: 'Tokyo' },
  { id: 'nairobi', position: [-1.29, 36.82], color: '#dcebff', size: 1.6, pulse: true, label: 'Nairobi' },
  { id: 'sao-paulo', position: [-23.55, -46.63], color: '#ff8a4c', size: 1.8, pulse: true, label: 'São Paulo' },
  { id: 'warsaw', position: [52.23, 21.01], color: '#dcebff', size: 1.6, pulse: true, label: 'Warsaw' },
  { id: 'sydney', position: [-33.87, 151.21], color: '#dcebff', size: 1.4, label: 'Sydney' },
  { id: 'san-francisco', position: [37.77, -122.42], color: '#dcebff', size: 1.4, label: 'San Francisco' },
];

export const ARCS: ReadonlyArray<ArcConfig> = [
  { id: 'sf-tokyo', from: [37.77, -122.42], to: [35.68, 139.69], color: '#ff8a4c', width: 1.3, animated: true, animationDuration: 3.2, headEasing: 'pulse' },
  { id: 'warsaw-nairobi', from: [52.23, 21.01], to: [-1.29, 36.82], color: '#6fb4ff', width: 1.1, style: 'dashed', dashSize: 0.03, dashGap: 0.02, animated: true, animationDuration: 3.6 },
  { id: 'sao-paulo-sydney', from: [-23.55, -46.63], to: [-33.87, 151.21], color: '#dcebff', width: 1, animated: true, animationDuration: 4.4, headEasing: 'easeInOut' },
];

export interface Stop {
  readonly id: string;
  readonly label: string;
  readonly country: string;
  readonly position: readonly [number, number];
  readonly popup: string;
}

export const STOPS: ReadonlyArray<Stop> = [
  { id: 'tokyo', label: 'Tokyo', country: '392', position: [35.68, 139.69], popup: 'Tokyo · 37.4M' },
  { id: 'nairobi', label: 'Nairobi', country: '404', position: [-1.29, 36.82], popup: 'Nairobi · 5.1M' },
  { id: 'sao-paulo', label: 'São Paulo', country: '076', position: [-23.55, -46.63], popup: 'São Paulo · 22.4M' },
  { id: 'warsaw', label: 'Warsaw', country: '616', position: [52.23, 21.01], popup: 'Warsaw · 1.8M' },
];

export const TOUR: StoryConfig = {
  loop: true,
  scenes: STOPS.map((stop) => ({
    id: stop.id,
    duration: 4600,
    transitionDuration: 1800,
    flyTo: { position: stop.position },
    activeCountry: stop.country,
    popup: { position: stop.position, content: stop.popup, anchor: 'top' },
  })),
};

export const SNIPPET = `globe.setCountryData(population, {
  type: 'sequential',
  palette: ['#6fb4ff', '#ff8a4c'],
  domain: [0, 1500],
});

globe.setMarkers([{ id: 'tokyo', position: [35.68, 139.69], pulse: true }]);
globe.setArcs([{ id: 'sf-tokyo', from: [37.77, -122.42], to: [35.68, 139.69] }]);

globe.setStory({
  loop: true,
  scenes: [
    { id: 'tokyo',   duration: 4600, flyTo: { position: [35.68, 139.69] }, activeCountry: '392' },
    { id: 'nairobi', duration: 4600, flyTo: { position: [-1.29, 36.82] },  activeCountry: '404' },
  ],
});
globe.playStory();

globe.on('countryClick', ({ country }) => select(country.id));`;
