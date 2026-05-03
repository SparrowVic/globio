import type { DataLayer } from '../data-layers/types';

/**
 * Whether two same-type data-layer configs differ only in fields that the
 * existing handle can swap via `setData()` (samples, kernel, scale, …).
 * Structural fields — texture / mesh resolution — own GPU buffers allocated
 * at construction time, so changes there force a full dispose + rebuild.
 */
export const canUpdateInPlace = (prev: DataLayer, next: DataLayer): boolean => {
  if (prev.type !== 'heatmap' || next.type !== 'heatmap') return true;
  const a = prev.textureResolution;
  const b = next.textureResolution;
  if ((a?.width ?? -1) !== (b?.width ?? -1)) return false;
  if ((a?.height ?? -1) !== (b?.height ?? -1)) return false;
  const m = prev.meshResolution;
  const n = next.meshResolution;
  if ((m?.width ?? -1) !== (n?.width ?? -1)) return false;
  if ((m?.height ?? -1) !== (n?.height ?? -1)) return false;
  if (!m && !n) {
    const prevDisplaced = (prev.maxHeight ?? 0) > 0;
    const nextDisplaced = (next.maxHeight ?? 0) > 0;
    if (prevDisplaced !== nextDisplaced) return false;
  }
  return true;
};
