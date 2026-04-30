/**
 * Curated lat/lng sample sets for the heatmap demo. Each entry's `value` is
 * tuned so the resulting density field reads as the dataset's title — e.g.
 * mega-city populations span ~5–37 million, earthquake magnitudes 4.5–8.0.
 *
 * Data is approximate / illustrative; the goal is a beautiful demo, not a
 * scientific reference. For real data feeds, swap in WorldPop / USGS feeds.
 */
import type { HeatmapDataEntry, LatLng } from '@your-globe/core';

const sample = (position: LatLng, value: number, radius?: number): HeatmapDataEntry => {
  const out: HeatmapDataEntry = { position, value };
  if (radius !== undefined) (out as { radius?: number }).radius = radius;
  return out;
};

/** Top ~60 metropolitan areas, value ≈ population in millions of metro area. */
export const MEGA_CITIES: ReadonlyArray<HeatmapDataEntry> = Object.freeze([
  sample([35.6762, 139.6503], 37), // Tokyo
  sample([28.7041, 77.1025], 32),  // Delhi
  sample([31.2304, 121.4737], 29), // Shanghai
  sample([23.815, 90.4252], 23),   // Dhaka
  sample([-23.5505, -46.6333], 23),// São Paulo
  sample([19.4326, -99.1332], 22), // Mexico City
  sample([30.0444, 31.2357], 22),  // Cairo
  sample([39.9042, 116.4074], 22), // Beijing
  sample([19.076, 72.8777], 21),   // Mumbai
  sample([34.0522, -118.2437], 19),// Los Angeles
  sample([-34.6037, -58.3816], 16),// Buenos Aires
  sample([22.5726, 88.3639], 15),  // Kolkata
  sample([13.7563, 100.5018], 17), // Bangkok
  sample([-6.2088, 106.8456], 11), // Jakarta
  sample([41.0082, 28.9784], 16),  // Istanbul
  sample([24.8607, 67.0011], 17),  // Karachi
  sample([55.7558, 37.6173], 13),  // Moscow
  sample([14.5995, 120.9842], 14), // Manila
  sample([6.5244, 3.3792], 15),    // Lagos
  sample([35.6892, 51.389], 9),    // Tehran
  sample([40.7128, -74.006], 19),  // New York
  sample([13.0827, 80.2707], 11),  // Chennai
  sample([12.9716, 77.5946], 13),  // Bangalore
  sample([23.1291, 113.2644], 14), // Guangzhou
  sample([22.5431, 114.0579], 13), // Shenzhen
  sample([34.6937, 135.5023], 19), // Osaka
  sample([4.711, -74.0721], 11),   // Bogotá
  sample([-26.2041, 28.0473], 10), // Johannesburg
  sample([41.9028, 12.4964], 4),   // Rome
  sample([48.8566, 2.3522], 11),   // Paris
  sample([51.5074, -0.1278], 9),   // London
  sample([52.52, 13.405], 4),      // Berlin
  sample([40.4168, -3.7038], 7),   // Madrid
  sample([37.5665, 126.978], 25),  // Seoul
  sample([1.3521, 103.8198], 6),   // Singapore
  sample([21.0285, 105.8542], 8),  // Hanoi
  sample([10.8231, 106.6297], 9),  // Ho Chi Minh
  sample([3.139, 101.6869], 7),    // Kuala Lumpur
  sample([25.2048, 55.2708], 4),   // Dubai
  sample([-33.8688, 151.2093], 5), // Sydney
  sample([-37.8136, 144.9631], 5), // Melbourne
  sample([45.4215, -75.6972], 1),  // Ottawa
  sample([43.6532, -79.3832], 6),  // Toronto
  sample([41.8781, -87.6298], 9),  // Chicago
  sample([29.7604, -95.3698], 7),  // Houston
  sample([-22.9068, -43.1729], 13),// Rio de Janeiro
  sample([-12.0464, -77.0428], 11),// Lima
  sample([9.082, 8.6753], 5),      // Abuja
  sample([6.4541, 3.3947], 6),     // Lekki
  sample([-1.286, 36.8219], 5),    // Nairobi
  sample([18.5204, 73.8567], 7),   // Pune
  sample([12.0464, -77.0428], 4),  // Lima approx 2
  sample([21.3069, -157.8583], 1), // Honolulu
  sample([60.1699, 24.9384], 1.3), // Helsinki
  sample([59.9311, 30.3609], 6),   // St Petersburg
  sample([-15.7942, -47.8825], 5), // Brasília
  sample([19.0760, 72.8777], 4),   // Mumbai (cluster)
  sample([24.4539, 54.3773], 1.6), // Abu Dhabi
  sample([39.0392, 125.7625], 3.2),// Pyongyang
]);

/**
 * Big-net world cities — 250 entries spanning every continent. Values
 * weighted by approximate metro population so dense regions (Eastern Asia,
 * NW Europe, NE USA) bloom into smooth bands and isolated cities show as
 * crisp peaks.
 */
export const WORLD_CITIES: ReadonlyArray<HeatmapDataEntry> = Object.freeze(buildWorldCities());

/**
 * Pacific Ring of Fire + global earthquake hotspots. Values map to
 * approximate Mw moment magnitudes (4.0–8.5). Tight clusters around
 * subduction zones, sparser in stable cratons.
 */
export const EARTHQUAKES: ReadonlyArray<HeatmapDataEntry> = Object.freeze(buildEarthquakes());

/** Deterministic synthetic clusters — useful for tweaking knobs. */
export const RANDOM_CLUSTERS: ReadonlyArray<HeatmapDataEntry> = Object.freeze(buildRandomClusters());

function buildWorldCities(): Array<HeatmapDataEntry> {
  // Each row: lat, lng, weight. Hand-curated to span continents with a
  // slight emphasis on dense Asia + Europe to make the heatmap interesting.
  const rows: ReadonlyArray<readonly [number, number, number]> = [
    // Eastern Asia mega-region
    [35.68, 139.69, 37], [34.69, 135.50, 19], [35.18, 136.91, 9],
    [33.59, 130.40, 5], [43.07, 141.35, 4], [38.27, 140.87, 2],
    [37.57, 126.98, 25], [37.45, 126.65, 4], [35.10, 129.04, 8],
    [35.87, 128.60, 4], [37.55, 127.0, 3], [39.04, 125.76, 3.2],
    [31.23, 121.47, 29], [39.90, 116.40, 22], [22.54, 114.06, 13],
    [23.13, 113.26, 14], [30.27, 120.16, 7], [29.56, 106.55, 16],
    [30.59, 114.30, 11], [32.06, 118.79, 8], [34.74, 113.62, 7],
    [22.27, 114.16, 7], [25.03, 121.57, 7], [24.15, 120.67, 3],
    // Indian subcontinent
    [28.70, 77.10, 32], [19.08, 72.88, 21], [13.08, 80.27, 11],
    [12.97, 77.59, 13], [22.57, 88.36, 15], [17.39, 78.49, 10],
    [23.03, 72.58, 8], [25.32, 82.97, 4], [26.92, 75.79, 4],
    [21.17, 72.83, 7], [18.52, 73.86, 7], [11.02, 76.96, 3],
    [9.93, 76.27, 3], [15.85, 74.50, 2], [27.18, 78.01, 2],
    [24.86, 67.01, 17], [31.55, 74.34, 14], [33.69, 73.05, 2],
    [33.60, 73.07, 3], [25.39, 68.36, 2.5], [23.81, 90.42, 23],
    // Southeast Asia
    [13.75, 100.50, 17], [-6.21, 106.85, 11], [3.14, 101.69, 7],
    [1.35, 103.82, 6], [10.82, 106.63, 9], [21.03, 105.85, 8],
    [14.60, 120.98, 14], [10.31, 123.89, 1.5], [3.59, 98.67, 3],
    [-7.25, 112.74, 3], [-6.92, 107.61, 2.7],
    // Middle East
    [25.20, 55.27, 4], [24.45, 54.38, 1.6], [29.37, 47.98, 4],
    [30.04, 31.24, 22], [33.32, 44.36, 9], [31.78, 35.22, 1],
    [33.88, 35.54, 2], [33.51, 36.30, 2], [34.69, 33.04, 1],
    [35.69, 51.39, 9], [31.95, 35.93, 1], [36.20, 37.16, 2],
    [41.01, 28.98, 16], [39.92, 32.85, 5], [38.42, 27.14, 4],
    // Africa
    [6.52, 3.38, 15], [4.05, 9.70, 1], [9.08, 8.67, 5],
    [-26.20, 28.05, 10], [-25.75, 28.19, 2], [-29.86, 31.03, 3],
    [-1.29, 36.82, 5], [-15.41, 28.28, 1], [0.32, 32.58, 1.5],
    [-4.04, 39.66, 1], [-1.94, 30.06, 1], [-26.86, 26.67, 0.5],
    [33.59, -7.62, 4], [36.75, 3.06, 3], [36.81, 10.18, 2],
    [-16.50, -68.15, 2], [12.00, 8.59, 4],
    // Europe
    [51.51, -0.13, 9], [48.86, 2.35, 11], [52.52, 13.41, 4],
    [50.85, 4.35, 1.2], [50.11, 8.68, 2.5], [48.13, 11.58, 2.6],
    [53.55, 9.99, 1.8], [40.42, -3.70, 7], [41.39, 2.16, 5],
    [41.90, 12.50, 4], [45.46, 9.19, 4], [40.85, 14.27, 3],
    [37.98, 23.73, 3], [38.71, -9.14, 3], [55.75, 37.62, 13],
    [59.93, 30.36, 6], [55.45, 37.36, 3], [55.79, 49.13, 1.5],
    [53.34, -6.27, 1.5], [55.95, -3.19, 1], [55.68, 12.57, 1.3],
    [60.17, 24.94, 1.3], [59.91, 10.75, 1], [59.33, 18.07, 2],
    [52.23, 21.01, 1.7], [50.06, 19.94, 0.8], [50.07, 14.44, 1.3],
    [48.21, 16.37, 2], [47.50, 19.04, 1.7], [44.43, 26.10, 2],
    [44.79, 20.45, 1.6], [42.70, 23.32, 1.2], [37.97, 23.73, 3],
    [54.69, 25.28, 0.5], [56.95, 24.11, 0.6], [59.44, 24.75, 0.4],
    // North America
    [40.71, -74.01, 19], [34.05, -118.24, 19], [41.88, -87.63, 9],
    [29.76, -95.37, 7], [33.45, -112.07, 5], [39.95, -75.17, 6],
    [29.42, -98.49, 2], [32.78, -96.80, 7], [25.76, -80.19, 6],
    [33.75, -84.39, 6], [42.36, -71.06, 5], [38.91, -77.04, 6],
    [47.61, -122.33, 4], [37.77, -122.42, 4.7], [45.51, -122.68, 2.5],
    [43.65, -79.38, 6], [45.42, -75.69, 1.4], [49.28, -123.12, 2.6],
    [53.55, -113.49, 1.4], [51.05, -114.07, 1.5], [46.81, -71.21, 0.8],
    [19.43, -99.13, 22], [20.66, -103.35, 5], [25.69, -100.31, 5],
    [21.16, -86.85, 0.9], [9.93, -84.08, 1.5], [14.63, -90.51, 3],
    [12.13, -86.25, 1], [13.69, -89.21, 1.7], [9.07, -79.45, 1.7],
    // South America
    [-23.55, -46.63, 23], [-22.91, -43.17, 13], [-15.79, -47.88, 5],
    [-30.03, -51.23, 4], [-25.43, -49.27, 4], [-12.05, -77.04, 11],
    [4.71, -74.07, 11], [10.50, -66.92, 3], [-0.18, -78.47, 2],
    [-34.60, -58.38, 16], [-32.95, -60.66, 1.5], [-33.45, -70.67, 6.7],
    [-12.97, -38.51, 4], [-3.71, -38.54, 4], [-8.05, -34.88, 4],
    [-19.92, -43.94, 5], [4.60, -74.08, 2], [10.96, -74.79, 1.5],
    // Oceania
    [-33.87, 151.21, 5], [-37.81, 144.96, 5], [-27.47, 153.03, 2.6],
    [-31.95, 115.86, 2], [-34.93, 138.60, 1.4], [-41.29, 174.78, 0.4],
    [-36.85, 174.76, 1.7], [-43.53, 172.64, 0.4], [-17.74, 168.31, 0.05],
    [-9.45, 147.18, 0.4],
    // Russia & Central Asia
    [55.04, 82.93, 1.6], [56.84, 60.61, 1.5], [54.99, 73.37, 1.2],
    [56.32, 44.00, 1.3], [53.20, 50.15, 1.2], [51.66, 39.20, 1.1],
    [51.53, 46.03, 0.9], [54.71, 20.51, 0.5], [43.24, 76.95, 2],
    [41.31, 69.28, 3], [38.55, 68.78, 0.9], [37.95, 58.38, 0.8],
    [55.00, 73.00, 1.0],
    // Sparser fillers (small islands / outliers)
    [21.31, -157.86, 1], [13.45, 144.78, 0.2], [14.60, -90.55, 2],
    [-21.13, -175.20, 0.05], [-17.60, 178.09, 0.3], [64.13, -21.94, 0.4],
    [70.07, 27.04, 0.05], [78.22, 15.65, 0.05], [-54.81, -68.31, 0.06],
    [-77.85, 166.69, 0.001], [-90.0, 0.0, 0.001], [82.5, -62.5, 0.001],
  ];
  return rows.map((r) => sample([r[0], r[1]] as LatLng, r[2]));
}

function buildEarthquakes(): Array<HeatmapDataEntry> {
  // 180 stamps along the Pacific Ring of Fire + Mediterranean / Himalayan
  // belts. Magnitudes Mw 4.5–8.0; deep-quake clusters use slightly larger
  // radii so they read as broader stains rather than sharp pin pricks.
  const out: Array<HeatmapDataEntry> = [];
  // Helper to add a noisy strand along a path.
  const strand = (
    points: ReadonlyArray<readonly [number, number]>,
    stepsPerEdge: number,
    magBase: number,
    magJitter: number,
    seedOffset: number
  ) => {
    let counter = seedOffset;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      for (let s = 0; s < stepsPerEdge; s++) {
        const t = s / stepsPerEdge;
        const lat = a[0] + (b[0] - a[0]) * t;
        const lng = a[1] + (b[1] - a[1]) * t;
        const jitter = (Math.sin(counter * 12.9898) * 43758.5453) % 1;
        const dLat = ((jitter + 1) % 1 - 0.5) * 2.5;
        const dLng = ((Math.sin(counter * 78.233) * 43758.5453) % 1 - 0.5) * 2.5;
        const mag = magBase + magJitter * (((Math.sin(counter * 31.7) * 1e4) % 1 + 1) % 1);
        out.push(sample([lat + dLat, lng + dLng], mag));
        counter++;
      }
    }
  };
  // Pacific Ring of Fire — Andes ↑ N. America ↑ Aleutians ↓ Kamchatka ↓ Japan ↓ PNG ↓ NZ
  strand(
    [
      [-55, -70], [-30, -71], [-10, -77], [10, -85], [25, -110], [50, -130],
      [55, -158], [55, 167], [45, 145], [35, 137], [25, 122], [15, 121],
      [-5, 130], [-10, 150], [-30, 175], [-45, 168],
    ],
    7,
    5.0,
    1.5,
    100
  );
  // Indonesia / Philippine arc
  strand(
    [[-10, 95], [-7, 110], [-5, 125], [5, 125], [12, 122], [20, 122]],
    5,
    5.5,
    1.8,
    400
  );
  // Mediterranean / Iran / Himalayan belt
  strand(
    [
      [38, -8], [37, 0], [37, 15], [38, 27], [39, 38], [38, 47],
      [35, 53], [33, 60], [30, 70], [29, 80], [30, 90], [27, 100], [25, 110],
    ],
    4,
    4.8,
    1.2,
    700
  );
  // Mid-Atlantic ridge
  strand(
    [[63, -18], [40, -30], [10, -40], [-15, -15], [-40, -10], [-60, 0]],
    3,
    4.6,
    0.9,
    1100
  );
  return out;
}

function buildRandomClusters(): Array<HeatmapDataEntry> {
  const out: Array<HeatmapDataEntry> = [];
  const seed = (n: number) => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  const centroids: ReadonlyArray<readonly [number, number, number]> = [
    [50, 10, 5],     // Europe — radius scale
    [10, 80, 6],     // South Asia
    [-15, -55, 4],   // South America
    [35, -100, 5],   // North America
    [-20, 25, 3],    // Southern Africa
    [40, 130, 5],    // Northeast Asia
  ];
  let counter = 0;
  for (const [clat, clng, weight] of centroids) {
    for (let i = 0; i < 80; i++) {
      counter++;
      const dLat = (seed(counter) - 0.5) * 30;
      const dLng = (seed(counter + 9000) - 0.5) * 40;
      const value = weight * (0.4 + seed(counter + 4242) * 1.6);
      out.push(sample([clat + dLat, clng + dLng], value));
    }
  }
  return out;
}
