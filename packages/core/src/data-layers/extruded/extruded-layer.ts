import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
  type Material,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { triangulatePolygon } from '../../utils/triangulate-ring';
import { colorForValue, dataExtentFor, type ScaleConfig } from '../../data/scales';
import type { CountryFeature, CountryPolygon } from '../../renderer/country-feature';
import type { CountryDataEntry } from '../../types';
import type { ExtrudedDataLayer } from '../types';

const DEFAULT_MIN_HEIGHT = 0.005;
const DEFAULT_MAX_HEIGHT = 0.18;
const DEFAULT_MOUNT_DURATION_MS = 700;
const DEFAULT_FALLBACK_COLOR = '#ffffff';
const TOP_RADIUS_LIFT = 1.0008; // sit just above the underlying surface like CountriesFillLayer.

interface ExtrudedEntry {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly geometry: BufferGeometry;
  /** World-units height the bar should reach when fully grown. */
  readonly targetHeight: number;
  /**
   * Per-vertex outward direction (normalised). Used by the rise animation —
   * each frame, vertices that belong to the elevated top/wall layer are
   * pushed outward by `direction * progress * targetHeight`.
   */
  readonly directions: Float32Array;
  /** Base XYZ positions (top + walls collapsed onto the sphere surface). */
  readonly basePositions: Float32Array;
  /** Reusable buffer the per-frame update writes into to avoid allocations. */
  readonly livePositions: Float32Array;
}

export interface ExtrudedCountriesLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly layer: ExtrudedDataLayer;
  /**
   * Build a new material for each country. The resolved per-country color
   * is passed in. Kinds use this to control opacity / blending / emissivity.
   */
  readonly buildMaterial: (color: string) => Material;
  /** Color used when neither entry color nor the layer's scale resolves one. */
  readonly fallbackColor?: string;
}

/**
 * Per-country extruded geometry — each country's polygon is "lifted" outward
 * along the surface normal at a value-mapped height, with side walls joining
 * the surface ring to the elevated top. 3D variant of choropleth.
 *
 * Build strategy: vertices live at the sphere surface (radius R). The TOP-cap
 * triangulation is appended, and for every outer/hole edge two wall triangles
 * are appended. Per-vertex `directions` mark which vertices belong to the
 * "lifted" set; the rise animation pushes those vertices outward by
 * `direction * progress * targetHeight`. Surface-anchored vertices have a
 * zero direction so walls correctly anchor down to the sphere.
 *
 * Per-frame cost is O(verts) attribute writes; for ~200 countries on medium
 * detail this is well below 1ms.
 */
export class ExtrudedCountriesLayer {
  public readonly group: Group;
  private readonly entries = new Map<string, ExtrudedEntry>();
  private readonly mountDuration: number;
  private readonly animateOnMount: 'rise' | 'none';
  private mountElapsed = 0;

  public constructor(options: ExtrudedCountriesLayerOptions) {
    this.group = new Group();
    this.group.name = 'ExtrudedCountriesLayer';
    this.animateOnMount = options.layer.animateOnMount ?? 'rise';
    this.mountDuration =
      Math.max(0, options.layer.mountDurationMs ?? DEFAULT_MOUNT_DURATION_MS) / 1000;
    this.build(options);
    // Snap-to-final on 'none' so meshes are visible on first paint.
    if (this.animateOnMount === 'none' || this.mountDuration <= 0) {
      this.applyProgress(1);
    }
  }

  public update(delta: number): void {
    if (this.mountDuration <= 0 || this.mountElapsed >= this.mountDuration) return;
    this.mountElapsed = Math.min(this.mountDuration, this.mountElapsed + delta);
    const t = this.mountElapsed / this.mountDuration;
    const eased = 1 - Math.pow(1 - t, 3);
    this.applyProgress(eased);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Drive the rise progress externally — used by the charts data layer's
   * `'extruded'` chart-type, which delegates to this layer for the
   * polygon/triangulation/walls work but wants its own animation timeline
   * (per-entry stagger, easing curve, layer-wide replay).
   */
  public setProgress(progress: number): void {
    this.mountElapsed = this.mountDuration; // freeze internal animator
    this.applyProgress(Math.max(0, Math.min(1, progress)));
  }

  public dispose(): void {
    this.entries.forEach((entry) => {
      entry.geometry.dispose();
      entry.material.dispose();
    });
    this.entries.clear();
    this.group.clear();
  }

  private applyProgress(progress: number): void {
    this.entries.forEach((entry) => {
      const live = entry.livePositions;
      const base = entry.basePositions;
      const dirs = entry.directions;
      const offset = entry.targetHeight * progress;
      for (let i = 0; i < live.length; i += 3) {
        live[i] = base[i]! + dirs[i]! * offset;
        live[i + 1] = base[i + 1]! + dirs[i + 1]! * offset;
        live[i + 2] = base[i + 2]! + dirs[i + 2]! * offset;
      }
      const attr = entry.geometry.getAttribute('position') as Float32BufferAttribute;
      attr.array = live;
      attr.needsUpdate = true;
    });
  }

  private build(options: ExtrudedCountriesLayerOptions): void {
    const { layer, features, buildMaterial } = options;
    const fallback = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    const minH = layer.height?.min ?? DEFAULT_MIN_HEIGHT;
    const maxH = layer.height?.max ?? DEFAULT_MAX_HEIGHT;
    const extent = dataExtentFor(layer.data);
    const noData = layer.scale?.noDataColor ?? fallback;

    for (const feature of features) {
      const datum = layer.data[feature.id];
      if (!datum) continue;
      const targetHeight = scaleHeight(datum.value, extent, minH, maxH);
      if (targetHeight <= 0) continue;
      const built = buildEntryGeometry(feature.polygons);
      if (!built) continue;
      const color = pickExtrudedColor(datum, layer.scale, extent, noData);
      const material = buildMaterial(color);
      const safeMaterial = material as Material & { color?: Color; side?: number };
      if (safeMaterial.color !== undefined) safeMaterial.color = new Color(color);
      const geometry = new BufferGeometry();
      // livePositions starts as a copy of basePositions; the rise animation
      // writes into it each frame.
      const live = new Float32Array(built.basePositions);
      geometry.setAttribute('position', new Float32BufferAttribute(live, 3));
      geometry.setIndex(new Uint32BufferAttribute(built.indices, 1));
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, material);
      mesh.userData['countryId'] = feature.id;
      this.group.add(mesh);
      this.entries.set(feature.id, {
        mesh,
        material: material as MeshBasicMaterial,
        geometry,
        targetHeight,
        directions: built.directions,
        basePositions: built.basePositions,
        livePositions: live,
      });
    }
  }
}

interface ExtrudedGeometryArrays {
  readonly basePositions: Float32Array;
  readonly directions: Float32Array;
  readonly indices: Uint32Array;
}

const buildEntryGeometry = (
  polygons: ReadonlyArray<CountryPolygon>
): ExtrudedGeometryArrays | null => {
  const radius = GLOBE_RADIUS * TOP_RADIUS_LIFT;
  const positions: Array<number> = [];
  const directions: Array<number> = [];
  const indices: Array<number> = [];
  let appended = false;

  for (const polygon of polygons) {
    if (polygon.length === 0) continue;
    const tri = triangulatePolygon(polygon, radius);
    if (!tri) continue;
    const baseVertex = positions.length / 3;

    // Top cap: lifted along normal.
    for (let i = 0; i < tri.positions.length; i += 3) {
      const x = tri.positions[i]!;
      const y = tri.positions[i + 1]!;
      const z = tri.positions[i + 2]!;
      positions.push(x, y, z);
      const len = Math.hypot(x, y, z) || 1;
      directions.push(x / len, y / len, z / len);
    }
    for (let i = 0; i < tri.indices.length; i++) {
      indices.push(tri.indices[i]! + baseVertex);
    }

    // Walls: for each ring (outer + holes), build a quad per edge spanning
    // the surface (direction = 0 → stays at R) to the elevated copy
    // (direction = normal → lifted by targetHeight at full progress).
    for (const ring of polygon) {
      if (ring.length < 3) continue;
      // Drop trailing close-vertex if present so we don't double-count.
      const closes =
        ring[0] && ring[ring.length - 1]
          ? ring[0]![0] === ring[ring.length - 1]![0] &&
            ring[0]![1] === ring[ring.length - 1]![1]
          : false;
      const opened = closes ? ring.slice(0, -1) : ring;
      if (opened.length < 3) continue;

      // Edges spanning more than this angle on the sphere are dropped — they
      // indicate a source ring with an unsplit antimeridian crossing or a
      // degenerate jump that would produce a giant wall slicing across the
      // globe. ~5° is plenty: real ring segments in world-atlas medium res
      // are sub-degree, so this only catches data anomalies.
      const MAX_EDGE_DOT = Math.cos((5 * Math.PI) / 180);
      for (let i = 0; i < opened.length; i++) {
        const a = opened[i]!;
        const b = opened[(i + 1) % opened.length]!;
        const va = latLngToVector3([a[1], a[0]], radius);
        const vb = latLngToVector3([b[1], b[0]], radius);
        const lenA = Math.hypot(va.x, va.y, va.z) || 1;
        const lenB = Math.hypot(vb.x, vb.y, vb.z) || 1;
        // Dot product of unit vectors = cos(angle between them).
        const dot = (va.x * vb.x + va.y * vb.y + va.z * vb.z) / (lenA * lenB);
        if (dot < MAX_EDGE_DOT) continue;
        const baseIdx = positions.length / 3;
        // [0] surface A, [1] surface B, [2] top A, [3] top B
        positions.push(va.x, va.y, va.z);
        directions.push(0, 0, 0);
        positions.push(vb.x, vb.y, vb.z);
        directions.push(0, 0, 0);
        positions.push(va.x, va.y, va.z);
        directions.push(va.x / lenA, va.y / lenA, va.z / lenA);
        positions.push(vb.x, vb.y, vb.z);
        directions.push(vb.x / lenB, vb.y / lenB, vb.z / lenB);
        // Two triangles for the wall quad.
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx + 2, baseIdx + 1, baseIdx + 3);
      }
    }

    appended = true;
  }

  if (!appended || positions.length === 0) return null;
  return {
    basePositions: new Float32Array(positions),
    directions: new Float32Array(directions),
    indices: new Uint32Array(indices),
  };
};

const scaleHeight = (
  value: number | undefined,
  extent: readonly [number, number],
  min: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return min;
  const [lo, hi] = extent;
  const span = hi - lo;
  const t = span > 0 ? (value - lo) / span : 0;
  const clamped = Math.max(0, Math.min(1, t));
  return min + clamped * (max - min);
};

const pickExtrudedColor = (
  datum: CountryDataEntry,
  scale: ScaleConfig | undefined,
  extent: readonly [number, number],
  fallback: string
): string => {
  if (datum.color) return datum.color;
  if (scale) {
    const c = colorForValue(scale, datum.value, extent);
    if (c) return c;
  }
  return fallback;
};
