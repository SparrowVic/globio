import { WIREFRAME_DEFAULT_RADIUS, WireframeGridLayer } from './grid';
import { WireframeEmphasisLayer } from './emphasis';
import { WireframeActiveRing } from './active-ring';
import { WireframePoleStreams } from './pole-streams';
import { WireframeEquatorBeam } from './equator-beam';
import { WireframeDataPackets } from './data-packets';
import { WireframeCompassMarkers } from './compass-markers';
import { buildWireframeFocusPulse } from '../shared/focus-pulse-decorators';
import type { Vector3 } from 'three';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';
import type { GlobeConfig, LatLng } from '../../types';

const EMPHASIS_RADIUS_FACTOR = 1.0008;
const EQUATOR_BEAM_RADIUS_FACTOR = 1.0014;

/**
 * Wireframe-kind handle widening — exposes:
 * - `setActiveCountry` so globe.ts can drive the active-country ring from
 *   the same place it drives the outline kind's hover-glow.
 * - `setWireframeConfig` for live updates dispatched via
 *   `globe.update({ wireframe: ... })`.
 */
export interface WireframeKindHandle extends KindHandle {
  setActiveCountry?(id: string | null): void;
  setWireframeConfig?(next: NonNullable<GlobeConfig['wireframe']>): void;
}

/**
 * Wireframe kind — Tron-style lat/lng grid only, no country geometry. Hover
 * / click are disabled by default because there's no visible country
 * surface to interact with; markers + arcs still raycast normally.
 *
 * Reads tokens `wireframe.{color,opacity,density,pulse,...}`. Per-instance
 * overrides come from `config.wireframe`. Sub-features cover:
 *  - Click pulse — radial wave from any surface click
 *  - Equator + tropic + meridian emphasis (separate layer)
 *  - Equator beam — thicker pulsing line specifically at the equator
 *  - CRT-style glitch shears
 *  - Active-country ring (pinned)
 *  - Pole-to-pole streams (particles falling along meridians)
 *  - Data packets — luminous blips racing along lat/lng lines
 *  - Compass markers — N/S/E/W cardinal letters above the surface
 *  - Major/minor line hierarchy boost in the grid shader
 *  - Autonomous grid pulses + pole pulses (radial waves from a fixed/random
 *    origin or from the geographic poles)
 *
 * Each sub-feature is individually toggleable via the matching field on
 * `WireframeConfig`. Every knob is live-updatable through
 * `globe.update({ wireframe: ... })`.
 */
export const wireframeKind: KindModule = {
  kind: 'wireframe',
  hasCountryInteraction: false,
  build({ globeGroup, features, tokens, config }: KindBuildContext): WireframeKindHandle {
    const wf = config.wireframe;

    /* ───────────── construction-time defaults ───────────── */

    const baseColor =
      wf?.color !== undefined && wf.color !== '' ? wf.color : tokens['wireframe.color'];
    const baseOpacity =
      wf?.opacity !== undefined && wf.opacity > 0 ? wf.opacity : tokens['wireframe.opacity'];

    const clickPulseEnabled = wf?.clickPulse?.enabled ?? true;
    const emphasisEnabled = wf?.emphasis?.enabled ?? tokens['wireframe.emphasisEnabled'];
    const glitchEnabled = wf?.glitch?.enabled ?? tokens['wireframe.glitchEnabled'];
    const activeRingEnabled = wf?.activeRing?.enabled ?? true;
    const poleStreamsEnabled = wf?.poleStreams?.enabled ?? true;
    const equatorBeamEnabled = wf?.equatorBeam?.enabled ?? false;
    const dataPacketsEnabled = wf?.dataPackets?.enabled ?? false;
    const compassEnabled = wf?.compass?.enabled ?? false;
    const gridPulseEnabled = wf?.gridPulse?.enabled ?? false;
    const polePulseEnabled = wf?.polePulse?.enabled ?? false;
    const hierarchyEnabled = wf?.hierarchy?.enabled ?? true;

    const clickPulseColor =
      wf?.clickPulse?.color !== undefined && wf.clickPulse.color !== ''
        ? wf.clickPulse.color
        : tokens['wireframe.pulseColor'];

    const layer = new WireframeGridLayer({
      color: baseColor,
      opacity: baseOpacity,
      density: wf?.density ?? tokens['wireframe.density'],
      pulse: wf?.pulse ?? tokens['wireframe.pulse'],
      ...(wf?.pulseSpeed !== undefined && wf.pulseSpeed > 0 && { pulseSpeed: wf.pulseSpeed }),
      radius: WIREFRAME_DEFAULT_RADIUS,
      hierarchy: {
        enabled: hierarchyEnabled,
        majorStepDeg: wf?.hierarchy?.majorStepDeg ?? 30,
        majorBoost: wf?.hierarchy?.majorBoost ?? 1.6,
        minorBoost: wf?.hierarchy?.minorBoost ?? 0.85,
      },
      clickPulse: {
        enabled: clickPulseEnabled,
        color: clickPulseColor,
        speed: wf?.clickPulse?.speed ?? tokens['wireframe.pulseSpeed'],
        width: wf?.clickPulse?.width ?? tokens['wireframe.pulseWidth'],
        boost: wf?.clickPulse?.boost ?? tokens['wireframe.pulseBoost'],
        maxConcurrent: wf?.clickPulse?.maxConcurrent ?? 4,
      },
      glitch: {
        enabled: glitchEnabled,
        intervalMin: wf?.glitch?.intervalMin ?? tokens['wireframe.glitchIntervalMin'],
        intervalMax: wf?.glitch?.intervalMax ?? tokens['wireframe.glitchIntervalMax'],
      },
      gridPulse: {
        enabled: gridPulseEnabled,
        intervalSec: wf?.gridPulse?.intervalSec ?? 4,
        speed: wf?.gridPulse?.speed ?? 1.2,
        width: wf?.gridPulse?.width ?? 0.16,
        boost: wf?.gridPulse?.boost ?? 1.8,
        mode: wf?.gridPulse?.mode ?? 'fixed',
        originLat: wf?.gridPulse?.originLat ?? 0,
        originLng: wf?.gridPulse?.originLng ?? 0,
      },
      polePulse: {
        enabled: polePulseEnabled,
        intervalSec: wf?.polePulse?.intervalSec ?? 5,
        speed: wf?.polePulse?.speed ?? 1.0,
        boost: wf?.polePulse?.boost ?? 1.5,
        width: 0.18,
        which: wf?.polePulse?.which ?? 'both',
      },
    });
    globeGroup.add(layer.group);

    /* ───────────── emphasis ───────────── */

    const emphasis = new WireframeEmphasisLayer({
      color: tokens['wireframe.equatorColor'],
      opacity: tokens['wireframe.equatorOpacity'],
      radius: WIREFRAME_DEFAULT_RADIUS * EMPHASIS_RADIUS_FACTOR,
      ...(wf?.emphasis?.strongColor !== undefined && wf.emphasis.strongColor !== ''
        ? { strongColor: wf.emphasis.strongColor }
        : {}),
      ...(wf?.emphasis?.weakColor !== undefined && wf.emphasis.weakColor !== ''
        ? { weakColor: wf.emphasis.weakColor }
        : {}),
      ...(wf?.emphasis?.strongOpacity !== undefined && wf.emphasis.strongOpacity > 0
        ? { strongOpacity: wf.emphasis.strongOpacity }
        : {}),
      ...(wf?.emphasis?.weakOpacityFactor !== undefined
        ? { weakOpacityFactor: wf.emphasis.weakOpacityFactor }
        : {}),
    });
    emphasis.setVisible(emphasisEnabled);
    globeGroup.add(emphasis.group);

    /* ───────────── equator beam ───────────── */

    const equatorBeam = new WireframeEquatorBeam({
      color:
        wf?.equatorBeam?.color !== undefined && wf.equatorBeam.color !== ''
          ? wf.equatorBeam.color
          : tokens['wireframe.equatorColor'],
      opacity:
        wf?.equatorBeam?.opacity !== undefined && wf.equatorBeam.opacity > 0
          ? wf.equatorBeam.opacity
          : 0.85,
      radius: WIREFRAME_DEFAULT_RADIUS * EQUATOR_BEAM_RADIUS_FACTOR,
      pulseEnabled: wf?.equatorBeam?.pulse ?? false,
      pulseSpeedHz: wf?.equatorBeam?.pulseSpeed ?? 0.6,
    });
    equatorBeam.setVisible(equatorBeamEnabled);
    globeGroup.add(equatorBeam.group);

    /* ───────────── active country ring ───────────── */

    const activeRing = new WireframeActiveRing({
      color:
        wf?.activeRing?.color !== undefined && wf.activeRing.color !== ''
          ? wf.activeRing.color
          : tokens['wireframe.activeRingColor'],
      opacity:
        wf?.activeRing?.opacity !== undefined && wf.activeRing.opacity > 0
          ? wf.activeRing.opacity
          : tokens['wireframe.activeRingOpacity'],
      thickness: tokens['wireframe.activeRingThickness'],
      padding: wf?.activeRing?.padding ?? tokens['wireframe.activeRingPadding'],
      rotationSpeed:
        wf?.activeRing?.rotationSpeed ?? tokens['wireframe.activeRingRotationSpeed'],
    });
    activeRing.registerFeatures(features as ReadonlyArray<CountryFeature>);
    activeRing.group.visible = activeRingEnabled;
    globeGroup.add(activeRing.group);

    /* ───────────── pole streams ───────────── */

    const poleStreams = new WireframePoleStreams({
      color:
        wf?.poleStreams?.color !== undefined && wf.poleStreams.color !== ''
          ? wf.poleStreams.color
          : tokens['wireframe.streamColor'],
      count: wf?.poleStreams?.count ?? tokens['wireframe.streamCount'],
      size:
        wf?.poleStreams?.size !== undefined && wf.poleStreams.size > 0
          ? wf.poleStreams.size
          : tokens['wireframe.streamSize'],
      speed: wf?.poleStreams?.speed ?? tokens['wireframe.streamSpeed'],
      opacity:
        wf?.poleStreams?.opacity !== undefined && wf.poleStreams.opacity > 0
          ? wf.poleStreams.opacity
          : tokens['wireframe.streamOpacity'],
    });
    poleStreams.setVisible(poleStreamsEnabled);
    globeGroup.add(poleStreams.group);

    /* ───────────── data packets ───────────── */

    const dataPackets = new WireframeDataPackets({
      color:
        wf?.dataPackets?.color !== undefined && wf.dataPackets.color !== ''
          ? wf.dataPackets.color
          : tokens['wireframe.pulseColor'],
      count: wf?.dataPackets?.count ?? 24,
      speed: wf?.dataPackets?.speed ?? 0.9,
      trail: wf?.dataPackets?.trail ?? 0.18,
      size: wf?.dataPackets?.size ?? 0.018,
      opacity: 0.95,
      axis: wf?.dataPackets?.axis ?? 'both',
    });
    dataPackets.setVisible(dataPacketsEnabled);
    globeGroup.add(dataPackets.group);

    /* ───────────── compass ───────────── */

    const compass = new WireframeCompassMarkers({
      color:
        wf?.compass?.color !== undefined && wf.compass.color !== ''
          ? wf.compass.color
          : tokens['wireframe.equatorColor'],
      opacity: wf?.compass?.opacity !== undefined && wf.compass.opacity > 0
        ? wf.compass.opacity
        : 0.9,
      size: wf?.compass?.size ?? 0.075,
      poles: wf?.compass?.poles ?? true,
    });
    compass.setVisible(compassEnabled);
    globeGroup.add(compass.group);

    /* ───────────── focus pulse decoration ───────────── */

    const focusPulse = buildWireframeFocusPulse({
      globeGroup,
      enabled: true,
      color: baseColor,
      durationSeconds: 0.95,
    });

    /* ───────────── live state cache ───────────── */
    let lastEqBeamPulseEnabled = wf?.equatorBeam?.pulse ?? false;

    return {
      decorations: { focusPulse },
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        emphasis.dispose();
        globeGroup.remove(emphasis.group);
        equatorBeam.dispose();
        globeGroup.remove(equatorBeam.group);
        activeRing.dispose();
        globeGroup.remove(activeRing.group);
        poleStreams.dispose();
        globeGroup.remove(poleStreams.group);
        dataPackets.dispose();
        globeGroup.remove(dataPackets.group);
        compass.dispose();
        globeGroup.remove(compass.group);
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        emphasis.setVisible(visible && emphasis.group.visible);
        equatorBeam.setVisible(visible && equatorBeam.group.visible);
        activeRing.group.visible = visible && activeRing.group.visible;
        poleStreams.setVisible(visible && poleStreams.group.visible);
        dataPackets.setVisible(visible && dataPackets.group.visible);
        compass.setVisible(visible && compass.group.visible);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(elapsedSeconds, delta);
        equatorBeam.update(elapsedSeconds);
        activeRing.update(delta);
        poleStreams.update(delta);
        dataPackets.update(delta);
      },
      onPointerDown(point3D: Vector3, _latLng: LatLng) {
        layer.spawnClickPulse(point3D);
      },
      setActiveCountry(id: string | null) {
        activeRing.setCountry(id);
      },
      /**
       * Live update for wireframe-kind extras. Each section maps to the
       * relevant layer's setters so the next render frame picks up the
       * change. Sentinels: empty-string color → reset, non-positive number
       * on a clamped knob → reset.
       */
      setWireframeConfig(next: NonNullable<GlobeConfig['wireframe']>): void {
        applyWireframePartial(next, {
          layer,
          emphasis,
          equatorBeam,
          activeRing,
          poleStreams,
          dataPackets,
          compass,
          tokens,
          getLastEqBeamPulse: () => lastEqBeamPulseEnabled,
          setLastEqBeamPulse: (v) => {
            lastEqBeamPulseEnabled = v;
          },
        });
      },
    };
  },
};

/**
 * Apply a partial WireframeConfig to all the kind's layers. Lifted into a
 * top-level function so the dispatch logic is testable + the kindHandle's
 * `setWireframeConfig` body stays focused.
 */
const applyWireframePartial = (
  next: NonNullable<GlobeConfig['wireframe']>,
  layers: {
    readonly layer: WireframeGridLayer;
    readonly emphasis: WireframeEmphasisLayer;
    readonly equatorBeam: WireframeEquatorBeam;
    readonly activeRing: WireframeActiveRing;
    readonly poleStreams: WireframePoleStreams;
    readonly dataPackets: WireframeDataPackets;
    readonly compass: WireframeCompassMarkers;
    readonly tokens: import('../../theme/types').ResolvedTokens;
    readonly getLastEqBeamPulse: () => boolean;
    readonly setLastEqBeamPulse: (v: boolean) => void;
  }
): void => {
  const { layer, emphasis, equatorBeam, activeRing, poleStreams, dataPackets, compass, tokens } =
    layers;

  /* base grid */
  if (next.color !== undefined) {
    if (next.color === '') layer.setColor(tokens['wireframe.color']);
    else layer.setColor(next.color);
  }
  if (next.opacity !== undefined) {
    if (next.opacity <= 0) layer.resetOpacity();
    else layer.setOpacity(next.opacity);
  }
  if (next.density !== undefined) {
    layer.setDensity(next.density > 0 ? next.density : tokens['wireframe.density']);
  }
  if (next.pulse !== undefined) layer.setPulse(next.pulse);
  if (next.pulseSpeed !== undefined) {
    layer.setPulseSpeed(next.pulseSpeed > 0 ? next.pulseSpeed : 0.5);
  }

  /* hierarchy */
  if (next.hierarchy !== undefined) {
    const h = next.hierarchy;
    if (h.enabled !== undefined) layer.setHierarchy(h.enabled);
    if (h.majorStepDeg !== undefined && h.majorStepDeg > 0) layer.setMajorStepDeg(h.majorStepDeg);
    if (h.majorBoost !== undefined) layer.setMajorBoost(h.majorBoost);
    if (h.minorBoost !== undefined) layer.setMinorBoost(h.minorBoost);
  }

  /* click pulse */
  if (next.clickPulse !== undefined) {
    const cp = next.clickPulse;
    layer.setClickPulseConfig({
      ...(cp.enabled !== undefined ? { enabled: cp.enabled } : {}),
      ...(cp.speed !== undefined && cp.speed > 0 ? { speed: cp.speed } : {}),
      ...(cp.width !== undefined && cp.width > 0 ? { width: cp.width } : {}),
      ...(cp.boost !== undefined ? { boost: cp.boost } : {}),
      ...(cp.maxConcurrent !== undefined && cp.maxConcurrent > 0
        ? { maxConcurrent: cp.maxConcurrent }
        : {}),
      ...(cp.color !== undefined
        ? cp.color === ''
          ? { color: tokens['wireframe.pulseColor'] }
          : { color: cp.color }
        : {}),
    });
  }

  /* emphasis */
  if (next.emphasis !== undefined) {
    const em = next.emphasis;
    if (em.enabled !== undefined) emphasis.setVisible(em.enabled);
    if (em.strongColor !== undefined) {
      if (em.strongColor === '') emphasis.resetStrongColor();
      else emphasis.setStrongColor(em.strongColor);
    }
    if (em.weakColor !== undefined) {
      if (em.weakColor === '') emphasis.resetWeakColor();
      else emphasis.setWeakColor(em.weakColor);
    }
    if (em.strongOpacity !== undefined && em.strongOpacity > 0) {
      emphasis.setStrongOpacity(em.strongOpacity);
    }
    if (em.weakOpacityFactor !== undefined) {
      emphasis.setWeakOpacityFactor(em.weakOpacityFactor);
    }
  }

  /* equator beam */
  if (next.equatorBeam !== undefined) {
    const eb = next.equatorBeam;
    if (eb.enabled !== undefined) equatorBeam.setVisible(eb.enabled);
    if (eb.color !== undefined) {
      if (eb.color === '') equatorBeam.resetColor();
      else equatorBeam.setColor(eb.color);
    }
    if (eb.opacity !== undefined) {
      if (eb.opacity <= 0) equatorBeam.resetOpacity();
      else equatorBeam.setOpacity(eb.opacity);
    }
    if (eb.pulse !== undefined) {
      equatorBeam.setPulse(eb.pulse);
      layers.setLastEqBeamPulse(eb.pulse);
    }
    if (eb.pulseSpeed !== undefined && eb.pulseSpeed > 0) {
      equatorBeam.setPulseSpeed(eb.pulseSpeed);
    }
  }

  /* glitch */
  if (next.glitch !== undefined) {
    const g = next.glitch;
    layer.setGlitchConfig({
      ...(g.enabled !== undefined ? { enabled: g.enabled } : {}),
      ...(g.intervalMin !== undefined && g.intervalMin > 0
        ? { intervalMin: g.intervalMin }
        : {}),
      ...(g.intervalMax !== undefined && g.intervalMax > 0
        ? { intervalMax: g.intervalMax }
        : {}),
    });
  }

  /* active country ring */
  if (next.activeRing !== undefined) {
    const ar = next.activeRing;
    if (ar.enabled !== undefined) activeRing.group.visible = ar.enabled;
    if (ar.color !== undefined) {
      if (ar.color === '') activeRing.resetColor();
      else activeRing.setColor(ar.color);
    }
    if (ar.opacity !== undefined) {
      if (ar.opacity <= 0) activeRing.resetOpacity();
      else activeRing.setOpacity(ar.opacity);
    }
    if (ar.padding !== undefined && ar.padding > 0) activeRing.setPadding(ar.padding);
    if (ar.rotationSpeed !== undefined) activeRing.setRotationSpeed(ar.rotationSpeed);
  }

  /* pole streams */
  if (next.poleStreams !== undefined) {
    const ps = next.poleStreams;
    if (ps.enabled !== undefined) poleStreams.setVisible(ps.enabled);
    if (ps.color !== undefined) {
      if (ps.color === '') poleStreams.resetColor();
      else poleStreams.setColor(ps.color);
    }
    if (ps.size !== undefined) {
      if (ps.size <= 0) poleStreams.resetSize();
      else poleStreams.setSize(ps.size);
    }
    if (ps.opacity !== undefined) {
      if (ps.opacity <= 0) poleStreams.resetOpacity();
      else poleStreams.setOpacity(ps.opacity);
    }
    if (ps.speed !== undefined && ps.speed > 0) poleStreams.setSpeed(ps.speed);
    if (ps.count !== undefined && ps.count >= 0) poleStreams.setCount(ps.count);
  }

  /* data packets */
  if (next.dataPackets !== undefined) {
    const dp = next.dataPackets;
    if (dp.enabled !== undefined) dataPackets.setVisible(dp.enabled);
    if (dp.color !== undefined) {
      if (dp.color === '') dataPackets.resetColor();
      else dataPackets.setColor(dp.color);
    }
    if (dp.size !== undefined && dp.size > 0) dataPackets.setSize(dp.size);
    if (dp.speed !== undefined) dataPackets.setSpeed(dp.speed);
    if (dp.trail !== undefined) dataPackets.setTrail(dp.trail);
    if (dp.axis !== undefined) dataPackets.setAxis(dp.axis);
    if (dp.count !== undefined && dp.count >= 0) dataPackets.setCount(dp.count);
  }

  /* compass */
  if (next.compass !== undefined) {
    const c = next.compass;
    if (c.enabled !== undefined) compass.setVisible(c.enabled);
    if (c.color !== undefined) {
      if (c.color === '') compass.resetColor();
      else compass.setColor(c.color);
    }
    if (c.size !== undefined && c.size > 0) compass.setSize(c.size);
    if (c.opacity !== undefined && c.opacity > 0) compass.setOpacity(c.opacity);
    if (c.poles !== undefined) compass.setPolesVisible(c.poles);
  }

  /* grid pulse */
  if (next.gridPulse !== undefined) {
    const gp = next.gridPulse;
    layer.setGridPulseConfig({
      ...(gp.enabled !== undefined ? { enabled: gp.enabled } : {}),
      ...(gp.intervalSec !== undefined && gp.intervalSec > 0
        ? { intervalSec: gp.intervalSec }
        : {}),
      ...(gp.speed !== undefined && gp.speed > 0 ? { speed: gp.speed } : {}),
      ...(gp.width !== undefined && gp.width > 0 ? { width: gp.width } : {}),
      ...(gp.boost !== undefined ? { boost: gp.boost } : {}),
      ...(gp.mode !== undefined ? { mode: gp.mode } : {}),
      ...(gp.originLat !== undefined ? { originLat: gp.originLat } : {}),
      ...(gp.originLng !== undefined ? { originLng: gp.originLng } : {}),
      ...(gp.color !== undefined
        ? gp.color === ''
          ? { color: tokens['wireframe.pulseColor'] }
          : { color: gp.color }
        : {}),
    });
  }

  /* pole pulse */
  if (next.polePulse !== undefined) {
    const pp = next.polePulse;
    layer.setPolePulseConfig({
      ...(pp.enabled !== undefined ? { enabled: pp.enabled } : {}),
      ...(pp.intervalSec !== undefined && pp.intervalSec > 0
        ? { intervalSec: pp.intervalSec }
        : {}),
      ...(pp.speed !== undefined && pp.speed > 0 ? { speed: pp.speed } : {}),
      ...(pp.boost !== undefined ? { boost: pp.boost } : {}),
      ...(pp.which !== undefined ? { which: pp.which } : {}),
      ...(pp.color !== undefined
        ? pp.color === ''
          ? { color: tokens['wireframe.pulseColor'] }
          : { color: pp.color }
        : {}),
    });
  }
};

// Re-exports — public API is the kindHandle plus the Tron-grid utilities.
export { WireframeGridLayer, WIREFRAME_DEFAULT_RADIUS } from './grid';
export { WireframeEmphasisLayer } from './emphasis';
export { WireframeActiveRing } from './active-ring';
export { WireframePoleStreams } from './pole-streams';
export { WireframeEquatorBeam } from './equator-beam';
export { WireframeDataPackets } from './data-packets';
export { WireframeCompassMarkers } from './compass-markers';
export { ringRadiusForExtent, stepParticleLat } from './active-ring-extras';
