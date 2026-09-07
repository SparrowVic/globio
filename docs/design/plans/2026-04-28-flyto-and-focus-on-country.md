# `flyTo` + `focusOnCountry` Implementation Plan

**Goal:** Add programmatic camera animation — `globe.flyTo(latLng, distance?, options?)` and `globe.focusOnCountry(id, options?)` — so applications (and the demo) can smoothly fly the camera to any lat/lng or auto-frame any country.

**Architecture:** Tween infrastructure inside `GlobeControls` tracks an active animation `{ start, end, elapsed, duration, easing }`. Each frame the tween advances and lerps `spherical` between start and end via the easing function; on completion, control hands back to the smooth-zoom system. Public `flyTo(LatLng, distance, FlyToOptions)` wraps lat/lng → world point → `Spherical` and starts the tween. `focusOnCountry` looks up the country's lat/lng bounding box, computes a fitting camera distance from globe FOV + bbox angular size, then delegates to `flyTo`.

**Tech Stack:** TypeScript strict, Three.js (`Spherical`, `Vector3`, `PerspectiveCamera`), Vitest.

---

## Why this scope

This plan delivers:

- **`flyTo(latLng, distance?, options?)`** — generic programmatic camera animation
- **`focusOnCountry(id, options?)`** — auto-frame a country
- **Easing primitives** + **bbox utilities** as standalone testable modules

It deliberately defers:
- **Story / narrative engine** (FEATURES.md §4.8) — that builds on this; separate plan
- **Visual flight indicator / loading state** during long flyTo — UI polish, separate plan
- **Path-based camera (Bezier curves)** — `[v2+]` future
- **Camera collision avoidance / auto-pause auto-rotate during flight** — minor polish, can be added piecewise

Cancellation rules: any user-initiated drag or wheel cancels an active tween (modern UX expectation — user always wins).

---

## File structure

**New files:**

- `packages/core/src/utils/easing.ts` — pure `EasingFunction` definitions (linear, easeOutCubic, easeInOutCubic)
- `packages/core/src/utils/country-bounds.ts` — `LatLngBounds`, `computeBounds(rings)`, `boundsCenter(b)`, `angularExtent(b)`
- `packages/core/src/utils/__tests__/easing.test.ts`
- `packages/core/src/utils/__tests__/country-bounds.test.ts`

**Modified files:**

- `packages/core/src/types.ts` — add `EasingFunction`, `FlyToOptions`, `FocusOptions`; extend `GlobeInstance` with `flyTo`/`focusOnCountry` methods
- `packages/core/src/interaction/controls.ts` — add tween state, `flyTo(latLng, distance?, options?)` method, cancel-on-input
- `packages/core/src/renderer/countries-picking-layer.ts` — pre-compute and expose `getCountryBounds(id)`
- `packages/core/src/globe.ts` — wire `flyTo` and `focusOnCountry` on the public instance
- `packages/core/src/index.ts` — export new types
- `examples/vanilla-demo/index.html` — HUD: "Fly home" button, "Click country to focus" toggle
- `examples/vanilla-demo/src/main.ts` — countryClick handler calls `focusOnCountry`
- `FEATURES.md` — flip status flags

---

## Task 1: Easing utility (TDD)

**Files:**
- Create: `packages/core/src/utils/easing.ts`
- Create: `packages/core/src/utils/__tests__/easing.test.ts`

- [ ] **Step 1: Write failing tests**

Path: `packages/core/src/utils/__tests__/easing.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { linear, easeOutCubic, easeInOutCubic } from '../easing';

describe('easing functions', () => {
  it('linear is identity at 0, 0.5, 1', () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
  });

  it('easeOutCubic starts fast, slows down', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 6);
    expect(easeOutCubic(1)).toBeCloseTo(1, 6);
    // mid-progress should already be > linear midpoint
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('easeInOutCubic is symmetric around t=0.5', () => {
    expect(easeInOutCubic(0)).toBeCloseTo(0, 6);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    expect(easeInOutCubic(1)).toBeCloseTo(1, 6);
    // ease-in slope at t=0 is 0 (slow start); same at t=1
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm --filter @your-globe/core test
```

Expected: 3 new tests fail with module-not-found.

- [ ] **Step 3: Implement easing module**

Path: `packages/core/src/utils/easing.ts`

```ts
import type { EasingFunction } from '../types';

/** Identity easing — constant velocity. */
export const linear: EasingFunction = (t) => t;

/** Fast start, slow finish. Good for "throw" feeling. */
export const easeOutCubic: EasingFunction = (t) => {
  const u = 1 - t;
  return 1 - u * u * u;
};

/**
 * Slow start, fast middle, slow finish — the most natural-feeling default for
 * camera flights between two settled positions.
 */
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
```

The `EasingFunction` type is defined in Task 5 (types.ts). Importing from `../types` is fine — it'll exist by the time the build reads it; tests reference functions from this module which import the type.

- [ ] **Step 4: Add `EasingFunction` to types now (small forward-pull from Task 5)**

In `packages/core/src/types.ts`, add at the end of the file:

```ts
/** Easing function — receives normalized progress t∈[0,1], returns eased t∈[0,1]. */
export type EasingFunction = (t: number) => number;
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm --filter @your-globe/core test
```

Expected: all 3 new tests pass alongside existing 29.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/utils/easing.ts packages/core/src/utils/__tests__/easing.test.ts packages/core/src/types.ts
git commit -m "feat(core): easing primitives (linear, easeOutCubic, easeInOutCubic)"
```

---

## Task 2: Country bounds utility (TDD)

**Files:**
- Create: `packages/core/src/utils/country-bounds.ts`
- Create: `packages/core/src/utils/__tests__/country-bounds.test.ts`

The bounds helper takes the same `coordinates` shape used elsewhere (`ReadonlyArray<ReadonlyArray<readonly [number, number]>>` — array of rings, each ring is `[lng, lat]` points) and returns a min/max lat-lng box. We also need a center lat/lng and an angular-extent getter (radians) so the focus-distance math can use it.

- [ ] **Step 1: Write failing tests**

Path: `packages/core/src/utils/__tests__/country-bounds.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeBounds, boundsCenter, angularExtent } from '../country-bounds';

const square: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [10, 0],
  [10, 20],
  [0, 20],
  [0, 0],
];

const offsetTriangle: ReadonlyArray<readonly [number, number]> = [
  [-50, 30],
  [-40, 30],
  [-45, 35],
  [-50, 30],
];

describe('computeBounds', () => {
  it('computes bbox for a single ring', () => {
    const b = computeBounds([square]);
    expect(b.minLng).toBe(0);
    expect(b.maxLng).toBe(10);
    expect(b.minLat).toBe(0);
    expect(b.maxLat).toBe(20);
  });

  it('unions bboxes across multiple rings', () => {
    const b = computeBounds([square, offsetTriangle]);
    expect(b.minLng).toBe(-50);
    expect(b.maxLng).toBe(10);
    expect(b.minLat).toBe(0);
    expect(b.maxLat).toBe(35);
  });

  it('returns NaN-free empty-bounds sentinel for empty input', () => {
    const b = computeBounds([]);
    expect(Number.isFinite(b.minLat)).toBe(true);
    expect(Number.isFinite(b.maxLat)).toBe(true);
  });
});

describe('boundsCenter', () => {
  it('returns midpoint as [lat, lng]', () => {
    const b = computeBounds([square]);
    const [lat, lng] = boundsCenter(b);
    expect(lat).toBe(10);
    expect(lng).toBe(5);
  });
});

describe('angularExtent', () => {
  it('returns max of (lat-extent, lng-extent) in radians', () => {
    const b = computeBounds([square]); // 10° lng × 20° lat → max=20° in rad
    const ext = angularExtent(b);
    expect(ext).toBeCloseTo((20 * Math.PI) / 180, 6);
  });

  it('returns 0 for degenerate (zero-area) bounds', () => {
    const point: ReadonlyArray<readonly [number, number]> = [[5, 5], [5, 5]];
    const b = computeBounds([point]);
    expect(angularExtent(b)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm --filter @your-globe/core test
```

Expected: 6 new tests fail.

- [ ] **Step 3: Implement bounds module**

Path: `packages/core/src/utils/country-bounds.ts`

```ts
export interface LatLngBounds {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLng: number;
  readonly maxLng: number;
}

const EMPTY: LatLngBounds = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };

/**
 * Compute the lat/lng bounding box that contains all rings.
 * Each ring is an array of `[lng, lat]` points (GeoJSON convention).
 */
export const computeBounds = (
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>
): LatLngBounds => {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let any = false;

  for (const ring of rings) {
    for (const point of ring) {
      const lng = point[0];
      const lat = point[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      any = true;
    }
  }

  if (!any) return EMPTY;
  return { minLat, maxLat, minLng, maxLng };
};

/** Center of a bounding box as `[lat, lng]`. */
export const boundsCenter = (b: LatLngBounds): readonly [number, number] => [
  (b.minLat + b.maxLat) / 2,
  (b.minLng + b.maxLng) / 2,
];

/**
 * Maximum angular extent (in radians) — the larger of lat-extent and
 * lng-extent. Used to compute a fitting camera distance for `focusOnCountry`.
 */
export const angularExtent = (b: LatLngBounds): number => {
  const latExt = ((b.maxLat - b.minLat) * Math.PI) / 180;
  const lngExt = ((b.maxLng - b.minLng) * Math.PI) / 180;
  return Math.max(latExt, lngExt);
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm --filter @your-globe/core test
```

Expected: all 38 tests pass (29 existing + 3 easing + 6 bounds).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/utils/country-bounds.ts packages/core/src/utils/__tests__/country-bounds.test.ts
git commit -m "feat(core): country bounds + angular extent utilities"
```

---

## Task 3: Add types `FlyToOptions`, `FocusOptions`, instance methods to `GlobeInstance`

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Add option types**

In `packages/core/src/types.ts`, after the existing `EasingFunction` type added in Task 1, add:

```ts
export interface FlyToOptions {
  /** Animation duration in milliseconds. Default 1500. */
  readonly duration?: number;
  /** Easing function. Default `easeInOutCubic`. */
  readonly easing?: EasingFunction;
}

export interface FocusOptions extends FlyToOptions {
  /**
   * Fraction of the viewport to leave as padding around the focused country, 0..0.5.
   * 0.15 means ~15% of the viewport edge is empty space. Default 0.15.
   */
  readonly padding?: number;
}
```

- [ ] **Step 2: Extend `GlobeInstance` with new methods**

In the `GlobeInstance` interface, add (after the existing `setRotation` line):

```ts
  readonly flyTo: (position: LatLng, distance?: number, options?: FlyToOptions) => void;
  readonly focusOnCountry: (id: string, options?: FocusOptions) => void;
```

The `setRotation` method already exists; just append the two new readonly methods to the interface body.

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @your-globe/core typecheck
```

Expected: zero errors. (`globe.ts` will fail to satisfy the interface yet — that's fixed in Task 6. `pnpm typecheck` will fail until then; for this task only run it on `packages/core/src/types.ts` indirectly by relying on subsequent tasks. We accept the temporary type error and move on.)

If you prefer green checks at every commit: skip the typecheck verification for this task and run it at the end of Task 6. The plan's intent is that types lead.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): types for flyTo + focusOnCountry"
```

---

## Task 4: Tween infrastructure + `flyTo` in `GlobeControls`

**Files:**
- Modify: `packages/core/src/interaction/controls.ts`

- [ ] **Step 1: Add tween state**

In `packages/core/src/interaction/controls.ts`, add the import at the top:

```ts
import type { EasingFunction, FlyToOptions, LatLng, ZoomConfig, ZoomMode } from '../types';
import { easeInOutCubic } from '../utils/easing';
import { latLngToVector3 } from '../utils/coordinates';
```

(Replace the existing `import type { ZoomConfig, ZoomMode } from '../types';` and add the latLngToVector3 import alongside `GLOBE_RADIUS`.)

Add a private field on the class:

```ts
private activeTween: {
  readonly startSpherical: Spherical;
  readonly endSpherical: Spherical;
  elapsed: number;
  readonly duration: number;
  readonly easing: EasingFunction;
} | null = null;
```

- [ ] **Step 2: Implement `flyTo` and `cancelTween` methods**

Add these public methods on `GlobeControls`:

```ts
public flyTo(position: LatLng, distance?: number, options: FlyToOptions = {}): void {
  const radius = clamp(
    distance ?? this.spherical.radius,
    this.minDistance,
    this.maxDistance
  );
  const targetVec = latLngToVector3(position, radius);
  const endSpherical = new Spherical().setFromVector3(targetVec);

  this.activeTween = {
    startSpherical: this.spherical.clone(),
    endSpherical,
    elapsed: 0,
    duration: options.duration ?? 1500,
    easing: options.easing ?? easeInOutCubic,
  };
  // Sync target so the post-tween smooth-lerp lands on the same place.
  this.targetSpherical.copy(endSpherical);
}

public cancelTween(): void {
  if (this.activeTween) {
    this.activeTween = null;
    this.targetSpherical.copy(this.spherical);
  }
}
```

- [ ] **Step 3: Integrate tween into `update()`**

Replace the existing `update` method body. The tween, when active, takes over from the smooth-zoom lerp:

```ts
public update(deltaSeconds: number): void {
  // While a tween is active, it owns the camera. Auto-rotate and smooth-zoom are paused.
  if (this.activeTween) {
    this.activeTween.elapsed += deltaSeconds * 1000;
    const t = Math.min(1, this.activeTween.elapsed / this.activeTween.duration);
    const eased = this.activeTween.easing(t);
    const start = this.activeTween.startSpherical;
    const end = this.activeTween.endSpherical;
    this.spherical.radius = lerp(start.radius, end.radius, eased);
    this.spherical.theta = lerpAngle(start.theta, end.theta, eased);
    this.spherical.phi = lerp(start.phi, end.phi, eased);
    if (t >= 1) this.activeTween = null;

    this.spherical.radius = clamp(this.spherical.radius, this.minDistance, this.maxDistance);
    this.spherical.phi = clamp(this.spherical.phi, 0.05, Math.PI - 0.05);
    this.options.camera.position.setFromSpherical(this.spherical);
    this.options.camera.lookAt(0, 0, 0);
    return;
  }

  // Auto-rotate updates BOTH current and target so the smooth lerp doesn't fight it.
  if (this.autoRotate && !this.isPointerDown) {
    const delta = this.autoRotateSpeed * deltaSeconds * 0.2;
    this.spherical.theta -= delta;
    this.targetSpherical.theta -= delta;
  }

  if (this.smoothZoom) {
    const t = 1 - Math.exp(-deltaSeconds * SMOOTH_RATE);
    this.spherical.radius = lerp(this.spherical.radius, this.targetSpherical.radius, t);
    this.spherical.theta = lerpAngle(this.spherical.theta, this.targetSpherical.theta, t);
    this.spherical.phi = lerp(this.spherical.phi, this.targetSpherical.phi, t);
  } else {
    this.spherical.copy(this.targetSpherical);
  }

  this.spherical.radius = clamp(this.spherical.radius, this.minDistance, this.maxDistance);
  this.spherical.phi = clamp(this.spherical.phi, 0.05, Math.PI - 0.05);
  this.options.camera.position.setFromSpherical(this.spherical);
  this.options.camera.lookAt(0, 0, 0);
}
```

- [ ] **Step 4: Cancel tween on user input**

In `onPointerDown` and `onWheel`, call `this.cancelTween()` at the very top of the handler (before the existing logic). Updated `onPointerDown`:

```ts
private onPointerDown = (event: PointerEvent): void => {
  this.cancelTween();
  this.isPointerDown = true;
  this.previousPointer.set(event.clientX, event.clientY);
  this.options.domElement.setPointerCapture(event.pointerId);
};
```

Updated `onWheel` (only the very first line is added; rest of the body is unchanged):

```ts
private onWheel = (event: WheelEvent): void => {
  this.cancelTween();
  event.preventDefault();
  // ... rest of the existing wheel logic unchanged
};
```

- [ ] **Step 5: Build to verify the controls module compiles**

```bash
pnpm --filter @your-globe/core build
```

Expected: clean ESM/CJS/DTS build. (DTS may temporarily complain about `globe.ts` not satisfying the new `GlobeInstance` interface from Task 3 — that's fixed in Task 6.)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/interaction/controls.ts
git commit -m "feat(core): camera tween infrastructure + flyTo in GlobeControls"
```

---

## Task 5: Expose country bounds from `CountriesPickingLayer`

**Files:**
- Modify: `packages/core/src/renderer/countries-picking-layer.ts`

- [ ] **Step 1: Pre-compute bounds during build, expose getter**

In `countries-picking-layer.ts`:

a. Add the import:

```ts
import { computeBounds, type LatLngBounds } from '../utils/country-bounds';
```

b. Add a private field next to `countriesById`:

```ts
private readonly boundsById = new Map<string, LatLngBounds>();
```

c. Inside `buildMeshes`, after registering the country into `countriesById` and before the ring loop, compute bounds once for the whole feature:

```ts
private buildMeshes(features: ReadonlyArray<CountryFeature>, radius: number): void {
  for (const feature of features) {
    this.countriesById.set(feature.id, { id: feature.id, name: feature.name });
    this.boundsById.set(feature.id, computeBounds(feature.coordinates));
    for (const ring of feature.coordinates) {
      const tri = triangulateRing(ring, radius);
      if (!tri) continue;
      // ... existing mesh-building code unchanged
    }
  }
}
```

d. Add the public getter:

```ts
public getCountryBounds(id: string): LatLngBounds | null {
  return this.boundsById.get(id) ?? null;
}
```

e. In `dispose`, clear the bounds map alongside `countriesById`:

```ts
public dispose(): void {
  this.geometries.forEach((g) => g.dispose());
  this.material.dispose();
  this.group.clear();
  this.countriesById.clear();
  this.boundsById.clear();
}
```

- [ ] **Step 2: Build + typecheck**

```bash
pnpm --filter @your-globe/core build
pnpm --filter @your-globe/core typecheck
```

Expected: clean. (Still expect the `globe.ts` interface gap from Task 3.)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/renderer/countries-picking-layer.ts
git commit -m "feat(core): expose per-country bounds from picking layer"
```

---

## Task 6: Wire `flyTo` + `focusOnCountry` on the `GlobeInstance`

**Files:**
- Modify: `packages/core/src/globe.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add focus-distance helper and wire instance methods**

In `packages/core/src/globe.ts`:

a. Add imports near the top:

```ts
import { angularExtent, boundsCenter } from './utils/country-bounds';
import type { FlyToOptions, FocusOptions } from './types';
```

b. Add a small pure helper at the top of the file (after the `DEFAULT_COUNTRIES` constant, before `interface InternalState`):

```ts
/**
 * Compute the camera radius such that the angular extent fits inside the
 * limiting field-of-view dimension with the given padding. Uses the exact
 * geometry: tan(theta_screen) = R_g * sin(g/2) / (R - R_g * cos(g/2)).
 */
const computeFocusDistance = (
  bounds: import('./utils/country-bounds').LatLngBounds,
  camera: import('three').PerspectiveCamera,
  padding: number,
  globeRadius: number,
  fallbackRadius: number
): number => {
  const gamma = angularExtent(bounds);
  if (gamma <= 0) return fallbackRadius;
  const fovV = (camera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
  const limitingFov = Math.min(fovV, fovH);
  const targetScreen = ((1 - 2 * padding) * limitingFov) / 2;
  const tanT = Math.tan(targetScreen);
  if (tanT <= 0) return fallbackRadius;
  return (globeRadius * Math.sin(gamma / 2)) / tanT + globeRadius * Math.cos(gamma / 2);
};
```

c. Add `GLOBE_RADIUS` to the existing `coordinates` import:

```ts
import { GLOBE_RADIUS, vector3ToLatLng } from './utils/coordinates';
```

(The file already imports `vector3ToLatLng`; just include `GLOBE_RADIUS` in the same import.)

d. Inside the returned `instance: GlobeInstance` object, add the two new methods alongside `setRotation`:

```ts
const instance: GlobeInstance = {
  // ... existing methods unchanged ...
  setRotation: (_position: LatLng) => {
    // existing stub, unchanged
  },
  flyTo: (position, distance, options) => {
    controls.flyTo(position, distance, options ?? {});
  },
  focusOnCountry: (id, options) => {
    const layer = state.countriesPickingLayer;
    if (!layer) return;
    const bounds = layer.getCountryBounds(id);
    if (!bounds) return;
    const padding = options?.padding ?? 0.15;
    const distance = computeFocusDistance(
      bounds,
      scene.camera,
      padding,
      GLOBE_RADIUS,
      scene.camera.position.length()
    );
    const center = boundsCenter(bounds);
    controls.flyTo(center, distance, options ?? {});
  },
  // ... rest of methods (setMarkers, addMarker, etc.) unchanged
};
```

- [ ] **Step 2: Re-export new types from public surface**

In `packages/core/src/index.ts`, add to the type re-export block:

```ts
} from './types';
```

becomes:

```ts
  ZoomConfig,
  ZoomMode,
  EasingFunction,
  FlyToOptions,
  FocusOptions,
} from './types';
```

(Insert the three new type names alphabetically or at the end — doesn't matter semantically.)

Also export the easing functions for users who want named easings:

```ts
export { linear, easeOutCubic, easeInOutCubic } from './utils/easing';
```

(Add at the bottom of the file.)

- [ ] **Step 3: Build + typecheck**

```bash
pnpm --filter @your-globe/core build
pnpm --filter @your-globe/core typecheck
```

Expected: all clean now.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/globe.ts packages/core/src/index.ts
git commit -m "feat(core): expose flyTo + focusOnCountry on GlobeInstance"
```

---

## Task 7: Demo — click country to focus + "Fly home" button

**Files:**
- Modify: `examples/vanilla-demo/index.html`
- Modify: `examples/vanilla-demo/src/main.ts`

- [ ] **Step 1: Add new HUD section**

In `examples/vanilla-demo/index.html`, after the Interactions section, add a new "Navigation" section:

```html
<div class="hud-section">
  <div class="hud-section-title">Navigation</div>
  <div class="hud-row">
    <input type="checkbox" id="toggle-click-to-focus" checked />
    <label for="toggle-click-to-focus">Click country to focus</label>
  </div>
  <div class="hud-row">
    <button id="btn-fly-home" style="padding: 4px 8px; cursor: pointer;">
      Fly home
    </button>
  </div>
</div>
```

- [ ] **Step 2: Wire the new controls in `main.ts`**

In `examples/vanilla-demo/src/main.ts`:

a. Add the DOM refs near the other `$` queries:

```ts
const $clickToFocus = document.getElementById('toggle-click-to-focus') as HTMLInputElement;
const $flyHome = document.getElementById('btn-fly-home') as HTMLButtonElement;
```

b. Extend `settings`:

```ts
const settings = {
  themeName: 'outline-dark' as ThemePresetName,
  autoRotateEnabled: true,
  autoRotateSpeed: 0.4,
  hoverHudEnabled: true,
  zoomMode: 'attract' as ZoomMode,
  zoomStrength: 1,
  smoothZoom: true,
  clickToFocus: true,
};
```

c. Update the `countryClick` handler in `buildGlobe` to call `focusOnCountry` when enabled:

```ts
globe.on('countryClick', ({ country }) => {
  setStatus(`Klik: ${country.name} (${country.id})`);
  if (settings.clickToFocus) {
    globe?.focusOnCountry(country.id);
  }
});
```

d. Add the toggle + button handlers (place them alongside the other event listeners at the bottom of the file, before `buildGlobe(settings.themeName)`):

```ts
$clickToFocus.addEventListener('change', () => {
  settings.clickToFocus = $clickToFocus.checked;
});

$flyHome.addEventListener('click', () => {
  globe?.flyTo([20, 0], 3, { duration: 1500 });
});
```

- [ ] **Step 3: Rebuild core (demo consumes `dist/`)**

```bash
pnpm --filter @your-globe/core build
```

- [ ] **Step 4: Manual visual verification**

Open http://localhost:5173/. Verify:

- Click any country → camera flies smoothly to it over ~1.5s, framing the country (~70% of viewport)
- "Fly home" button → camera returns to a neutral view (lat=20, lng=0, distance=3)
- Uncheck "Click country to focus" → click no longer flies; just shows in HUD
- Drag during a flight cancels it instantly (camera lands on cursor's position)
- Wheel scroll during a flight cancels it the same way
- Switch themes mid-flight: globe rebuilds, no leftover tween state

- [ ] **Step 5: Commit**

```bash
git add examples/vanilla-demo/index.html examples/vanilla-demo/src/main.ts
git commit -m "feat(demo): click-to-focus + Fly home button"
```

---

## Task 8: FEATURES.md update + final verification

**Files:**
- Modify: `FEATURES.md`

- [ ] **Step 1: Flip status flags**

In `FEATURES.md` find:

```
- **Smooth `flyTo(lat, lng, zoom)`** `[v1·GLOBAL·M]` — easing, duration, callback, anulowanie.
- **`focusOnCountry(iso)`** `[v1·GLOBAL·M]` 🌟 — auto-frame country bbox z paddingiem.
- **`focusOnRegion(bounds)`** `[v1·GLOBAL·S]` — frame dowolny obszar.
```

Replace with:

```
- **Smooth `flyTo(lat, lng, distance)`** `[v1·GLOBAL·M·built]` — `globe.flyTo([lat, lng], distance?, { duration?, easing? })`. Easeing functions exported (`linear`, `easeOutCubic`, `easeInOutCubic`); cancellation on drag/wheel.
- **`focusOnCountry(id)`** `[v1·GLOBAL·M·built]` 🌟 — `globe.focusOnCountry('616', { duration?, padding? })`. Auto-computes camera distance from country bbox + FOV; default padding 15%.
- **`focusOnRegion(bounds)`** `[v1·GLOBAL·S]` — frame dowolny obszar (osobny plan, używa tej samej infrastruktury).
```

- [ ] **Step 2: Commit**

```bash
git add FEATURES.md
git commit -m "docs: mark flyTo + focusOnCountry as built"
```

- [ ] **Step 3: Final workspace verification**

```bash
pnpm test
pnpm build
pnpm typecheck
```

Expected: 38 tests pass; 5/5 builds; 5/5 typecheck.

- [ ] **Step 4: Branch summary**

```bash
git log --oneline main..HEAD
```

Expected: ~9 commits (8 task commits + plan commit).

---

## Self-review notes

1. **Spec coverage:** Plan covers FEATURES.md §4.2 *Smooth `flyTo`* and *`focusOnCountry`* — both flip to `[built]`. `focusOnRegion` is mentioned but deferred (uses the same tween + distance math; trivial follow-up plan). Easings (linear/easeOutCubic/easeInOutCubic) are exported as bonus.
2. **Placeholder scan:** No "TBD"/"implement later"/"add error handling". All code blocks are concrete.
3. **Type consistency:** `EasingFunction`, `FlyToOptions`, `FocusOptions`, `LatLngBounds`, `flyTo`, `focusOnCountry`, `cancelTween`, `getCountryBounds`, `computeFocusDistance` names appear consistently across all tasks.
4. **Scope check:** Single subsystem (camera animation). 8 tasks, ~3-5 working days for solo dev.
