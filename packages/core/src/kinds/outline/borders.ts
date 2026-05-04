import { Group, LineBasicMaterial, LineSegments, BufferGeometry, Float32BufferAttribute } from 'three';
import { latLngToVector3, GLOBE_RADIUS } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';

export interface OutlineBordersLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly borderOpacity: number;
}

interface CountrySlot {
  readonly id: string;
  readonly materials: Array<LineBasicMaterial>;
  targetOpacity: number;
  currentOpacity: number;
}

export class OutlineBordersLayer {
  public readonly group: Group;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly slots: Map<string, CountrySlot> = new Map();
  private readonly baseOpacity: number;

  public constructor(options: OutlineBordersLayerOptions) {
    this.group = new Group();
    this.baseOpacity = options.borderOpacity;
    this.buildBorders(options);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    for (const slot of this.slots.values()) slot.materials.forEach((m) => m.dispose());
    this.slots.clear();
    this.group.clear();
  }

  /**
   * Set the per-country target opacity factor (0..1) — a multiplier on the
   * theme's `borderOpacity`. Use 1 for "normal", lower for dimmed. The
   * actual material opacity is eased toward this each `tickOpacity()` tick.
   */
  public setCountryOpacityTarget(id: string, target: number): void {
    const slot = this.slots.get(id);
    if (slot) slot.targetOpacity = Math.max(0, Math.min(1, target));
  }

  public resetAllOpacityTargets(): void {
    for (const slot of this.slots.values()) slot.targetOpacity = 1;
  }

  /**
   * Ease each slot's currentOpacity toward its target at `1 - exp(-delta/tau)`
   * (frame-rate independent). Writes the scaled value to all of that slot's
   * line materials. Returns true if anything still moved this tick.
   */
  public tickOpacity(delta: number, tauSeconds: number): boolean {
    if (tauSeconds <= 0) {
      let moved = false;
      for (const slot of this.slots.values()) {
        if (slot.currentOpacity !== slot.targetOpacity) {
          slot.currentOpacity = slot.targetOpacity;
          for (const m of slot.materials) m.opacity = this.baseOpacity * slot.currentOpacity;
          moved = true;
        }
      }
      return moved;
    }
    const k = 1 - Math.exp(-delta / tauSeconds);
    let moved = false;
    for (const slot of this.slots.values()) {
      const diff = slot.targetOpacity - slot.currentOpacity;
      if (Math.abs(diff) < 0.001) {
        if (slot.currentOpacity !== slot.targetOpacity) {
          slot.currentOpacity = slot.targetOpacity;
          for (const m of slot.materials) m.opacity = this.baseOpacity * slot.currentOpacity;
          moved = true;
        }
        continue;
      }
      slot.currentOpacity += diff * k;
      for (const m of slot.materials) m.opacity = this.baseOpacity * slot.currentOpacity;
      moved = true;
    }
    return moved;
  }

  private buildBorders(options: OutlineBordersLayerOptions): void {
    const surfaceRadius = GLOBE_RADIUS * 1.001;

    options.features.forEach((feature) => {
      const featureMaterials: Array<LineBasicMaterial> = [];
      feature.coordinates.forEach((ring) => {
        if (ring.length < 2) return;

        const positions: Array<number> = [];
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i];
          const b = ring[i + 1];
          if (!a || !b) continue;

          const v1 = latLngToVector3([a[1], a[0]], surfaceRadius);
          const v2 = latLngToVector3([b[1], b[0]], surfaceRadius);
          positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        }

        if (positions.length === 0) return;

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        this.geometries.push(geometry);

        const material = new LineBasicMaterial({
          color: options.borderColor,
          linewidth: options.borderWidth,
          transparent: true,
          opacity: options.borderOpacity,
        });
        featureMaterials.push(material);

        const lines = new LineSegments(geometry, material);
        lines.userData['countryId'] = feature.id;
        this.group.add(lines);
      });

      if (featureMaterials.length > 0) {
        this.slots.set(feature.id, {
          id: feature.id,
          materials: featureMaterials,
          targetOpacity: 1,
          currentOpacity: 1,
        });
      }
    });
  }
}
