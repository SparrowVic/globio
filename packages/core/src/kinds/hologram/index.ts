import { HologramBordersLayer } from './borders';
import { HologramShellLayer } from './shell';
import { HologramLabelsLayer } from './labels';
import { HologramStarfieldLayer } from './starfield';
import { HologramArcsLayer } from './arcs';
import { HologramMarkersLayer } from './markers';
import { HologramAtmosphereLayer } from './atmosphere';
import { HologramHoverLayer } from './hover';
import { buildHologramFocusPulse } from '../shared/focus-pulse-decorators';
import type { CountryFeature } from '../../renderer/country-feature';
import type { HologramConfig } from '../../types/kinds';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Extension of `KindHandle` for hologram. Exposes a single `setHologramConfig`
 * that accepts the same partial structure as `GlobeConfig.hologram` and
 * routes each branch into the per-layer live setters. Every knob in
 * `HologramConfig` is live; nothing requires a rebuild.
 */
export interface HologramKindHandle extends KindHandle {
  setHologramConfig?(partial: HologramConfig): void;
}

/**
 * Hologram kind — semi-transparent turquoise/cyan globe shell with animated
 * horizontal CRT scanlines, soft Fresnel rim glow at the silhouette, and
 * additive cyan country borders that read like a data feed. Plus, layered
 * on top: chromatic aberration at the silhouette, animated holographic
 * grain, a slow projector "hum" rotating around the rim, an optional data
 * feed scan band, moiré phase shimmer, and tickmark calibration along
 * the rim. Occasional 80–250ms glitch transients shear a horizontal band
 * of the borders with an RGB-channel-split fringe.
 *
 * Reads tokens `hologram.{...}`. Per-instance toggles via `config.hologram`.
 * Country interaction is enabled — hover/click works through the shared
 * picking + highlight infrastructure (the base globe sphere acts as the
 * picking surface even though the hologram shell is transparent).
 */
export const hologramKind: KindModule = {
  kind: 'hologram',
  hasCountryInteraction: true,
  layers: {
    LabelsLayer: HologramLabelsLayer,
    StarfieldLayer: HologramStarfieldLayer,
    ArcsLayer: HologramArcsLayer,
    MarkersLayer: HologramMarkersLayer,
    AtmosphereLayer: HologramAtmosphereLayer,
    HoverLayer: HologramHoverLayer,
  },
  build({
    globeGroup,
    features,
    tokens,
    config,
    globeSurfaceMesh,
  }: KindBuildContext): HologramKindHandle {
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
      ...(cfg?.scanlines?.opacity !== undefined && {
        scanlineOpacity: cfg.scanlines.opacity,
      }),
      ...(cfg?.scanlines?.direction !== undefined && {
        scanlineDirection: cfg.scanlines.direction,
      }),
      rimEnabled,
      ...(cfg?.rimGlow?.color !== undefined && cfg.rimGlow.color !== '' && {
        rimColor: cfg.rimGlow.color,
      }),
      ...(cfg?.rimGlow?.width !== undefined && cfg.rimGlow.width > 0 && {
        rimWidth: cfg.rimGlow.width,
      }),
      outerGlowEnabled,
      ...(cfg?.outerGlow?.color !== undefined && cfg.outerGlow.color !== '' && {
        outerGlowColor: cfg.outerGlow.color,
      }),
      outerGlowOpacity:
        cfg?.outerGlow?.intensity && cfg.outerGlow.intensity > 0
          ? cfg.outerGlow.intensity
          : tokens['hologram.outerGlowOpacity'],
      ...(cfg?.outerGlow?.spread !== undefined && cfg.outerGlow.spread > 1 && {
        outerGlowSpread: cfg.outerGlow.spread,
      }),
      ...(cfg?.chromaticAberration?.enabled !== undefined && {
        chromaticAberrationEnabled: cfg.chromaticAberration.enabled,
      }),
      ...(cfg?.chromaticAberration?.amount !== undefined && {
        chromaticAberrationAmount: cfg.chromaticAberration.amount,
      }),
      ...(cfg?.chromaticAberration?.mode !== undefined && {
        chromaticAberrationMode: cfg.chromaticAberration.mode,
      }),
      ...(cfg?.noise?.enabled !== undefined && {
        noiseEnabled: cfg.noise.enabled,
      }),
      ...(cfg?.noise?.intensity !== undefined && {
        noiseIntensity: cfg.noise.intensity,
      }),
      ...(cfg?.noise?.scale !== undefined && {
        noiseScale: cfg.noise.scale,
      }),
      ...(cfg?.noise?.speed !== undefined && {
        noiseSpeed: cfg.noise.speed,
      }),
      ...(cfg?.projectorPulse?.enabled !== undefined && {
        projectorPulseEnabled: cfg.projectorPulse.enabled,
      }),
      ...(cfg?.projectorPulse?.speed !== undefined && {
        projectorPulseSpeed: cfg.projectorPulse.speed,
      }),
      ...(cfg?.projectorPulse?.amplitude !== undefined && {
        projectorPulseAmplitude: cfg.projectorPulse.amplitude,
      }),
      ...(cfg?.projectorPulse?.color !== undefined &&
        cfg.projectorPulse.color !== '' && {
          projectorPulseColor: cfg.projectorPulse.color,
        }),
      ...(cfg?.dataScan?.enabled !== undefined && {
        dataScanEnabled: cfg.dataScan.enabled,
      }),
      ...(cfg?.dataScan?.speed !== undefined && {
        dataScanSpeed: cfg.dataScan.speed,
      }),
      ...(cfg?.dataScan?.width !== undefined && {
        dataScanWidth: cfg.dataScan.width,
      }),
      ...(cfg?.dataScan?.opacity !== undefined && {
        dataScanOpacity: cfg.dataScan.opacity,
      }),
      ...(cfg?.dataScan?.axis !== undefined && {
        dataScanAxis: cfg.dataScan.axis,
      }),
      ...(cfg?.dataScan?.color !== undefined && cfg.dataScan.color !== '' && {
        dataScanColor: cfg.dataScan.color,
      }),
      ...(cfg?.phaseShimmer?.enabled !== undefined && {
        phaseShimmerEnabled: cfg.phaseShimmer.enabled,
      }),
      ...(cfg?.phaseShimmer?.scale !== undefined && {
        phaseShimmerScale: cfg.phaseShimmer.scale,
      }),
      ...(cfg?.phaseShimmer?.intensity !== undefined && {
        phaseShimmerIntensity: cfg.phaseShimmer.intensity,
      }),
      ...(cfg?.phaseShimmer?.speed !== undefined && {
        phaseShimmerSpeed: cfg.phaseShimmer.speed,
      }),
      ...(cfg?.calibrationTicks?.enabled !== undefined && {
        calibrationTicksEnabled: cfg.calibrationTicks.enabled,
      }),
      ...(cfg?.calibrationTicks?.count !== undefined && {
        calibrationTicksCount: cfg.calibrationTicks.count,
      }),
      ...(cfg?.calibrationTicks?.length !== undefined && {
        calibrationTicksLength: cfg.calibrationTicks.length,
      }),
      ...(cfg?.calibrationTicks?.opacity !== undefined && {
        calibrationTicksOpacity: cfg.calibrationTicks.opacity,
      }),
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
        amount:
          cfg?.glitch?.amplitude && cfg.glitch.amplitude > 0
            ? cfg.glitch.amplitude
            : tokens['hologram.glitchAmount'],
        ...(cfg?.glitch?.channelShift !== undefined && {
          channelShift: cfg.glitch.channelShift,
        }),
      },
    });
    globeGroup.add(borders.group);

    const focusPulse = buildHologramFocusPulse({
      globeGroup,
      enabled: true,
      color: tokens['hologram.borderColor'],
      durationSeconds: 1.0,
    });

    return {
      decorations: { focusPulse },
      dispose() {
        globeSurfaceMesh.visible = previouslyVisible;
        shell.dispose();
        globeGroup.remove(shell.group);
        borders.dispose();
        globeGroup.remove(borders.group);
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        shell.setVisible(visible);
        borders.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        shell.update(elapsedSeconds);
        borders.update(elapsedSeconds, delta);
      },
      /**
       * Live update for hologram extras. Each top-level branch maps to a
       * group of shader uniforms / layer flags; the next render frame
       * picks up the change. No rebuild is necessary for any field.
       */
      setHologramConfig(partial: HologramConfig) {
        if (partial.scanlines !== undefined) {
          const s = partial.scanlines;
          if (s.enabled !== undefined) shell.setScanlinesEnabled(s.enabled);
          if (s.density !== undefined) shell.setScanlineDensity(s.density);
          if (s.speed !== undefined) shell.setScanlineSpeed(s.speed);
          if (s.opacity !== undefined) shell.setScanlineOpacity(s.opacity);
          if (s.direction !== undefined) shell.setScanlineDirection(s.direction);
        }
        if (partial.rimGlow !== undefined) {
          const r = partial.rimGlow;
          if (r.enabled !== undefined) shell.setRimEnabled(r.enabled);
          if (r.color !== undefined) shell.setRimColor(r.color);
          if (r.intensity !== undefined) shell.setRimIntensity(r.intensity);
          if (r.width !== undefined) shell.setRimWidth(r.width);
        }
        if (partial.glitch !== undefined) {
          const g = partial.glitch;
          if (g.enabled !== undefined) borders.setGlitchEnabled(g.enabled);
          if (g.intervalMin !== undefined || g.intervalMax !== undefined) {
            const cur = {
              min: g.intervalMin ?? tokens['hologram.glitchIntervalMin'],
              max: g.intervalMax ?? tokens['hologram.glitchIntervalMax'],
            };
            borders.setGlitchInterval(cur.min, cur.max);
          }
          if (g.amplitude !== undefined) borders.setGlitchAmount(g.amplitude);
          if (g.channelShift !== undefined) borders.setGlitchChannelShift(g.channelShift);
        }
        if (partial.outerGlow !== undefined) {
          const o = partial.outerGlow;
          if (o.enabled !== undefined) shell.setOuterGlowEnabled(o.enabled);
          if (o.color !== undefined) shell.setOuterGlowColor(o.color);
          if (o.intensity !== undefined) shell.setOuterGlowIntensity(o.intensity);
          if (o.spread !== undefined) shell.setOuterGlowSpread(o.spread);
        }
        if (partial.chromaticAberration !== undefined) {
          const c = partial.chromaticAberration;
          if (c.enabled !== undefined) shell.setChromaticAberrationEnabled(c.enabled);
          if (c.amount !== undefined) shell.setChromaticAberrationAmount(c.amount);
          if (c.mode !== undefined) shell.setChromaticAberrationMode(c.mode);
        }
        if (partial.noise !== undefined) {
          const n = partial.noise;
          if (n.enabled !== undefined) shell.setNoiseEnabled(n.enabled);
          if (n.intensity !== undefined) shell.setNoiseIntensity(n.intensity);
          if (n.scale !== undefined) shell.setNoiseScale(n.scale);
          if (n.speed !== undefined) shell.setNoiseSpeed(n.speed);
        }
        if (partial.projectorPulse !== undefined) {
          const p = partial.projectorPulse;
          if (p.enabled !== undefined) shell.setProjectorPulseEnabled(p.enabled);
          if (p.speed !== undefined) shell.setProjectorPulseSpeed(p.speed);
          if (p.amplitude !== undefined) shell.setProjectorPulseAmplitude(p.amplitude);
          if (p.color !== undefined) shell.setProjectorPulseColor(p.color);
        }
        if (partial.dataScan !== undefined) {
          const d = partial.dataScan;
          if (d.enabled !== undefined) shell.setDataScanEnabled(d.enabled);
          if (d.speed !== undefined) shell.setDataScanSpeed(d.speed);
          if (d.width !== undefined) shell.setDataScanWidth(d.width);
          if (d.opacity !== undefined) shell.setDataScanOpacity(d.opacity);
          if (d.axis !== undefined) shell.setDataScanAxis(d.axis);
          if (d.color !== undefined) shell.setDataScanColor(d.color);
        }
        if (partial.phaseShimmer !== undefined) {
          const s = partial.phaseShimmer;
          if (s.enabled !== undefined) shell.setPhaseShimmerEnabled(s.enabled);
          if (s.scale !== undefined) shell.setPhaseShimmerScale(s.scale);
          if (s.intensity !== undefined) shell.setPhaseShimmerIntensity(s.intensity);
          if (s.speed !== undefined) shell.setPhaseShimmerSpeed(s.speed);
        }
        if (partial.calibrationTicks !== undefined) {
          const t = partial.calibrationTicks;
          if (t.enabled !== undefined) shell.setCalibrationTicksEnabled(t.enabled);
          if (t.count !== undefined) shell.setCalibrationTicksCount(t.count);
          if (t.length !== undefined) shell.setCalibrationTicksLength(t.length);
          if (t.opacity !== undefined) shell.setCalibrationTicksOpacity(t.opacity);
        }
      },
    } satisfies HologramKindHandle;
  },
};

export { HologramShellLayer } from './shell';
export { HologramBordersLayer } from './borders';
export { fresnelFactor, scanlineMod, nextGlitchTime } from './extras';
