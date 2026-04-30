import type { HeatmapKernel } from '../types';

/**
 * Kernel evaluated against a squared-chord ratio `t² ∈ [0, 1]` (0 at the
 * sample centre, 1 at the radius cutoff). Avoids `acos` in the hot
 * paint loop — both the cutoff test and the kernel weight can be
 * expressed in terms of cosines / chord-squared values, which the
 * inner loop already has cheaply available.
 *
 * Gaussian uses `exp(-4 t²)` so the kernel falls to ~0.018 at the cutoff,
 * matching the previous angular-distance implementation closely. Other
 * kernels use the same shape parametrisation as before, with
 * `t = sqrt(t²)` recovered only for the dome variant.
 */
export const applyKernelChord = (kernel: HeatmapKernel, t2: number): number => {
  switch (kernel) {
    case 'gaussian':
      return Math.exp(-4 * t2);
    case 'epanechnikov':
      return Math.max(0, 1 - t2);
    case 'quartic': {
      const k = 1 - t2;
      return k > 0 ? k * k : 0;
    }
    case 'dome':
      return domeWeight(Math.sqrt(Math.max(0, t2)), {
        centerArea: 0.5,
        shoulderHeight: 0.52,
        edgeSteepness: 2.2,
      });
    case 'uniform':
      return t2 <= 1 ? 1 : 0;
  }
};

/**
 * Country-dome weight curve. Two regions:
 *  - **Crown** (`t ≤ √centerArea`): smoothstep'ed band that descends from
 *    `1.0` at the deepest interior point down to `shoulderHeight` at the
 *    crown / wall transition.
 *  - **Wall** (`t > √centerArea`): smoothstep'ed wall from `shoulderHeight`
 *    down to `0` at the polygon boundary, with `edgeSteepness` controlling
 *    how cliff-like the falloff becomes near the edge (1 = linear ramp,
 *    4+ = sharp cliff just inside the boundary).
 *
 * `t` is a normalised distance in [0, 1] from the dome centre to the
 * boundary; the country dome painter constructs it from the polygon's
 * distance-to-edge field and (optionally) blends in a ray-cast t for
 * partial-rounding looks.
 */
export const domeWeight = (
  t: number,
  config: { readonly centerArea: number; readonly shoulderHeight: number; readonly edgeSteepness: number }
): number => {
  if (t >= 1) return 0;
  const crownRadius = Math.sqrt(config.centerArea);
  if (t <= crownRadius) {
    const q = t / Math.max(1e-6, crownRadius);
    const rounded = q * q * (3 - 2 * q);
    return 1 - (1 - config.shoulderHeight) * rounded;
  }
  const q = (t - crownRadius) / Math.max(1e-6, 1 - crownRadius);
  const wall = 1 - q * q * (3 - 2 * q);
  return config.shoulderHeight * Math.pow(Math.max(0, wall), config.edgeSteepness);
};

/**
 * Encode the curve enum to an int the GLSL shader can branch on. Kept
 * here because both the bake logic and the shader need the same mapping;
 * using string→int via a single source avoids drift between TS and GLSL.
 */
export const encodeCurve = (curve: 'linear' | 'smoothstep' | 'cubic' | 'sqrt'): number => {
  switch (curve) {
    case 'linear':
      return 0;
    case 'smoothstep':
      return 1;
    case 'cubic':
      return 2;
    case 'sqrt':
      return 3;
  }
};
