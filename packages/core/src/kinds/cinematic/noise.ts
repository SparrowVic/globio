// Cinematic kind — CPU-side deterministic noise.
//
// Used by `atlas.ts` to bake the terrain atlas (height / moisture / ridge
// mask) once, ahead of time, on the CPU. Everything here is a pure function
// of its numeric inputs — no `Math.random`, no mutable module state — so the
// same `(x, y, seed)` always produces the same value across runs, machines
// and rebuilds. This mirrors the GLSL noise chunk in `math.ts`
// (`GLSL_NOISE`) conceptually, but is a separate implementation: the GPU
// version runs per-fragment every frame, this one runs once per atlas pixel
// during a build step.

/**
 * Integer hash → [0,1). Mixes the lattice coordinates and seed with large
 * odd multipliers and xorshifts to decorrelate low bits (same family as
 * "Squirrel3"-style integer hashes). Deterministic and allocation-free —
 * safe to call millions of times in a tight loop.
 */
export const hash2D = (ix: number, iy: number, seed = 0): number => {
  let h = ix * 374761393 + iy * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
};

/** Quintic ease (Perlin's improved fade curve) — smoother than cubic at the lattice boundaries. */
const quintic = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Smooth value noise: bilinear blend of the four hashed lattice corners
 * around `(x, y)`, eased with the quintic curve so the field has continuous
 * first and second derivatives (no grid-aligned creases). Returns [0,1].
 */
export const valueNoise2D = (x: number, y: number, seed = 0): number => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = quintic(x - x0);
  const ty = quintic(y - y0);

  const a = hash2D(x0, y0, seed);
  const b = hash2D(x1, y0, seed);
  const c = hash2D(x0, y1, seed);
  const d = hash2D(x1, y1, seed);

  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
};

/**
 * Fractal Brownian motion: sum of `octaves` value-noise layers at doubling
 * frequency and halving amplitude, normalised by the amplitude sum so the
 * result stays in [0,1] regardless of octave count. Each octave reseeds
 * (`seed + i * 101`) so successive octaves are decorrelated rather than the
 * same lattice resampled at a different scale.
 */
export const fbm2D = (x: number, y: number, octaves: number, seed = 0): number => {
  let sum = 0;
  let amplitude = 0.5;
  let ampSum = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(fx, fy, seed + i * 101) * amplitude;
    ampSum += amplitude;
    fx *= 2;
    fy *= 2;
    amplitude *= 0.5;
  }
  return ampSum > 0 ? sum / ampSum : 0;
};

/**
 * Ridged fbm: each octave folds value noise around its midpoint
 * (`1 - |2n - 1|`) so valleys stay smooth while ridges turn sharp and
 * linear — the standard trick for mountain-range-looking fields. Normalised
 * to [0,1] the same way as `fbm2D`.
 */
export const ridged2D = (x: number, y: number, octaves: number, seed = 0): number => {
  let sum = 0;
  let amplitude = 0.5;
  let ampSum = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise2D(fx, fy, seed + i * 101);
    const ridged = 1 - Math.abs(2 * n - 1);
    sum += ridged * amplitude;
    ampSum += amplitude;
    fx *= 2;
    fy *= 2;
    amplitude *= 0.5;
  }
  return ampSum > 0 ? sum / ampSum : 0;
};
