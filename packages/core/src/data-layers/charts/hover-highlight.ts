import { Color, type Mesh, type MeshBasicMaterial } from 'three';
import type { ChartsDataLayer } from '../types';

/**
 * In-place hover-highlight system for chart segments. No overlay mesh —
 * we mutate each segment's material colour directly, with the original
 * stashed on `mesh.userData['originalColor']` for restore.
 *
 * This keeps the chart geometry tree simple (no per-segment overlay
 * sibling) and works for any chart-type — bars, pies, gauge segments,
 * sunburst rings — without each builder having to wire up a custom
 * highlight overlay.
 */

export interface ResolvedHighlight {
  readonly enabled: boolean;
  readonly color: Color;
  /** 0..1 blend strength toward `color` for the hovered segment. */
  readonly opacity: number;
  /** 0..1 opacity multiplier applied to non-hovered segments. Default 0.5. */
  readonly dimRest: number;
}

const DEFAULT_HIGHLIGHT_COLOR = new Color('#ffffff');
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const resolveChartsHighlight = (
  input: ChartsDataLayer['highlight']
): ResolvedHighlight => {
  if (input === undefined || input === false) {
    return { enabled: false, color: DEFAULT_HIGHLIGHT_COLOR, opacity: 0.55, dimRest: 0.5 };
  }
  if (input === true) {
    return { enabled: true, color: DEFAULT_HIGHLIGHT_COLOR, opacity: 0.55, dimRest: 0.5 };
  }
  return {
    enabled: true,
    color: new Color(input.color ?? '#ffffff'),
    opacity: clamp01(input.opacity ?? 0.55),
    dimRest: clamp01(input.dimRest ?? 0.5),
  };
};

/** Snapshot the current material colour onto userData for later restore. */
export const stashOriginalColor = (mesh: Mesh): void => {
  const material = mesh.material as MeshBasicMaterial;
  if (mesh.userData['originalColor'] === undefined) {
    mesh.userData['originalColor'] = material.color.clone();
  }
};

/** Reset every mesh in the array back to its stashed original colour. */
export const clearHighlight = (meshes: ReadonlyArray<Mesh>): void => {
  for (const mesh of meshes) {
    const original = mesh.userData['originalColor'] as Color | undefined;
    if (!original) continue;
    (mesh.material as MeshBasicMaterial).color.copy(original);
  }
};

/**
 * Apply hover state across every chart mesh. `targetMesh` (when present)
 * gets tinted toward `highlight.color`; everything else gets dimmed by
 * `dimRest`. When `targetMesh` is null, all meshes restore to their
 * original colour.
 *
 * Operates in-place — no GC allocation per frame, no draw-list churn.
 */
export const applyChartsHighlight = (
  meshes: ReadonlyArray<Mesh>,
  targetMesh: Mesh | null,
  highlight: ResolvedHighlight
): void => {
  if (!highlight.enabled || targetMesh === null) {
    clearHighlight(meshes);
    return;
  }
  for (const mesh of meshes) {
    const material = mesh.material as MeshBasicMaterial;
    const original = mesh.userData['originalColor'] as Color | undefined;
    if (!original) continue;
    if (mesh === targetMesh) {
      // Lerp toward the highlight color (50% blend keeps the segment
      // identifiable while making the hover read clearly).
      material.color.copy(original).lerp(highlight.color, highlight.opacity);
    } else {
      // Dim by multiplying RGB by dimRest — keeps hue, kills saturation.
      material.color
        .copy(original)
        .multiplyScalar(highlight.dimRest);
    }
  }
};
