export interface CinematicCityNode {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly weight: number;
  readonly spread: number;
}

export const CINEMATIC_CITY_NODES: ReadonlyArray<CinematicCityNode> = [
  { id: 'new-york', lat: 40.7128, lng: -74.006, weight: 1.0, spread: 1.7 },
  { id: 'washington', lat: 38.9072, lng: -77.0369, weight: 0.66, spread: 0.95 },
  { id: 'atlanta', lat: 33.749, lng: -84.388, weight: 0.7, spread: 1.05 },
  { id: 'chicago', lat: 41.8781, lng: -87.6298, weight: 0.74, spread: 1.05 },
  { id: 'dallas', lat: 32.7767, lng: -96.797, weight: 0.68, spread: 1.05 },
  { id: 'los-angeles', lat: 34.0522, lng: -118.2437, weight: 0.92, spread: 1.9 },
  { id: 'san-francisco', lat: 37.7749, lng: -122.4194, weight: 0.7, spread: 1.0 },
  { id: 'seattle', lat: 47.6062, lng: -122.3321, weight: 0.62, spread: 0.9 },
  { id: 'mexico-city', lat: 19.4326, lng: -99.1332, weight: 0.92, spread: 1.5 },
  { id: 'bogota', lat: 4.711, lng: -74.0721, weight: 0.72, spread: 1.05 },
  { id: 'lima', lat: -12.0464, lng: -77.0428, weight: 0.68, spread: 1.0 },
  { id: 'santiago', lat: -33.4489, lng: -70.6693, weight: 0.66, spread: 0.95 },
  { id: 'sao-paulo', lat: -23.5505, lng: -46.6333, weight: 0.94, spread: 1.7 },
  { id: 'buenos-aires', lat: -34.6037, lng: -58.3816, weight: 0.82, spread: 1.4 },
  { id: 'london', lat: 51.5072, lng: -0.1276, weight: 0.96, spread: 1.2 },
  { id: 'paris', lat: 48.8566, lng: 2.3522, weight: 0.9, spread: 1.1 },
  { id: 'berlin', lat: 52.52, lng: 13.405, weight: 0.78, spread: 1.0 },
  { id: 'madrid', lat: 40.4168, lng: -3.7038, weight: 0.74, spread: 1.0 },
  { id: 'rome', lat: 41.9028, lng: 12.4964, weight: 0.72, spread: 0.95 },
  { id: 'cairo', lat: 30.0444, lng: 31.2357, weight: 0.82, spread: 1.3 },
  { id: 'lagos', lat: 6.5244, lng: 3.3792, weight: 0.82, spread: 1.4 },
  { id: 'johannesburg', lat: -26.2041, lng: 28.0473, weight: 0.68, spread: 1.2 },
  { id: 'istanbul', lat: 41.0082, lng: 28.9784, weight: 0.84, spread: 1.1 },
  { id: 'moscow', lat: 55.7558, lng: 37.6173, weight: 0.8, spread: 1.2 },
  { id: 'dubai', lat: 25.2048, lng: 55.2708, weight: 0.74, spread: 0.9 },
  { id: 'mumbai', lat: 19.076, lng: 72.8777, weight: 0.92, spread: 1.35 },
  { id: 'delhi', lat: 28.6139, lng: 77.209, weight: 0.98, spread: 1.45 },
  { id: 'bangkok', lat: 13.7563, lng: 100.5018, weight: 0.76, spread: 1.1 },
  { id: 'singapore', lat: 1.3521, lng: 103.8198, weight: 0.7, spread: 0.75 },
  { id: 'jakarta', lat: -6.2088, lng: 106.8456, weight: 0.86, spread: 1.25 },
  { id: 'hong-kong', lat: 22.3193, lng: 114.1694, weight: 0.84, spread: 0.9 },
  { id: 'shanghai', lat: 31.2304, lng: 121.4737, weight: 0.96, spread: 1.35 },
  { id: 'beijing', lat: 39.9042, lng: 116.4074, weight: 0.9, spread: 1.25 },
  { id: 'seoul', lat: 37.5665, lng: 126.978, weight: 0.86, spread: 1.0 },
  { id: 'tokyo', lat: 35.6762, lng: 139.6503, weight: 1.0, spread: 1.35 },
  { id: 'osaka', lat: 34.6937, lng: 135.5023, weight: 0.78, spread: 0.9 },
  { id: 'sydney', lat: -33.8688, lng: 151.2093, weight: 0.72, spread: 1.0 },
  { id: 'melbourne', lat: -37.8136, lng: 144.9631, weight: 0.68, spread: 0.95 },
  { id: 'miami', lat: 25.7617, lng: -80.1918, weight: 0.64, spread: 0.9 },
  { id: 'toronto', lat: 43.6532, lng: -79.3832, weight: 0.72, spread: 1.0 },
];

export const hash01 = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
