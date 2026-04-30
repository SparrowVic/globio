import {
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type BufferGeometry,
  type Mesh,
} from 'three';
import type { ChartsDataLayer } from '../types';

/**
 * Resolved border style — `null` when the layer doesn't want borders,
 * full struct otherwise. Centralises the "is it on, what colour" decision
 * so every chart-type builder can call the same helper without re-deriving.
 */
export interface ResolvedBorder {
  readonly color: string;
  readonly opacity: number;
}

export const resolveBorder = (layer: ChartsDataLayer): ResolvedBorder | null => {
  if (!layer.borderColor) return null;
  // borderWidth=0 explicit-disable; undefined defaults to 0.55.
  const opacity = layer.borderWidth;
  if (opacity === 0) return null;
  return {
    color: layer.borderColor,
    opacity: Math.max(0, Math.min(1, opacity ?? 0.55)),
  };
};

/**
 * Attach an outline `LineSegments` to a mesh as a child object. The line
 * geometry is derived from the mesh's geometry via `EdgesGeometry` (which
 * picks up only the polygon boundary edges for our flat pie segments and
 * only the cube edges for box bars). Returns the LineSegments so the
 * caller can store it on its handle for disposal.
 *
 * `LineSegments` parented to the mesh inherits its scale + position, so
 * the bars-* path's `mesh.scale.y = targetHeight × t` animation Just Works
 * for the outline too. Material's `transparent: true` + `depthWrite: false`
 * keeps it from breaking the alpha sort.
 */
export const attachBorder = (
  mesh: Mesh,
  border: ResolvedBorder
): LineSegments => {
  const edges = new EdgesGeometry(mesh.geometry as BufferGeometry);
  const material = new LineBasicMaterial({
    color: border.color,
    transparent: true,
    opacity: border.opacity,
    depthWrite: false,
  });
  const lines = new LineSegments(edges, material);
  lines.renderOrder = (mesh.renderOrder ?? 0) + 1;
  mesh.add(lines);
  return lines;
};

/** Free the GPU resources owned by an attached border. */
export const disposeBorder = (lines: LineSegments | undefined): void => {
  if (!lines) return;
  lines.geometry.dispose();
  (lines.material as LineBasicMaterial).dispose();
  if (lines.parent) lines.parent.remove(lines);
};
