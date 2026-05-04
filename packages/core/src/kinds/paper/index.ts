import { Mesh } from 'three';
import { PaperBordersLayer } from './borders';
import { PaperFillLayer } from './fill';
import { PaperGridLayer } from './grid';
import { PaperSurfaceLayer } from './surface';
import { PaperSepiaLayer } from './sepia';
import { PaperVignetteOverlay } from './vignette';
import { PaperCompassRose } from './compass-rose';
import { PaperAgingMarks } from './aging-marks';
import { PaperWatermark, type PaperWatermarkPosition } from './watermark';
import { PaperLabelsLayer } from './labels';
import { PaperStarfieldLayer } from './starfield';
import { PaperArcsLayer } from './arcs';
import { PaperMarkersLayer } from './markers';
import { PaperAtmosphereLayer } from './atmosphere';
import { PaperSelectionLayer } from './selection';
import { buildPaperFocusPulse } from '../shared/focus-pulse-decorators';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';
import type { GlobeConfig, PaperConfig } from '../../types';

/** Defaults for the new vintage-atlas effects. */
const DEFAULTS = {
  surfaceVignette: 0.18,
  borderWidth: 1,
  bordersEnabled: true,
  inkBleed: { enabled: true, opacity: 0.3, spread: 0.0008 },
  stipple: { enabled: false, density: 1.5, size: 1 },
  fillMode: 'single' as const,
  gridStep: 15,
  gridMajorEvery: 3,
  sepia: { enabled: false, color: '#8b6f47', opacity: 0.18 },
  vignette: { enabled: false, color: '#3a2a14', intensity: 0.45, radius: 0.4 },
  compassRose: { enabled: false, lat: 32, lng: -38, color: '#5b3a1f', opacity: 0.55, size: 8 },
  agingMarks: { enabled: false, count: 12, color: '#7a5a2c', intensity: 0.22, seed: 1 },
  watermark: {
    enabled: false,
    text: 'ATLAS',
    color: '#5b3a1f',
    opacity: 0.18,
    size: 28,
    position: 'bottomRight' as PaperWatermarkPosition,
  },
} as const;

/**
 * Live-update extension for the paper kind. Wired into `partial.paper`
 * dispatch in `globe/create-globe.ts` — every knob in `PaperConfig` can
 * now flow through `globe.update({ paper: ... })` without rebuilding.
 */
export interface PaperKindHandle extends KindHandle {
  setPaperConfig?(partial: PaperConfig): void;
}

/**
 * Paper kind — vintage atlas vibe. Cream parchment sphere overlay on top of
 * the default globe mesh, hand-drawn ink borders with deterministic
 * perpendicular jitter, optional pastel country fill, optional faint
 * lat/lng atlas grid. Plus a stack of optional aging effects:
 *  - sepia overlay (warm tint)
 *  - DOM vignette (corner darkening)
 *  - compass rose (anchored watermark on the surface)
 *  - aging marks (tea-stain blotches)
 *  - DOM watermark text ("ATLAS" by default)
 *  - optional dotted/stipple border style
 *  - optional ink-bleed glow around the borders
 *
 * Country interaction (hover/click + highlight) is fully supported via the
 * shared picking infrastructure.
 */
export const paperKind: KindModule = {
  kind: 'paper',
  hasCountryInteraction: true,
  layers: {
    LabelsLayer: PaperLabelsLayer,
    StarfieldLayer: PaperStarfieldLayer,
    ArcsLayer: PaperArcsLayer,
    MarkersLayer: PaperMarkersLayer,
    AtmosphereLayer: PaperAtmosphereLayer,
    SelectionLayer: PaperSelectionLayer,
  },
  build({ globeGroup, features, tokens, config }: KindBuildContext): PaperKindHandle {
    const paper = (config.paper ?? {}) as PaperConfig;

    const surfaceCfg = paper.surface ?? {};
    const bordersCfg = paper.borders ?? {};
    const fillCfg = paper.fill ?? {};
    const gridCfg = paper.grid ?? {};
    const sepiaCfg = paper.sepia ?? {};
    const vignetteCfg = paper.vignette ?? {};
    const compassCfg = paper.compassRose ?? {};
    const agingCfg = paper.agingMarks ?? {};
    const watermarkCfg = paper.watermark ?? {};

    const fillEnabled = fillCfg.enabled ?? true;
    const gridEnabled = gridCfg.enabled ?? true;
    const bordersEnabled = bordersCfg.enabled ?? DEFAULTS.bordersEnabled;
    const roughness =
      bordersCfg.roughness ?? paper.borderRoughness ?? tokens['paper.borderRoughness'];

    // Hide the default globe mesh while paper is active — its solid color
    // would punch through the cream surface at low zoom angles.
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
      color: surfaceCfg.color || tokens['paper.surfaceColor'],
      noiseAmount: surfaceCfg.noiseAmount ?? tokens['paper.surfaceNoiseAmount'],
      vignette: surfaceCfg.vignette ?? DEFAULTS.surfaceVignette,
    });
    globeGroup.add(surface.mesh);

    const fill = new PaperFillLayer({
      features: features as ReadonlyArray<CountryFeature>,
      color: fillCfg.color || tokens['paper.fillColor'],
      opacity: fillCfg.opacity ?? tokens['paper.fillOpacity'],
      mode: fillCfg.mode ?? DEFAULTS.fillMode,
    });
    fill.setVisible(fillEnabled);
    globeGroup.add(fill.group);

    const grid = new PaperGridLayer({
      color: gridCfg.color || tokens['paper.gridColor'],
      opacity: gridCfg.opacity ?? tokens['paper.gridOpacity'],
      stepDeg: gridCfg.stepDeg ?? DEFAULTS.gridStep,
      majorEvery: gridCfg.majorEvery ?? DEFAULTS.gridMajorEvery,
      majorOpacity: gridCfg.majorOpacity ?? Math.min(1, (gridCfg.opacity ?? tokens['paper.gridOpacity']) * 1.6),
    });
    grid.setVisible(gridEnabled);
    globeGroup.add(grid.group);

    const borders = new PaperBordersLayer({
      features: features as ReadonlyArray<CountryFeature>,
      color: bordersCfg.color || tokens['paper.borderColor'],
      opacity: bordersCfg.opacity ?? tokens['paper.borderOpacity'],
      roughness,
      width: bordersCfg.width ?? DEFAULTS.borderWidth,
      stipple: {
        enabled: bordersCfg.stipple?.enabled ?? DEFAULTS.stipple.enabled,
        density: bordersCfg.stipple?.density ?? DEFAULTS.stipple.density,
        size: bordersCfg.stipple?.size ?? DEFAULTS.stipple.size,
      },
      inkBleed: {
        enabled: bordersCfg.inkBleed?.enabled ?? DEFAULTS.inkBleed.enabled,
        color: bordersCfg.inkBleed?.color || (bordersCfg.color || tokens['paper.borderColor']),
        opacity: bordersCfg.inkBleed?.opacity ?? DEFAULTS.inkBleed.opacity,
        spread: bordersCfg.inkBleed?.spread ?? DEFAULTS.inkBleed.spread,
      },
    });
    borders.setVisible(bordersEnabled);
    globeGroup.add(borders.group);

    const sepia = new PaperSepiaLayer({
      enabled: sepiaCfg.enabled ?? DEFAULTS.sepia.enabled,
      color: sepiaCfg.color || DEFAULTS.sepia.color,
      opacity: sepiaCfg.opacity ?? DEFAULTS.sepia.opacity,
    });
    globeGroup.add(sepia.mesh);

    const compass = new PaperCompassRose({
      enabled: compassCfg.enabled ?? DEFAULTS.compassRose.enabled,
      lat: compassCfg.lat ?? DEFAULTS.compassRose.lat,
      lng: compassCfg.lng ?? DEFAULTS.compassRose.lng,
      color: compassCfg.color || DEFAULTS.compassRose.color,
      opacity: compassCfg.opacity ?? DEFAULTS.compassRose.opacity,
      size: compassCfg.size ?? DEFAULTS.compassRose.size,
    });
    globeGroup.add(compass.group);

    const aging = new PaperAgingMarks({
      enabled: agingCfg.enabled ?? DEFAULTS.agingMarks.enabled,
      count: agingCfg.count ?? DEFAULTS.agingMarks.count,
      color: agingCfg.color || DEFAULTS.agingMarks.color,
      intensity: agingCfg.intensity ?? DEFAULTS.agingMarks.intensity,
      seed: agingCfg.seed ?? DEFAULTS.agingMarks.seed,
    });
    globeGroup.add(aging.group);

    // DOM-overlay layers — only mount if the container is available
    // (browser-only; bail out gracefully under SSR / test harness).
    const container = (config as GlobeConfig).container;
    let vignette: PaperVignetteOverlay | null = null;
    let watermark: PaperWatermark | null = null;
    if (container && typeof document !== 'undefined') {
      vignette = new PaperVignetteOverlay({
        container,
        enabled: vignetteCfg.enabled ?? DEFAULTS.vignette.enabled,
        color: vignetteCfg.color || DEFAULTS.vignette.color,
        intensity: vignetteCfg.intensity ?? DEFAULTS.vignette.intensity,
        radius: vignetteCfg.radius ?? DEFAULTS.vignette.radius,
      });
      watermark = new PaperWatermark({
        container,
        enabled: watermarkCfg.enabled ?? DEFAULTS.watermark.enabled,
        text: watermarkCfg.text || DEFAULTS.watermark.text,
        color: watermarkCfg.color || DEFAULTS.watermark.color,
        opacity: watermarkCfg.opacity ?? DEFAULTS.watermark.opacity,
        size: watermarkCfg.size ?? DEFAULTS.watermark.size,
        position: watermarkCfg.position ?? DEFAULTS.watermark.position,
      });
    }

    const focusPulse = buildPaperFocusPulse({
      globeGroup,
      enabled: true,
      color: bordersCfg.color || tokens['paper.borderColor'],
      durationSeconds: 1.6,
    });

    return {
      decorations: { focusPulse },
      dispose() {
        borders.dispose();
        globeGroup.remove(borders.group);
        grid.dispose();
        globeGroup.remove(grid.group);
        fill.dispose();
        globeGroup.remove(fill.group);
        sepia.dispose();
        globeGroup.remove(sepia.mesh);
        compass.dispose();
        globeGroup.remove(compass.group);
        aging.dispose();
        globeGroup.remove(aging.group);
        surface.dispose();
        globeGroup.remove(surface.mesh);
        vignette?.dispose();
        watermark?.dispose();
        for (const m of defaultMeshes) m.visible = true;
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        surface.setVisible(visible);
        fill.setVisible(visible && fillEnabled);
        grid.setVisible(visible && gridEnabled);
        borders.setVisible(visible && bordersEnabled);
        sepia.setVisible(visible);
        compass.setVisible(visible);
        aging.setVisible(visible);
        // Vignette + watermark are DOM siblings of the canvas so we
        // hide them with the canvas.
        if (vignette) vignette.setEnabled(visible && (paper.vignette?.enabled ?? DEFAULTS.vignette.enabled));
        if (watermark) watermark.setEnabled(visible && (paper.watermark?.enabled ?? DEFAULTS.watermark.enabled));
      },

      /**
       * Live-update for every paper sub-section. Each branch checks
       * which fields are present in `next` and routes them to the
       * relevant layer's setter. Color / numeric reset semantics
       * follow the rest of the kinds: empty-string color = reset,
       * non-positive numeric = reset where the natural domain is > 0.
       */
      setPaperConfig(next: PaperConfig) {
        // Surface
        if (next.surface) {
          const s = next.surface;
          if (s.color !== undefined) {
            if (s.color === '') surface.resetColor();
            else surface.setColor(s.color);
          }
          if (s.noiseAmount !== undefined) {
            if (s.noiseAmount < 0) surface.resetNoise();
            else surface.setNoise(s.noiseAmount);
          }
          if (s.vignette !== undefined) {
            if (s.vignette < 0) surface.resetVignette();
            else surface.setVignette(s.vignette);
          }
        }

        // Borders
        if (next.borderRoughness !== undefined && next.borderRoughness >= 0) {
          borders.setRoughness(next.borderRoughness);
        }
        if (next.borders) {
          const b = next.borders;
          if (b.enabled !== undefined) borders.setVisible(b.enabled);
          if (b.color !== undefined) {
            if (b.color === '') borders.resetColor();
            else borders.setColor(b.color);
          }
          if (b.opacity !== undefined) {
            if (b.opacity < 0) borders.resetOpacity();
            else borders.setOpacity(b.opacity);
          }
          if (b.roughness !== undefined && b.roughness >= 0) {
            borders.setRoughness(b.roughness);
          }
          if (b.width !== undefined) {
            if (b.width <= 0) borders.resetWidth();
            else borders.setWidth(b.width);
          }
          if (b.stipple) {
            borders.setStipple({
              ...(b.stipple.enabled !== undefined && { enabled: b.stipple.enabled }),
              ...(b.stipple.density !== undefined && b.stipple.density > 0 && {
                density: b.stipple.density,
              }),
              ...(b.stipple.size !== undefined && b.stipple.size > 0 && {
                size: b.stipple.size,
              }),
            });
          }
          if (b.inkBleed) {
            const ib = b.inkBleed;
            borders.setInkBleed({
              ...(ib.enabled !== undefined && { enabled: ib.enabled }),
              ...(ib.color !== undefined && ib.color !== '' && { color: ib.color }),
              ...(ib.opacity !== undefined && ib.opacity >= 0 && { opacity: ib.opacity }),
              ...(ib.spread !== undefined && ib.spread >= 0 && { spread: ib.spread }),
            });
          }
        }

        // Fill
        if (next.fill) {
          const f = next.fill;
          if (f.enabled !== undefined) fill.setVisible(f.enabled);
          if (f.color !== undefined) {
            if (f.color === '') fill.resetColor();
            else fill.setColor(f.color);
          }
          if (f.opacity !== undefined) {
            if (f.opacity < 0) fill.resetOpacity();
            else fill.setOpacity(f.opacity);
          }
          if (f.mode !== undefined) fill.setMode(f.mode);
        }

        // Grid
        if (next.grid) {
          const g = next.grid;
          if (g.enabled !== undefined) grid.setVisible(g.enabled);
          if (g.color !== undefined) {
            if (g.color === '') grid.resetColor();
            else grid.setColor(g.color);
          }
          if (g.opacity !== undefined) {
            if (g.opacity < 0) grid.resetOpacity();
            else grid.setOpacity(g.opacity);
          }
          if (g.stepDeg !== undefined && g.stepDeg > 0) grid.setStep(g.stepDeg);
          if (g.majorEvery !== undefined && g.majorEvery > 0) grid.setMajorEvery(g.majorEvery);
          if (g.majorOpacity !== undefined) {
            if (g.majorOpacity < 0) grid.resetMajorOpacity();
            else grid.setMajorOpacity(g.majorOpacity);
          }
        }

        // Sepia
        if (next.sepia) {
          const s = next.sepia;
          if (s.enabled !== undefined) sepia.setEnabled(s.enabled);
          if (s.color !== undefined) {
            if (s.color === '') sepia.resetColor();
            else sepia.setColor(s.color);
          }
          if (s.opacity !== undefined) {
            if (s.opacity < 0) sepia.resetOpacity();
            else sepia.setOpacity(s.opacity);
          }
        }

        // Vignette
        if (next.vignette && vignette) {
          const v = next.vignette;
          if (v.enabled !== undefined) vignette.setEnabled(v.enabled);
          if (v.color !== undefined) {
            if (v.color === '') vignette.resetColor();
            else vignette.setColor(v.color);
          }
          if (v.intensity !== undefined) {
            if (v.intensity < 0) vignette.resetIntensity();
            else vignette.setIntensity(v.intensity);
          }
          if (v.radius !== undefined) {
            if (v.radius < 0) vignette.resetRadius();
            else vignette.setRadius(v.radius);
          }
        }

        // Compass rose
        if (next.compassRose) {
          const c = next.compassRose;
          if (c.enabled !== undefined) compass.setEnabled(c.enabled);
          if (c.color !== undefined) {
            if (c.color === '') compass.resetColor();
            else compass.setColor(c.color);
          }
          if (c.opacity !== undefined) {
            if (c.opacity < 0) compass.resetOpacity();
            else compass.setOpacity(c.opacity);
          }
          if (c.size !== undefined) {
            if (c.size <= 0) compass.resetSize();
            else compass.setSize(c.size);
          }
          // Lat/lng can be any number — only apply when both are
          // present; partial updates would shift the rose unpredictably.
          if (c.lat !== undefined && c.lng !== undefined) {
            compass.setPosition(c.lat, c.lng);
          } else if (c.lat !== undefined || c.lng !== undefined) {
            // Caller passed only one — keep the unspecified axis from
            // the current default. setPosition is the cheapest path.
            const lat = c.lat ?? compassCfg.lat ?? DEFAULTS.compassRose.lat;
            const lng = c.lng ?? compassCfg.lng ?? DEFAULTS.compassRose.lng;
            compass.setPosition(lat, lng);
          }
        }

        // Aging marks
        if (next.agingMarks) {
          const a = next.agingMarks;
          if (a.enabled !== undefined) aging.setEnabled(a.enabled);
          if (a.color !== undefined) {
            if (a.color === '') aging.resetColor();
            else aging.setColor(a.color);
          }
          if (a.intensity !== undefined) {
            if (a.intensity < 0) aging.resetIntensity();
            else aging.setIntensity(a.intensity);
          }
          if (a.count !== undefined) {
            if (a.count < 0) aging.resetCount();
            else aging.setCount(a.count);
          }
          if (a.seed !== undefined) aging.setSeed(a.seed);
        }

        // Watermark
        if (next.watermark && watermark) {
          const w = next.watermark;
          if (w.enabled !== undefined) watermark.setEnabled(w.enabled);
          if (w.text !== undefined) {
            if (w.text === '') watermark.resetText();
            else watermark.setText(w.text);
          }
          if (w.color !== undefined) {
            if (w.color === '') watermark.resetColor();
            else watermark.setColor(w.color);
          }
          if (w.opacity !== undefined) {
            if (w.opacity < 0) watermark.resetOpacity();
            else watermark.setOpacity(w.opacity);
          }
          if (w.size !== undefined) {
            if (w.size <= 0) watermark.resetSize();
            else watermark.setSize(w.size);
          }
          if (w.position !== undefined) watermark.setPosition(w.position);
        }
      },
    };
  },
};

export { PaperBordersLayer } from './borders';
export { PaperFillLayer } from './fill';
export { PaperGridLayer } from './grid';
export { PaperSurfaceLayer } from './surface';
export { PaperSepiaLayer } from './sepia';
export { PaperVignetteOverlay } from './vignette';
export { PaperCompassRose } from './compass-rose';
export { PaperAgingMarks } from './aging-marks';
export { PaperWatermark } from './watermark';
export { jitterRing, seededJitter } from './jitter';
