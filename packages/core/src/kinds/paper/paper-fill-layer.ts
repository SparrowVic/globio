import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import { triangulatePolygon } from '../../utils/triangulate-ring';
import type { CountryFeature } from '../../renderer/country-feature';
import { seededJitter } from './paper-jitter';

export type PaperFillMode = 'single' | 'pastel';

export interface PaperFillLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly opacity: number;
  readonly mode?: PaperFillMode;
}

const FILL_RADIUS = GLOBE_RADIUS * 0.9994;

/**
 * Pastel palette derivation: nudge HSL hue per country so each country
 * picks a slightly different but harmonised wash. Bound the saturation
 * + lightness shifts so we never escape the parchment palette into a
 * candy-coloured world.
 */
const pastelTintFor = (base: Color, id: string): Color => {
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const dh = seededJitter(`pastel.h|${id}`) * 0.12; // ±0.06 hue
  const ds = seededJitter(`pastel.s|${id}`) * 0.12; // ±0.06 sat
  const dl = seededJitter(`pastel.l|${id}`) * 0.06; // ±0.03 light
  const out = new Color();
  out.setHSL(
    (hsl.h + dh + 1) % 1,
    Math.max(0, Math.min(1, hsl.s + ds)),
    Math.max(0, Math.min(1, hsl.l + dl))
  );
  return out;
};

/**
 * Pastel wash for every country. In `'single'` mode (default) every
 * country shares one MeshBasicMaterial — calm, single warm tint — like
 * cream printer ink dabbed over the parchment. In `'pastel'` mode each
 * country gets its own per-id deterministic hue jitter for the
 * Da-Vinci-notebook-coloured-watercolour look.
 *
 * Hover/active highlights from the shared infrastructure still draw on
 * top either way.
 */
export class PaperFillLayer {
  public readonly group: Group;
  private readonly features: ReadonlyArray<CountryFeature>;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly perCountryMaterials: Array<MeshBasicMaterial> = [];
  private currentColor: string;
  private currentOpacity: number;
  private currentMode: PaperFillMode;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private readonly defaultMode: PaperFillMode;
  private singleMaterial: MeshBasicMaterial;
  // Track per-country mesh records so we can swap materials live without
  // rebuilding the geometry (in-place re-tint when toggling pastel mode).
  private readonly meshes: Array<{
    readonly mesh: Mesh;
    readonly id: string;
  }> = [];

  public constructor(options: PaperFillLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperFillLayer';
    this.features = options.features;
    this.currentColor = options.color;
    this.currentOpacity = options.opacity;
    this.currentMode = options.mode ?? 'single';
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;
    this.defaultMode = this.currentMode;
    this.singleMaterial = this.buildSharedMaterial();
    this.build();
  }

  private buildSharedMaterial(): MeshBasicMaterial {
    return new MeshBasicMaterial({
      color: new Color(this.currentColor),
      transparent: true,
      opacity: this.currentOpacity,
      side: DoubleSide,
      depthWrite: false,
    });
  }

  private materialFor(id: string): MeshBasicMaterial {
    if (this.currentMode === 'single') return this.singleMaterial;
    const tint = pastelTintFor(new Color(this.currentColor), id);
    const mat = new MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: this.currentOpacity,
      side: DoubleSide,
      depthWrite: false,
    });
    this.perCountryMaterials.push(mat);
    return mat;
  }

  private build(): void {
    this.features.forEach((feature) => {
      feature.polygons.forEach((polygon) => {
        const tri = triangulatePolygon(polygon, FILL_RADIUS);
        if (!tri) return;
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(tri.positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(tri.indices, 1));
        this.geometries.push(geometry);
        const mat = this.materialFor(feature.id);
        const mesh = new Mesh(geometry, mat);
        mesh.userData['countryId'] = feature.id;
        this.group.add(mesh);
        this.meshes.push({ mesh, id: feature.id });
      });
    });
  }

  /** Swap every per-country material with the freshly-resolved one. */
  private retintAll(): void {
    // Drop previously-allocated per-country materials so we don't leak
    // when bouncing between modes.
    for (const m of this.perCountryMaterials) m.dispose();
    this.perCountryMaterials.length = 0;
    if (this.currentMode === 'single') {
      const next = this.buildSharedMaterial();
      this.singleMaterial.dispose();
      this.singleMaterial = next;
      for (const { mesh } of this.meshes) {
        mesh.material = next;
      }
    } else {
      for (const { mesh, id } of this.meshes) {
        mesh.material = this.materialFor(id);
      }
    }
  }

  public setColor(color: string): void {
    this.currentColor = color;
    if (this.currentMode === 'single') {
      this.singleMaterial.color.set(color);
    } else {
      this.retintAll();
    }
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.singleMaterial.opacity = opacity;
    for (const m of this.perCountryMaterials) m.opacity = opacity;
  }

  public resetOpacity(): void {
    this.setOpacity(this.defaultOpacity);
  }

  public setMode(mode: PaperFillMode): void {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.retintAll();
  }

  public resetMode(): void {
    this.setMode(this.defaultMode);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.singleMaterial.dispose();
    for (const m of this.perCountryMaterials) m.dispose();
    this.perCountryMaterials.length = 0;
    this.meshes.length = 0;
    this.group.clear();
  }
}
