import { DoubleSide, Group, MeshBasicMaterial } from 'three';
import { ExtrudedCountriesLayer } from '../extruded/extruded-layer';
import type { CountryDataMap } from '../../types';
import type { CountryFeature } from '../../renderer/country-feature';
import type { ChartsDataEntry, ChartsDataLayer, ExtrudedDataLayer } from '../types';

/**
 * Bridge from `ChartsDataLayer.chartType: 'extruded'` to the existing
 * `ExtrudedCountriesLayer`. We want the charts API + animation library
 * (per-entry stagger, easing curves, replay) on top of the extruded
 * polygons/walls/triangulation that the standalone extruded layer
 * already implements. So instead of reinventing the geometry, we
 * instantiate `ExtrudedCountriesLayer` internally, drive it with
 * `setProgress(t)` from our tick loop, and re-expose its top-level
 * `Group` to the charts orchestrator.
 *
 * Per-entry mapping:
 *   - `entry.id`              → country id (must match a feature)
 *   - sum of `entry.values`   → height value (single-series → single value)
 *   - first series colour OR scale-mapped → top colour
 *
 * Limitations vs native bars-stacked:
 *   - No per-series stacking on the extruded prism (single colour per country).
 *     A future "extruded-stacked" chart-type could split the wall into
 *     coloured bands; for now this is the same shape `ExtrudedDataLayer`
 *     always rendered, just hooked into the charts pipeline.
 */
export interface ExtrudedChartHandle {
  readonly group: Group;
  readonly underlying: ExtrudedCountriesLayer;
  /** Called by the charts orchestrator each frame to drive the rise t∈[0,1]. */
  readonly applyT: (t: number) => void;
  readonly dispose: () => void;
}

export const buildExtrudedChart = (
  entries: ReadonlyArray<ChartsDataEntry>,
  features: ReadonlyArray<CountryFeature>,
  layer: ChartsDataLayer,
  fallbackColor: string
): ExtrudedChartHandle | null => {
  // Convert entries → CountryDataMap. Skip entries without an id (no
  // polygon to extrude); skip entries with zero total (no height).
  const data: Record<string, { value: number; color?: string }> = {};
  for (const entry of entries) {
    if (!entry.id) continue;
    let total = 0;
    for (const series of layer.series) {
      const raw = entry.values[series.key];
      if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) total += raw;
    }
    if (total <= 0) continue;
    // First series colour wins as a per-entry override; scale fallback
    // happens inside the extruded layer.
    const color = layer.series[0]?.color;
    data[entry.id] = color !== undefined ? { value: total, color } : { value: total };
  }
  if (Object.keys(data).length === 0) return null;

  const extrudedConfig: ExtrudedDataLayer = {
    type: 'extruded',
    data: data as CountryDataMap,
    ...(layer.scale !== undefined ? { scale: layer.scale } : {}),
    height: {
      min: 0,
      max: layer.height ?? 0.12,
    },
    // We drive the animation ourselves via setProgress() — disable the
    // built-in mount animation so it doesn't fight ours.
    animateOnMount: 'none',
  };

  // Build with a basic opaque material; the charts orchestrator doesn't
  // currently expose a per-kind material override (kinds wrap charts the
  // same way they wrap bars/extruded — outline gets solid, dotted glow,
  // etc. — but for this v1 the charts→extruded bridge always uses solid).
  const inner = new ExtrudedCountriesLayer({
    features,
    layer: extrudedConfig,
    fallbackColor,
    buildMaterial: (color) =>
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: layer.opacity ?? 0.92,
        side: DoubleSide,
        depthWrite: false,
      }),
  });

  // Snap to t=0 so the chart rises from the surface as the animation
  // ticks (matches the bars-grouped/stacked default — extruded layer's
  // default is animate-from-0 too, but with our setProgress override
  // it stays at whatever the last call set).
  inner.setProgress(0);

  return {
    group: inner.group,
    underlying: inner,
    applyT: (t: number) => inner.setProgress(t),
    dispose: () => inner.dispose(),
  };
};
