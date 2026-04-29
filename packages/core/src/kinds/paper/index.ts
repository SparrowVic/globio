import { Mesh } from 'three';
import { PaperBordersLayer } from './paper-borders-layer';
import { PaperFillLayer } from './paper-fill-layer';
import { PaperGridLayer } from './paper-grid-layer';
import { PaperSurfaceLayer } from './paper-surface-layer';
import { buildPaperFocusPulse } from '../shared/focus-pulse-decorators';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Paper kind — vintage atlas vibe. Cream parchment sphere overlay on top of
 * the default globe mesh, hand-drawn ink borders with deterministic
 * perpendicular jitter, optional pastel country fill, optional faint
 * lat/lng atlas grid. No animations, no glow — calm and illustrated.
 *
 * Country interaction (hover/click + highlight) is fully supported via the
 * shared picking infrastructure.
 *
 * Sub-features (all default-on, individually toggleable via `config.paper`):
 *  - `PaperSurfaceLayer` — procedural paper-grain CanvasTexture sphere overlay.
 *  - `PaperBordersLayer` — jittered ink-style country borders, two-pass bleed.
 *  - `PaperFillLayer` — single warm pastel wash for every country.
 *  - `PaperGridLayer` — faint lat/lng atlas registration lines.
 */
export const paperKind: KindModule = {
  kind: 'paper',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens, config }: KindBuildContext): KindHandle {
    const paper = config.paper;
    const fillEnabled = paper?.fill?.enabled ?? true;
    const gridEnabled = paper?.grid?.enabled ?? true;
    const roughness = paper?.borderRoughness ?? tokens['paper.borderRoughness'];

    // Hide the default globe mesh while paper is active — its solid color
    // would punch through the cream surface at low zoom angles. We match by
    // sphere radius < 1 to avoid catching the atmosphere shell (radius 1.15)
    // or any kind layer (≥1). Restored on dispose.
    const defaultMeshes: Array<Mesh> = [];
    for (const child of globeGroup.children) {
      if (!(child instanceof Mesh)) continue;
      if (child.userData['countryId']) continue;
      const params = (child.geometry as { parameters?: { radius?: number } } | null)?.parameters;
      if (!params || typeof params.radius !== 'number') continue;
      if (params.radius < 1) {
        defaultMeshes.push(child);
        child.visible = false;
      }
    }

    const surface = new PaperSurfaceLayer({
      color: tokens['paper.surfaceColor'],
      noiseAmount: tokens['paper.surfaceNoiseAmount'],
    });
    globeGroup.add(surface.mesh);

    const fill = fillEnabled
      ? new PaperFillLayer({
          features: features as ReadonlyArray<CountryFeature>,
          color: tokens['paper.fillColor'],
          opacity: tokens['paper.fillOpacity'],
        })
      : null;
    if (fill) globeGroup.add(fill.group);

    const grid = gridEnabled
      ? new PaperGridLayer({
          color: tokens['paper.gridColor'],
          opacity: tokens['paper.gridOpacity'],
        })
      : null;
    if (grid) globeGroup.add(grid.group);

    const borders = new PaperBordersLayer({
      features: features as ReadonlyArray<CountryFeature>,
      color: tokens['paper.borderColor'],
      opacity: tokens['paper.borderOpacity'],
      roughness,
    });
    globeGroup.add(borders.group);

    const focusPulse = buildPaperFocusPulse({
      globeGroup,
      enabled: true,
      color: tokens['paper.borderColor'],
      durationSeconds: 1.6,
    });

    return {
      decorations: { focusPulse },
      dispose() {
        borders.dispose();
        globeGroup.remove(borders.group);
        if (grid) {
          grid.dispose();
          globeGroup.remove(grid.group);
        }
        if (fill) {
          fill.dispose();
          globeGroup.remove(fill.group);
        }
        surface.dispose();
        globeGroup.remove(surface.mesh);
        for (const m of defaultMeshes) m.visible = true;
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        surface.setVisible(visible);
        fill?.setVisible(visible);
        grid?.setVisible(visible);
        borders.setVisible(visible);
      },
    };
  },
};

export { PaperBordersLayer } from './paper-borders-layer';
export { PaperFillLayer } from './paper-fill-layer';
export { PaperGridLayer } from './paper-grid-layer';
export { PaperSurfaceLayer } from './paper-surface-layer';
export { jitterRing, seededJitter } from './paper-jitter';
