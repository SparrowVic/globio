/**
 * Pure helpers powering the wireframe v2 extras (active country ring,
 * pole-to-pole streams). Extracted so they can be unit-tested without a
 * GL context — the layers in this folder import + use them at runtime.
 */

/**
 * World-space radius of the geodesic ring drawn around an active country.
 * The country's angular radius (half its angular extent on the sphere) is
 * scaled by `padding`, clamped to ≤ π/2, and projected to a planar chord
 * radius via `globeRadius * sin(θ)`. The ring is positioned so its center
 * lies on the surface above the country's centroid, so a planar radius
 * gives the right visual fit.
 */
export const ringRadiusForExtent = (
  extent: number,
  padding: number,
  globeRadius: number
): number => {
  if (extent <= 0 || globeRadius <= 0) return 0;
  const safePadding = padding > 0 ? padding : 1;
  const angular = Math.min(Math.PI / 2, (extent / 2) * safePadding);
  return globeRadius * Math.sin(angular);
};

/**
 * Step a single particle's latitude one frame. Particles travel southward
 * (lat decreases). When they fall below `despawnLat`, they respawn at
 * `spawnLat`. Latitudes above `spawnLat` are clamped to the spawn band so
 * stale state doesn't drift the geometry.
 */
export const stepParticleLat = (
  currentLat: number,
  speed: number,
  delta: number,
  spawnLat: number,
  despawnLat: number
): number => {
  if (currentLat > spawnLat) return spawnLat;
  const next = currentLat - speed * delta;
  if (next < despawnLat) return spawnLat;
  return next;
};
