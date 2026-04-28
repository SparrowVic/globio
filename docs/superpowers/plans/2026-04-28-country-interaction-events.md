# Country Interaction Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-country `hover` and `click` events emitted from the globe — clicking anywhere on a country's land area fires `countryClick` with `CountryData`; pointer-move over a country fires `countryHover`.

**Architecture:** A new `CountriesPickingLayer` builds one transparent mesh per country ring, triangulated with `earcut` in lat/lng space, mapped to the sphere surface. The mesh group is registered as a `country`-typed raycaster target. On hit, `globe.ts` resolves the mesh's `userData.countryId` to a `CountryData` lookup and emits the matching event with the hit point converted back to lat/lng via the existing `vector3ToLatLng`. The visible borders layer stays untouched — picking is a separate layer behind it.

**Tech Stack:** TypeScript strict, Three.js (`Mesh`, `BufferGeometry`, `MeshBasicMaterial`), `earcut` (already a dep), Vitest.

---

## Why this scope, not bigger?

This plan ships **events only**, no visual hover indicator. Reasons:

- Events are foundational — many downstream features depend on them (focusOnCountry, country labels, story-engine highlights, custom user reactions). They unblock the most other work.
- A visual hover indicator (token-driven highlight border, change-on-hover) is a polish layer that's natural as a follow-up plan once events fire. Splitting keeps each plan tight and verifiable.
- Filled country meshes (visible, not just for picking) are needed for the **choropleth** and **paper** styles. Those styles each get their own plan with their own visual rules. The picking layer here is a stepping stone — same triangulation logic, different material.

**Known limitation accepted in this plan:** countries with hole rings (Lesotho-in-South-Africa, Vatican-in-Italy, San Marino-in-Italy) — the inner ring is filtered out by signed-area test, so the surrounding country's mesh covers the inner country's area. Click on Lesotho coordinates: both Lesotho's own mesh AND South Africa's mesh are hit; raycaster's first-hit-wins resolves arbitrarily. Documented as known issue; fix in a future plan via proper polygon-with-holes preservation in geo-loader.

---

## File structure

**New files:**

- `packages/core/src/utils/triangulate-ring.ts` — pure-function helper: lat/lng ring → `{ positions: Float32Array, indices: Uint32Array }` ready for `BufferGeometry`. Filters clockwise (hole) rings via signed area.
- `packages/core/src/utils/__tests__/triangulate-ring.test.ts` — unit tests for the helper.
- `packages/core/src/utils/__tests__/coordinates.test.ts` — roundtrip test for `latLngToVector3` ↔ `vector3ToLatLng` (defensive, since picking event payloads depend on it).
- `packages/core/src/renderer/countries-picking-layer.ts` — owns the picking-mesh group + lookup map.

**Modified files:**

- `packages/core/src/globe.ts` — instantiate `CountriesPickingLayer` after countries load, register it as a raycaster target, handle `country`-typed hits, emit `countryClick` and `countryHover`.
- `examples/vanilla-demo/src/main.ts` — subscribe to `countryHover` / `countryClick`, show country name in HUD.
- `FEATURES.md` — flip status flags for hover/click events.

**Untouched files (intentional):**

- `packages/core/src/renderer/countries-layer.ts` — visible borders unchanged
- `packages/core/src/interaction/raycaster.ts` — already supports `country` target type
- `packages/core/src/types.ts` — `CountryData`, `CountryEvent`, `GlobeEvents` already declare countryClick/countryHover

---

## Task 1: Roundtrip test for coordinates utility

**Files:**
- Create: `packages/core/src/utils/__tests__/coordinates.test.ts`

This is a defensive test — the picking event payload depends on `vector3ToLatLng` returning correct values. Roundtrip property: `vec3ToLatLng(latLngToVec3(p)) ≈ p` for any valid lat/lng.

- [ ] **Step 1: Write the test**

Path: `packages/core/src/utils/__tests__/coordinates.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { GLOBE_RADIUS, latLngToVector3, vector3ToLatLng } from '../coordinates';

const TOLERANCE_DEG = 1e-6;

const samples: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [52.2297, 21.0122], // Warsaw
  [40.7128, -74.006], // NYC
  [-33.8688, 151.2093], // Sydney
  [-89.9, 179.9], // near south pole, near antimeridian
  [89.9, -179.9], // near north pole
];

describe('coordinates roundtrip', () => {
  it.each(samples)('latLngToVector3 → vector3ToLatLng preserves [%f, %f]', (lat, lng) => {
    const vec = latLngToVector3([lat, lng]);
    const [latBack, lngBack] = vector3ToLatLng(vec);
    expect(Math.abs(latBack - lat)).toBeLessThan(TOLERANCE_DEG);
    expect(Math.abs(lngBack - lng)).toBeLessThan(TOLERANCE_DEG);
  });

  it('latLngToVector3 places points on sphere of GLOBE_RADIUS', () => {
    for (const [lat, lng] of samples) {
      const vec = latLngToVector3([lat, lng]);
      expect(vec.length()).toBeCloseTo(GLOBE_RADIUS, 6);
    }
  });

  it('latLngToVector3 reuses target Vector3 when provided', () => {
    const target = new Vector3();
    const result = latLngToVector3([10, 20], GLOBE_RADIUS, target);
    expect(result).toBe(target);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @your-globe/core test
```

Expected: 12 existing pass + 8 new pass = 20 total. If roundtrip fails on any sample, that's a real bug in `vector3ToLatLng`; STOP and surface to user before continuing — every later task depends on it being correct.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/utils/__tests__/coordinates.test.ts
git commit -m "test(core): coordinates roundtrip (lat/lng ↔ Vector3)"
```

---

## Task 2: Triangulation utility (TDD)

**Files:**
- Create: `packages/core/src/utils/triangulate-ring.ts`
- Create: `packages/core/src/utils/__tests__/triangulate-ring.test.ts`

The helper takes a single ring of lat/lng pairs, decides whether to triangulate it (skip if it's a hole — signed area negative in standard math convention), and emits 3D-positioned vertex/index buffers ready for `BufferGeometry`.

- [ ] **Step 1: Write the failing tests**

Path: `packages/core/src/utils/__tests__/triangulate-ring.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { triangulateRing, ringSignedArea } from '../triangulate-ring';
import { GLOBE_RADIUS } from '../coordinates';

const square: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

const squareCW: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 0],
  [0, 0],
];

describe('ringSignedArea', () => {
  it('returns positive area for counterclockwise ring (outer in GeoJSON)', () => {
    expect(ringSignedArea(square)).toBeGreaterThan(0);
  });

  it('returns negative area for clockwise ring (hole in GeoJSON)', () => {
    expect(ringSignedArea(squareCW)).toBeLessThan(0);
  });

  it('returns ~zero area for degenerate ring with <3 points', () => {
    expect(ringSignedArea([[0, 0], [1, 1]])).toBe(0);
  });
});

describe('triangulateRing', () => {
  it('returns null for clockwise (hole) ring', () => {
    expect(triangulateRing(squareCW, GLOBE_RADIUS * 1.001)).toBeNull();
  });

  it('returns null for ring with fewer than 3 distinct points', () => {
    expect(triangulateRing([[0, 0], [1, 1]], GLOBE_RADIUS * 1.001)).toBeNull();
  });

  it('triangulates a counterclockwise ring into 3D positions and indices', () => {
    const result = triangulateRing(square, GLOBE_RADIUS * 1.001);
    expect(result).not.toBeNull();
    if (!result) return;
    // square has 4 unique vertices → triangulated as 2 triangles → 6 indices
    expect(result.indices.length).toBe(6);
    expect(result.positions.length).toBe(4 * 3); // 4 vertices × xyz
    // every vertex lies on the requested radius
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i] ?? 0;
      const y = result.positions[i + 1] ?? 0;
      const z = result.positions[i + 2] ?? 0;
      const r = Math.sqrt(x * x + y * y + z * z);
      expect(r).toBeCloseTo(GLOBE_RADIUS * 1.001, 4);
    }
  });

  it('drops trailing closing vertex if duplicate of first', () => {
    // square has [0,0] both at index 0 and 4. After triangulation we should
    // have 4 positions, not 5 — earcut would otherwise produce zero-area tris.
    const result = triangulateRing(square, GLOBE_RADIUS * 1.001);
    expect(result?.positions.length).toBe(4 * 3);
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
pnpm --filter @your-globe/core test
```

Expected: all 7 new tests fail with module-not-found.

- [ ] **Step 3: Implement the helper**

Path: `packages/core/src/utils/triangulate-ring.ts`

```ts
import earcut from 'earcut';
import { latLngToVector3 } from './coordinates';

export interface RingTriangulation {
  /** Flat XYZ positions: [x0, y0, z0, x1, y1, z1, ...] */
  readonly positions: Float32Array;
  /** Triangle indices into the positions array */
  readonly indices: Uint32Array;
}

/**
 * Signed area using the shoelace formula on lat/lng coordinates.
 *
 * GeoJSON convention: outer rings are counterclockwise (positive area in
 * standard math axes), holes are clockwise (negative area). We use this
 * to filter hole rings in `triangulateRing`.
 */
export const ringSignedArea = (
  ring: ReadonlyArray<readonly [number, number]>
): number => {
  if (ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    sum += (b[0] - a[0]) * (b[1] + a[1]);
  }
  // Shoelace returns -2*area for CCW rings in (x, y) coords; we use lat as y, lng as x.
  // Sign convention here: GeoJSON outer (CCW) → returns positive.
  return -sum / 2;
};

/**
 * Triangulate a single GeoJSON ring on a sphere of given radius.
 *
 * Returns `null` for hole rings (clockwise) or degenerate rings (<3 distinct points).
 * For valid rings, returns 3D positions (mapped via lat/lng → Vector3) and triangle
 * indices ready for `BufferGeometry`.
 */
export const triangulateRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  radius: number
): RingTriangulation | null => {
  if (ring.length < 4) return null; // need at least 3 distinct + closing point
  if (ringSignedArea(ring) <= 0) return null;

  // Drop trailing closing vertex if it duplicates the first
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closes = first && last && first[0] === last[0] && first[1] === last[1];
  const open = closes ? ring.slice(0, -1) : ring;

  if (open.length < 3) return null;

  // earcut takes flat 2D coords; we use [lng, lat] order (x=lng, y=lat) so signed-area
  // convention matches above (CCW = positive).
  const flat: Array<number> = [];
  for (const point of open) {
    flat.push(point[1], point[0]);
  }
  const triIndices = earcut(flat);
  if (triIndices.length === 0) return null;

  // Map each 2D vertex to 3D on the sphere
  const positions = new Float32Array(open.length * 3);
  for (let i = 0; i < open.length; i++) {
    const point = open[i];
    if (!point) continue;
    const v = latLngToVector3([point[0], point[1]], radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  return {
    positions,
    indices: new Uint32Array(triIndices),
  };
};
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm --filter @your-globe/core test
```

Expected: all 27 tests pass (12 resolver + 8 coordinates + 7 triangulate-ring).

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @your-globe/core typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/utils/triangulate-ring.ts packages/core/src/utils/__tests__/triangulate-ring.test.ts
git commit -m "feat(core): ring triangulation utility (earcut + signed-area filter)"
```

---

## Task 3: CountriesPickingLayer

**Files:**
- Create: `packages/core/src/renderer/countries-picking-layer.ts`

A grouped set of transparent meshes — one per non-hole ring of every country. Each mesh's `userData.countryId` is the country ISO id; the layer also exposes a public `getCountry(id)` lookup to map an intersection back to `CountryData`.

- [ ] **Step 1: Write `countries-picking-layer.ts`**

Path: `packages/core/src/renderer/countries-picking-layer.ts`

```ts
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
} from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';
import { triangulateRing } from '../utils/triangulate-ring';
import type { CountryFeature } from './countries-layer';
import type { CountryData } from '../types';

export interface CountriesPickingLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
}

/**
 * Invisible-but-raycastable meshes — one per outer ring per country —
 * used solely as a hit target for pointer events. Borders remain in
 * the visible CountriesLayer; this layer is purely behind-the-scenes.
 */
export class CountriesPickingLayer {
  public readonly group: Group;
  private readonly material: MeshBasicMaterial;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly countriesById = new Map<string, CountryData>();

  public constructor(options: CountriesPickingLayerOptions) {
    this.group = new Group();
    this.group.name = 'CountriesPickingLayer';

    // Transparent + zero opacity + colorWrite off renders nothing on screen
    // but Three.js still raycasts it (Mesh.raycast does pure geometry intersection).
    this.material = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: DoubleSide,
    });

    // Lift just slightly above visible borders (which sit at GLOBE_RADIUS * 1.001)
    // so picks land here rather than on the globe sphere.
    this.buildMeshes(options.features, GLOBE_RADIUS * 1.0015);
  }

  public getCountry(id: string): CountryData | null {
    return this.countriesById.get(id) ?? null;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.group.clear();
    this.countriesById.clear();
  }

  private buildMeshes(features: ReadonlyArray<CountryFeature>, radius: number): void {
    for (const feature of features) {
      this.countriesById.set(feature.id, { id: feature.id, name: feature.name });
      for (const ring of feature.coordinates) {
        const tri = triangulateRing(ring, radius);
        if (!tri) continue;

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(tri.positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(tri.indices, 1));
        this.geometries.push(geometry);

        const mesh = new Mesh(geometry, this.material);
        mesh.userData['countryId'] = feature.id;
        this.group.add(mesh);
      }
    }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @your-globe/core typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/renderer/countries-picking-layer.ts
git commit -m "feat(core): countries-picking-layer (invisible per-country meshes)"
```

---

## Task 4: Wire picking layer into globe.ts and emit events

**Files:**
- Modify: `packages/core/src/globe.ts`

- [ ] **Step 1: Import the new layer + coordinates helper**

In `packages/core/src/globe.ts`, the import block at the top — add `CountriesPickingLayer` and `vector3ToLatLng`:

```ts
import { AmbientLight, DirectionalLight } from 'three';
import { SceneManager } from './renderer/scene-manager';
import { GlobeMesh } from './renderer/globe-mesh';
import { MarkersLayer } from './renderer/markers-layer';
import { CountriesLayer, type CountryFeature } from './renderer/countries-layer';
import { CountriesPickingLayer } from './renderer/countries-picking-layer';
import { AtmosphereLayer } from './renderer/atmosphere-layer';
import { GlobeControls } from './interaction/controls';
import { PointerRaycaster } from './interaction/raycaster';
import { GlobeEventEmitter } from './interaction/events';
import { loadCountries } from './data/geo-loader';
import { resolveTheme } from './theme/resolver';
import { vector3ToLatLng } from './utils/coordinates';
import type {
  CountriesConfig,
  GlobeConfig,
  GlobeEventName,
  GlobeEvents,
  GlobeInstance,
  LatLng,
  MarkerConfig,
  PerformanceConfig,
} from './types';
```

- [ ] **Step 2: Add `countriesPickingLayer` to InternalState**

Find the `InternalState` interface and add the new field:

```ts
interface InternalState {
  config: GlobeConfig;
  scene: SceneManager;
  globeMesh: GlobeMesh;
  markersLayer: MarkersLayer;
  countriesLayer: CountriesLayer | null;
  countriesPickingLayer: CountriesPickingLayer | null;
  atmosphereLayer: AtmosphereLayer | null;
  controls: GlobeControls;
  raycaster: PointerRaycaster;
  emitter: GlobeEventEmitter;
  destroyed: boolean;
}
```

Then in the `state: InternalState = { ... }` literal, add `countriesPickingLayer: null,`.

- [ ] **Step 3: Update raycaster wiring to handle country hits**

Replace the existing `const raycaster = new PointerRaycaster({ ... })` block with:

```ts
const handleCountryHit = (object: { userData: Record<string, unknown> } | null, point: import('three').Vector3 | null): { country: import('./types').CountryData; point: LatLng } | null => {
  if (!object || !state.countriesPickingLayer) return null;
  const id = object.userData['countryId'];
  if (typeof id !== 'string') return null;
  const country = state.countriesPickingLayer.getCountry(id);
  if (!country) return null;
  const ll: LatLng = point ? vector3ToLatLng(point) : [0, 0];
  return { country, point: ll };
};

const raycaster = new PointerRaycaster({
  camera: scene.camera,
  domElement: scene.renderer.domElement,
  targets: [{ type: 'marker', object: markersLayer.mesh }],
  onClick: (hit) => {
    if (hit?.type === 'marker' && hit.instanceId !== undefined) {
      const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
      if (marker) emitter.emit('markerClick', { marker });
      return;
    }
    if (hit?.type === 'country') {
      const event = handleCountryHit(hit.object, hit.point ?? null);
      if (event) emitter.emit('countryClick', event);
    }
  },
  onHover: (hit) => {
    if (hit?.type === 'marker' && hit.instanceId !== undefined) {
      const marker = markersLayer.getMarkerByInstanceId(hit.instanceId);
      emitter.emit('markerHover', marker ? { marker } : null);
      emitter.emit('countryHover', null);
      return;
    }
    if (hit?.type === 'country') {
      const event = handleCountryHit(hit.object, hit.point ?? null);
      emitter.emit('countryHover', event);
      emitter.emit('markerHover', null);
      return;
    }
    emitter.emit('markerHover', null);
    emitter.emit('countryHover', null);
  },
});
```

This requires `RaycasterHit` to expose `point` — see Step 4.

- [ ] **Step 4: Extend RaycasterHit to include hit point**

In `packages/core/src/interaction/raycaster.ts`:

a. Update the `RaycasterHit` interface:

```ts
export interface RaycasterHit {
  readonly type: 'marker' | 'country';
  readonly object: Object3D;
  readonly instanceId?: number;
  readonly point?: import('three').Vector3;
}
```

b. Update `computeHit` to populate `point`:

```ts
private computeHit(): RaycasterHit | null {
  this.raycaster.setFromCamera(this.pointer, this.options.camera);

  for (const target of this.targets) {
    const intersections = this.raycaster.intersectObject(target.object, true);
    const first = intersections[0];
    if (first) {
      return {
        type: target.type,
        object: first.object,
        ...(first.instanceId !== undefined && { instanceId: first.instanceId }),
        point: first.point,
      };
    }
  }
  return null;
}
```

- [ ] **Step 5: Wire picking layer into `initCountries`**

Replace the existing `initCountries` async function with:

```ts
const initCountries = async (): Promise<void> => {
  if (!config.countries) return;
  try {
    const features = await loadCountries({ resolution: countries.resolution });
    if (state.destroyed) return;

    const visible = new CountriesLayer({
      features: features as ReadonlyArray<CountryFeature>,
      borderColor: tokens['borders.color'],
      borderWidth: tokens['borders.width'],
      borderOpacity: tokens['borders.opacity'],
    });
    scene.scene.add(visible.group);
    state.countriesLayer = visible;

    const picking = new CountriesPickingLayer({
      features: features as ReadonlyArray<CountryFeature>,
    });
    scene.scene.add(picking.group);
    state.countriesPickingLayer = picking;
    raycaster.setTargets([
      { type: 'marker', object: markersLayer.mesh },
      { type: 'country', object: picking.group },
    ]);
  } catch (error) {
    emitter.emit('error', error instanceof Error ? error : new Error(String(error)));
  }
};
```

- [ ] **Step 6: Add `setTargets` API on PointerRaycaster**

The current raycaster takes targets in the constructor; we need to swap them after countries load. Add a setter.

In `packages/core/src/interaction/raycaster.ts`:

a. Change the `private readonly targets` field to mutable:

```ts
private targets: ReadonlyArray<RaycasterTarget>;
```

b. In the constructor, initialize it:

```ts
public constructor(options: PointerRaycasterOptions) {
  this.options = options;
  this.targets = options.targets;
  // ... rest unchanged
}
```

(If the constructor body referenced `this.options.targets` directly elsewhere — search for that — replace with `this.targets`.)

c. Add the setter:

```ts
public setTargets(targets: ReadonlyArray<RaycasterTarget>): void {
  this.targets = targets;
}
```

- [ ] **Step 7: Update destroy() to dispose picking layer**

In the `destroy` block of the returned `instance`, before `scene.destroy()`, add:

```ts
state.countriesPickingLayer?.dispose();
```

Final destroy block:

```ts
destroy: () => {
  if (state.destroyed) return;
  state.destroyed = true;
  raycaster.destroy();
  controls.destroy();
  markersLayer.dispose();
  globeMesh.dispose();
  state.countriesLayer?.dispose();
  state.countriesPickingLayer?.dispose();
  atmosphereLayer?.dispose();
  scene.destroy();
  emitter.clear();
},
```

- [ ] **Step 8: Build + typecheck + tests**

```bash
pnpm --filter @your-globe/core build
pnpm --filter @your-globe/core typecheck
pnpm --filter @your-globe/core test
```

Expected: all green, 27 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/globe.ts packages/core/src/interaction/raycaster.ts
git commit -m "feat(core): wire country picking layer + emit countryClick/countryHover"
```

---

## Task 5: Demo HUD shows hovered/clicked country

**Files:**
- Modify: `examples/vanilla-demo/src/main.ts`

- [ ] **Step 1: Add country event handlers**

In `examples/vanilla-demo/src/main.ts`, inside the `buildGlobe` function, add `countryHover` and `countryClick` listeners alongside the existing event subscriptions. Replace the events block (between `globe.on('ready', ...)` setup and `globe.mount();`) with:

```ts
  globe.on('ready', () => {
    if (status) status.textContent = `Theme: ${themeName}`;
  });
  globe.on('error', (err) => {
    if (status) status.textContent = `Błąd: ${err.message}`;
  });
  globe.on('markerClick', ({ marker }) => {
    if (status) status.textContent = `Kliknięto marker: ${marker.id}`;
  });
  globe.on('countryHover', (event) => {
    if (!status) return;
    if (event) {
      status.textContent = `Hover: ${event.country.name}`;
    } else {
      status.textContent = `Theme: ${themeName}`;
    }
  });
  globe.on('countryClick', ({ country }) => {
    if (status) status.textContent = `Klik: ${country.name} (${country.id})`;
  });
```

- [ ] **Step 2: Rebuild core (demo consumes `dist/`)**

```bash
pnpm --filter @your-globe/core build
```

- [ ] **Step 3: Manual visual verification**

Open http://localhost:5173/ (start `pnpm --filter vanilla-demo dev` if needed).

- Hover over a country → HUD reads "Hover: <name>"
- Hover off-globe (into space/background) → HUD restores to current theme name
- Click a country → HUD reads "Klik: <name> (<id>)"
- Click a marker → marker handler still fires (markers take priority due to raycaster target order)
- Click in open ocean (sphere shows but no country there) → no event fires; HUD unchanged
- Switch themes → events still fire for new instance
- No console errors

- [ ] **Step 4: Commit**

```bash
git add examples/vanilla-demo/src/main.ts
git commit -m "feat(demo): show hovered/clicked country in HUD"
```

---

## Task 6: Update FEATURES.md status flags

**Files:**
- Modify: `FEATURES.md`

In §4.3 *Country interaction*, find:

```
- **Hover state** `[v1·EVENT·S]` — change border/fill on hover; emit event z `CountryData`.
- **Click events** `[v1·EVENT·S]` — emit event; `preventDefault` żeby ograniczyć wbudowane reakcje.
```

Replace with:

```
- **Hover state (events)** `[v1·EVENT·S·built]` — `countryHover` event z `CountryData` + `point: LatLng`; visual hover indicator (zmiana koloru granicy) → osobny plan.
- **Click events** `[v1·EVENT·S·built]` — `countryClick` event z `CountryData` + `point: LatLng`. Markery mają wyższy priorytet w raycaster.
```

- [ ] **Step 1: Apply the edit (paste both old block and new block above)**

- [ ] **Step 2: Commit**

```bash
git add FEATURES.md
git commit -m "docs: mark country hover/click events as built"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Workspace tests + build + typecheck**

```bash
pnpm test
pnpm build
pnpm typecheck
```

Expected: 27 tests pass; 5/5 builds; 5/5 typecheck.

- [ ] **Step 2: Branch summary**

```bash
git log --oneline main..HEAD
```

Expected: ~6 commits (one per task; Task 4 is one commit covering Steps 1-9).

---

## Self-review notes

1. **Spec coverage:** Plan covers FEATURES.md §4.3 *Hover state (events)* and *Click events* — both flip to `[built]`. Visual hover indicator (separate item §4.3) and active/selected state (§4.3) remain deferred to follow-up plans.
2. **Placeholder scan:** No "TBD"/"implement later"/"add error handling". Every code block is the literal content to write.
3. **Type consistency:** `RingTriangulation`, `triangulateRing`, `ringSignedArea` defined in Task 2, used in Task 3. `CountriesPickingLayer.getCountry` defined in Task 3, used in Task 4 step 3. `setTargets` defined in Task 4 step 6, used in Task 4 step 5. Cross-references all consistent.
4. **Scope check:** Single subsystem (country picking + events). 7 tasks, ~3-5 working days.
