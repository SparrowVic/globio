import { HologramBordersLayer } from './hologram-borders-layer';
import { HologramShellLayer } from './hologram-shell-layer';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Hologram kind — semi-transparent turquoise/cyan globe shell with animated
 * horizontal CRT scanlines, soft Fresnel rim glow at the silhouette, and
 * additive cyan country borders that read like a data feed. Occasional
 * 80–250ms glitch transients shear a horizontal band of the borders. An
 * optional outer shell amplifies the silhouette glow.
 *
 * Reads tokens `hologram.{...}`. Per-instance toggles via `config.hologram`.
 * Country interaction is enabled — hover/click works through the shared
 * picking + highlight infrastructure (the base globe sphere acts as the
 * picking surface even though the hologram shell is transparent).
 */
export const hologramKind: KindModule = {
  kind: 'hologram',
  hasCountryInteraction: true,
  build({
    globeGroup,
    features,
    tokens,
    config,
    globeSurfaceMesh,
  }: KindBuildContext): KindHandle {
    const cfg = config.hologram;

    // Hide the opaque default sphere — the hologram's transparent shader
    // shell replaces it visually. Country picking/highlight still works
    // through their dedicated layers; off-country surface clicks are inert.
    const previouslyVisible = globeSurfaceMesh.visible;
    globeSurfaceMesh.visible = false;

    const scanlinesEnabled = cfg?.scanlines?.enabled ?? true;
    const rimEnabled = cfg?.rimGlow?.enabled ?? true;
    const glitchEnabled = cfg?.glitch?.enabled ?? true;
    const outerGlowEnabled = cfg?.outerGlow?.enabled ?? true;

    const shell = new HologramShellLayer({
      color: tokens['hologram.color'],
      shellOpacity: tokens['hologram.shellOpacity'],
      rimGlow: tokens['hologram.rimGlow'],
      scanlineFreq: tokens['hologram.scanlineFreq'],
      scanlineSpeed: tokens['hologram.scanlineSpeed'],
      scanlinesEnabled,
      rimEnabled,
      outerGlowEnabled,
      outerGlowOpacity: tokens['hologram.outerGlowOpacity'],
    });
    globeGroup.add(shell.group);

    const borders = new HologramBordersLayer({
      features: features as ReadonlyArray<CountryFeature>,
      color: tokens['hologram.borderColor'],
      intensity: tokens['hologram.borderIntensity'],
      glitch: {
        enabled: glitchEnabled,
        intervalMin: cfg?.glitch?.intervalMin ?? tokens['hologram.glitchIntervalMin'],
        intervalMax: cfg?.glitch?.intervalMax ?? tokens['hologram.glitchIntervalMax'],
        amount: tokens['hologram.glitchAmount'],
      },
    });
    globeGroup.add(borders.group);

    return {
      dispose() {
        globeSurfaceMesh.visible = previouslyVisible;
        shell.dispose();
        globeGroup.remove(shell.group);
        borders.dispose();
        globeGroup.remove(borders.group);
      },
      setVisible(visible: boolean) {
        shell.setVisible(visible);
        borders.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        shell.update(elapsedSeconds);
        borders.update(elapsedSeconds, delta);
      },
    };
  },
};

export { HologramShellLayer } from './hologram-shell-layer';
export { HologramBordersLayer } from './hologram-borders-layer';
export { fresnelFactor, scanlineMod, nextGlitchTime } from './hologram-extras';
