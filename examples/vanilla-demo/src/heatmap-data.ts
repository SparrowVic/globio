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

/**
 * One sample per UN member state (+ a few territories) at the country's
 * approximate centroid. `value` = population in millions. Uniform global
 * coverage — every country contributes a kernel, so the heatmap reads as
 * "where humans live" without any blank quadrants. Default kernel radius
 * ~5° gives generous overlap so neighbouring countries blend smoothly.
 *
 * Population estimates rounded to one decimal where useful, sourced from
 * UN / World Bank circa 2024. Centroids are visual centres rather than
 * geometric — picked so the kernel sits over the populated heartland
 * (e.g. Russia anchored on European Russia, not Siberia).
 */
export const WORLD_COUNTRIES_POPULATION: ReadonlyArray<HeatmapDataEntry> = Object.freeze(
  buildWorldCountriesPopulation()
);

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

function buildWorldCountriesPopulation(): Array<HeatmapDataEntry> {
  // Each row: [lat, lng, populationMillions, name]. Name is informational
  // (kept as a comment for readability), populations are circa 2024 UN /
  // World Bank estimates rounded to one decimal.
  const rows: ReadonlyArray<readonly [number, number, number, string]> = [
    // ===== Africa =====
    [28.0, 3.0, 45, 'Algeria'],
    [-12.5, 17.5, 36, 'Angola'],
    [9.5, 2.3, 13.7, 'Benin'],
    [-22.3, 24.6, 2.6, 'Botswana'],
    [12.2, -1.6, 22.5, 'Burkina Faso'],
    [-3.4, 29.9, 13.2, 'Burundi'],
    [16.0, -24.0, 0.6, 'Cabo Verde'],
    [6.5, 12.5, 28.6, 'Cameroon'],
    [6.6, 20.9, 5.5, 'Central African Republic'],
    [15.5, 18.7, 17.7, 'Chad'],
    [-12.2, 44.4, 0.85, 'Comoros'],
    [-2.9, 23.6, 102, 'DR Congo'],
    [-0.7, 14.6, 5.8, 'Republic of the Congo'],
    [7.5, -5.5, 28.9, "Côte d'Ivoire"],
    [11.8, 42.6, 1.1, 'Djibouti'],
    [26.8, 30.8, 110, 'Egypt'],
    [1.6, 10.3, 1.7, 'Equatorial Guinea'],
    [15.2, 39.8, 3.6, 'Eritrea'],
    [-26.5, 31.5, 1.2, 'Eswatini'],
    [9.1, 40.5, 120, 'Ethiopia'],
    [-0.8, 11.6, 2.4, 'Gabon'],
    [13.4, -15.5, 2.6, 'Gambia'],
    [7.9, -1.0, 33.5, 'Ghana'],
    [10.6, -10.9, 13.5, 'Guinea'],
    [12.0, -15.2, 2.1, 'Guinea-Bissau'],
    [0.0, 37.9, 53, 'Kenya'],
    [-29.6, 28.2, 2.1, 'Lesotho'],
    [6.4, -9.4, 5.3, 'Liberia'],
    [25.0, 17.2, 6.7, 'Libya'],
    [-19.0, 46.9, 30, 'Madagascar'],
    [-13.3, 34.3, 20.4, 'Malawi'],
    [17.6, -4.0, 22.6, 'Mali'],
    [20.3, -10.9, 4.7, 'Mauritania'],
    [-20.2, 57.6, 1.3, 'Mauritius'],
    [31.8, -7.0, 37.5, 'Morocco'],
    [-18.7, 35.5, 33.9, 'Mozambique'],
    [-22.6, 17.1, 2.6, 'Namibia'],
    [17.6, 8.1, 26.2, 'Niger'],
    [9.1, 8.7, 224, 'Nigeria'],
    [-1.9, 29.9, 13.5, 'Rwanda'],
    [0.2, 6.6, 0.23, 'São Tomé and Príncipe'],
    [14.5, -14.5, 17.8, 'Senegal'],
    [-4.7, 55.5, 0.1, 'Seychelles'],
    [8.5, -11.8, 8.7, 'Sierra Leone'],
    [5.2, 46.2, 17.6, 'Somalia'],
    [-29.0, 24.7, 60, 'South Africa'],
    [7.9, 30.0, 11.5, 'South Sudan'],
    [13.0, 30.2, 47.6, 'Sudan'],
    [-6.4, 34.9, 65, 'Tanzania'],
    [8.6, 0.8, 8.9, 'Togo'],
    [33.8, 9.5, 12.1, 'Tunisia'],
    [1.4, 32.3, 47.2, 'Uganda'],
    [-13.1, 27.8, 19.5, 'Zambia'],
    [-19.0, 29.9, 16.3, 'Zimbabwe'],
    // ===== Americas =====
    [17.1, -61.8, 0.1, 'Antigua and Barbuda'],
    [-34.0, -64.0, 45.5, 'Argentina'],
    [24.7, -76.6, 0.4, 'Bahamas'],
    [13.2, -59.5, 0.28, 'Barbados'],
    [17.2, -88.5, 0.41, 'Belize'],
    [-16.3, -63.6, 12.2, 'Bolivia'],
    [-10.0, -55.0, 215, 'Brazil'],
    [60.0, -100.0, 39.5, 'Canada'],
    [-30.0, -71.5, 19.6, 'Chile'],
    [4.0, -73.0, 51.9, 'Colombia'],
    [9.7, -84.0, 5.2, 'Costa Rica'],
    [21.5, -78.0, 11.0, 'Cuba'],
    [15.4, -61.4, 0.07, 'Dominica'],
    [18.7, -70.2, 11.1, 'Dominican Republic'],
    [-1.5, -78.5, 18.0, 'Ecuador'],
    [13.7, -88.9, 6.3, 'El Salvador'],
    [12.1, -61.7, 0.12, 'Grenada'],
    [15.5, -90.2, 17.6, 'Guatemala'],
    [4.9, -58.9, 0.81, 'Guyana'],
    [18.9, -72.3, 11.4, 'Haiti'],
    [15.0, -86.5, 10.4, 'Honduras'],
    [18.1, -77.3, 2.8, 'Jamaica'],
    [23.6, -102.5, 130, 'Mexico'],
    [12.9, -85.2, 6.8, 'Nicaragua'],
    [8.5, -80.8, 4.4, 'Panama'],
    [-23.4, -58.4, 7.5, 'Paraguay'],
    [-10.0, -76.0, 34.4, 'Peru'],
    [17.4, -62.7, 0.05, 'Saint Kitts and Nevis'],
    [13.9, -60.9, 0.18, 'Saint Lucia'],
    [13.2, -61.2, 0.1, 'Saint Vincent'],
    [4.0, -56.0, 0.62, 'Suriname'],
    [10.7, -61.3, 1.5, 'Trinidad and Tobago'],
    [38.0, -97.0, 333, 'United States'],
    [-32.5, -55.8, 3.4, 'Uruguay'],
    [7.0, -66.0, 28.3, 'Venezuela'],
    // ===== Asia =====
    [33.9, 67.7, 41.1, 'Afghanistan'],
    [40.1, 45.0, 3.0, 'Armenia'],
    [40.4, 47.6, 10.1, 'Azerbaijan'],
    [26.0, 50.6, 1.5, 'Bahrain'],
    [23.7, 90.4, 170, 'Bangladesh'],
    [27.5, 90.4, 0.79, 'Bhutan'],
    [4.5, 114.7, 0.45, 'Brunei'],
    [12.6, 104.9, 17.0, 'Cambodia'],
    [35.0, 105.0, 1410, 'China'],
    [35.1, 33.4, 1.2, 'Cyprus'],
    [42.3, 43.4, 3.7, 'Georgia'],
    [21.0, 78.9, 1410, 'India'],
    [-2.5, 118.0, 275, 'Indonesia'],
    [32.4, 53.7, 89.2, 'Iran'],
    [33.2, 43.7, 44.5, 'Iraq'],
    [31.0, 35.0, 9.7, 'Israel'],
    [36.2, 138.3, 125, 'Japan'],
    [30.6, 36.2, 11.3, 'Jordan'],
    [48.0, 66.9, 19.6, 'Kazakhstan'],
    [29.3, 47.5, 4.5, 'Kuwait'],
    [41.2, 74.8, 6.8, 'Kyrgyzstan'],
    [19.9, 102.5, 7.5, 'Laos'],
    [33.9, 35.9, 5.5, 'Lebanon'],
    [4.2, 102.0, 33.6, 'Malaysia'],
    [3.2, 73.2, 0.52, 'Maldives'],
    [46.9, 103.8, 3.4, 'Mongolia'],
    [21.9, 95.9, 54.2, 'Myanmar'],
    [28.4, 84.1, 30.3, 'Nepal'],
    [40.0, 127.5, 26.1, 'North Korea'],
    [21.5, 55.9, 4.6, 'Oman'],
    [30.4, 69.3, 240, 'Pakistan'],
    [31.9, 35.2, 5.4, 'Palestine'],
    [12.9, 121.8, 115, 'Philippines'],
    [25.4, 51.2, 2.7, 'Qatar'],
    [23.9, 45.1, 36.4, 'Saudi Arabia'],
    [1.35, 103.8, 5.9, 'Singapore'],
    [35.9, 127.8, 51.7, 'South Korea'],
    [7.9, 80.8, 22.0, 'Sri Lanka'],
    [34.8, 38.9, 22.1, 'Syria'],
    [23.7, 121.0, 23.5, 'Taiwan'],
    [38.9, 71.3, 9.7, 'Tajikistan'],
    [15.9, 100.9, 71.6, 'Thailand'],
    [-8.9, 125.7, 1.3, 'Timor-Leste'],
    [38.9, 35.2, 86, 'Turkey'],
    [38.9, 59.6, 6.4, 'Turkmenistan'],
    [23.4, 53.8, 9.5, 'United Arab Emirates'],
    [41.4, 64.6, 35.0, 'Uzbekistan'],
    [16.0, 108.0, 100, 'Vietnam'],
    [15.6, 48.5, 33.7, 'Yemen'],
    // ===== Europe =====
    [41.2, 20.2, 2.8, 'Albania'],
    [42.5, 1.5, 0.08, 'Andorra'],
    [47.5, 14.6, 9.0, 'Austria'],
    [53.7, 27.9, 9.4, 'Belarus'],
    [50.5, 4.5, 11.7, 'Belgium'],
    [43.9, 17.7, 3.2, 'Bosnia and Herzegovina'],
    [42.7, 25.5, 6.8, 'Bulgaria'],
    [45.1, 15.2, 3.9, 'Croatia'],
    [49.8, 15.5, 10.5, 'Czech Republic'],
    [56.0, 9.5, 5.9, 'Denmark'],
    [58.6, 25.0, 1.4, 'Estonia'],
    [64.0, 26.0, 5.6, 'Finland'],
    [46.6, 2.2, 65, 'France'],
    [51.2, 10.4, 84, 'Germany'],
    [39.1, 21.8, 10.4, 'Greece'],
    [47.2, 19.5, 9.7, 'Hungary'],
    [64.9, -19.0, 0.37, 'Iceland'],
    [53.4, -8.2, 5.0, 'Ireland'],
    [42.5, 12.6, 59, 'Italy'],
    [42.6, 20.9, 1.9, 'Kosovo'],
    [56.9, 24.6, 1.9, 'Latvia'],
    [47.2, 9.5, 0.04, 'Liechtenstein'],
    [55.2, 23.9, 2.8, 'Lithuania'],
    [49.8, 6.1, 0.65, 'Luxembourg'],
    [35.9, 14.4, 0.55, 'Malta'],
    [47.4, 28.4, 2.6, 'Moldova'],
    [43.7, 7.4, 0.04, 'Monaco'],
    [42.7, 19.4, 0.6, 'Montenegro'],
    [52.1, 5.3, 17.6, 'Netherlands'],
    [41.6, 21.7, 2.0, 'North Macedonia'],
    [60.5, 8.5, 5.5, 'Norway'],
    [51.9, 19.1, 38, 'Poland'],
    [39.4, -8.2, 10.3, 'Portugal'],
    [45.9, 24.9, 19.0, 'Romania'],
    // Russia anchored on European Russia (where the bulk of the population
    // lives) — geographic centroid would land in empty Siberia.
    [55.0, 50.0, 144, 'Russia'],
    [43.9, 12.5, 0.03, 'San Marino'],
    [44.0, 21.0, 6.6, 'Serbia'],
    [48.7, 19.7, 5.5, 'Slovakia'],
    [46.1, 14.8, 2.1, 'Slovenia'],
    [40.5, -3.7, 47.5, 'Spain'],
    [60.1, 18.6, 10.6, 'Sweden'],
    [46.8, 8.2, 8.7, 'Switzerland'],
    [48.4, 31.2, 41, 'Ukraine'],
    [54.0, -2.0, 67.7, 'United Kingdom'],
    [41.9, 12.45, 0.001, 'Vatican City'],
    // ===== Oceania =====
    // Australia anchored on the south-east where most people live
    [-32.0, 145.0, 26.4, 'Australia'],
    [-17.7, 178.1, 0.93, 'Fiji'],
    [-3.4, 168.7, 0.13, 'Kiribati'],
    [7.1, 171.2, 0.04, 'Marshall Islands'],
    [6.9, 158.2, 0.11, 'Micronesia'],
    [-0.5, 166.9, 0.013, 'Nauru'],
    [-41.0, 174.0, 5.2, 'New Zealand'],
    [7.5, 134.6, 0.018, 'Palau'],
    [-6.3, 143.9, 10.3, 'Papua New Guinea'],
    [-13.8, -172.1, 0.22, 'Samoa'],
    [-9.6, 160.2, 0.7, 'Solomon Islands'],
    [-21.2, -175.2, 0.1, 'Tonga'],
    [-7.1, 178.1, 0.011, 'Tuvalu'],
    [-15.4, 166.9, 0.32, 'Vanuatu'],
  ];
  return rows.map(([lat, lng, pop]) => sample([lat, lng] as LatLng, pop));
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

// ---------------------------------------------------------------------------
// Live API fetchers
// ---------------------------------------------------------------------------

interface UsgsFeature {
  readonly geometry: { readonly coordinates: ReadonlyArray<number> };
  readonly properties: { readonly mag: number | null };
}
interface UsgsFeed {
  readonly features: ReadonlyArray<UsgsFeature>;
}

/**
 * Convert a USGS GeoJSON feed into HeatmapDataEntry[]. Earthquakes with
 * null/zero magnitude are skipped — they'd contribute nothing visible
 * and there are a fair few of them in the raw feeds. USGS sometimes
 * reports lng outside [-180, 180] for circumpacific events; we wrap them
 * defensively so the heatmap baker (which assumes the canonical range)
 * doesn't write past the texture's row.
 */
const usgsToEntries = (feed: UsgsFeed): Array<HeatmapDataEntry> => {
  const out: Array<HeatmapDataEntry> = [];
  for (const f of feed.features) {
    const c = f.geometry.coordinates;
    if (!c || c.length < 2) continue;
    let lng = c[0];
    const lat = c[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lat < -90 || lat > 90) continue;
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    const mag = f.properties.mag;
    if (typeof mag !== 'number' || !Number.isFinite(mag) || mag <= 0) continue;
    // We feed the raw magnitude as `value`. Combined with the `live-seismic`
    // preset's `log` normalize this gives a visually balanced spread —
    // background swarms and headline M7+ events both stay readable.
    out.push({ position: [lat, lng] as LatLng, value: mag });
  }
  return out;
};

const cache = new Map<string, Promise<ReadonlyArray<HeatmapDataEntry>>>();

const fetchUsgsFeed = async (
  url: string,
  cacheKey: string
): Promise<ReadonlyArray<HeatmapDataEntry>> => {
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USGS fetch failed: ${response.status}`);
    }
    const json = (await response.json()) as UsgsFeed;
    const entries = usgsToEntries(json);
    return entries;
  })();
  cache.set(cacheKey, promise);
  return promise;
};

/** Last 7 days of earthquakes, all magnitudes (~3-5k entries). */
export const fetchEarthquakesWeek = (): Promise<ReadonlyArray<HeatmapDataEntry>> =>
  fetchUsgsFeed(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    'usgs-week'
  );

/** Last 30 days of earthquakes, all magnitudes (~10-15k entries). */
export const fetchEarthquakesMonth = (): Promise<ReadonlyArray<HeatmapDataEntry>> =>
  fetchUsgsFeed(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
    'usgs-month'
  );

/**
 * Past 12 months of M2.5+ earthquakes via the FDSN query API (~30-50k
 * entries depending on seismic activity). This is the dataset that "covers
 * the whole globe" — every tectonic boundary glows, mid-Atlantic ridge,
 * Aleutians, Indonesia, Iran, Mediterranean.
 */
export const fetchEarthquakesYear = async (): Promise<ReadonlyArray<HeatmapDataEntry>> => {
  const cacheKey = 'usgs-year';
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const now = new Date();
  const start = new Date(now.getTime() - 365 * 86400 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  // FDSN caps results at 20000 per query; we use M2.5+ to stay under the
  // limit while still getting a rich global picture.
  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
    `&starttime=${fmt(start)}&endtime=${fmt(now)}&minmagnitude=2.5&limit=20000&orderby=time-asc`;
  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`USGS FDSN fetch failed: ${response.status}`);
    const json = (await response.json()) as UsgsFeed;
    return usgsToEntries(json);
  })();
  cache.set(cacheKey, promise);
  return promise;
};
