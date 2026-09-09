import type { GlobeKind, ThemePresetName } from '@your-globe/core';

/** Carry the selected style into a clean Studio scene. */
export function studioHref(kind: GlobeKind, theme: ThemePresetName): string {
  return `/studio?${new URLSearchParams({ kind, theme, layer: 'none' })}`;
}
