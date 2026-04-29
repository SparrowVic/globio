import { WIREFRAME_DEFAULT_RADIUS, WireframeGridLayer } from './wireframe-grid-layer';
import { WireframeEmphasisLayer } from './wireframe-emphasis-layer';
import { ActiveCountryRing } from './active-country-ring';
import { PoleStreams } from './pole-streams';
import { buildWireframeFocusPulse } from '../shared/focus-pulse-decorators';
import type { Vector3 } from 'three';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';
import type { LatLng } from '../../types';

const EMPHASIS_RADIUS_FACTOR = 1.0008;

/**
 * Wireframe-kind handle widening — exposes `setActiveCountry` so globe.ts
 * can drive the active-country ring from the same place it drives the
 * outline kind's hover-glow.
 */
export interface WireframeKindHandle extends KindHandle {
  setActiveCountry?(id: string | null): void;
}

/**
 * Wireframe kind — Tron-style lat/lng grid only, no country geometry. Hover
 * / click are disabled by default because there's no visible country
 * surface to interact with; markers + arcs still raycast normally.
 *
 * Reads tokens `wireframe.{color,opacity,density,pulse,...}`. Per-instance
 * overrides come from `config.wireframe`. Sub-features — click pulse,
 * equator emphasis, glitch transients, active-country ring, pole-to-pole
 * streams — each token-defaulted on and individually toggleable via
 * `config.wireframe.{clickPulse,emphasis,glitch,activeRing,poleStreams}.enabled`.
 */
export const wireframeKind: KindModule = {
  kind: 'wireframe',
  hasCountryInteraction: false,
  build({ globeGroup, features, tokens, config }: KindBuildContext): WireframeKindHandle {
    const wf = config.wireframe;

    const clickPulseEnabled =
      wf?.clickPulse?.enabled ?? true;
    const emphasisEnabled =
      wf?.emphasis?.enabled ?? tokens['wireframe.emphasisEnabled'];
    const glitchEnabled =
      wf?.glitch?.enabled ?? tokens['wireframe.glitchEnabled'];
    const activeRingEnabled = wf?.activeRing?.enabled ?? true;
    const poleStreamsEnabled = wf?.poleStreams?.enabled ?? true;

    const layer = new WireframeGridLayer({
      color: tokens['wireframe.color'],
      opacity: tokens['wireframe.opacity'],
      density: wf?.density ?? tokens['wireframe.density'],
      pulse: wf?.pulse ?? tokens['wireframe.pulse'],
      ...(wf?.pulseSpeed !== undefined && { pulseSpeed: wf.pulseSpeed }),
      radius: WIREFRAME_DEFAULT_RADIUS,
      clickPulse: {
        enabled: clickPulseEnabled,
        color: tokens['wireframe.pulseColor'],
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
    });
    globeGroup.add(layer.group);

    const emphasis = emphasisEnabled
      ? new WireframeEmphasisLayer({
          color: tokens['wireframe.equatorColor'],
          opacity: tokens['wireframe.equatorOpacity'],
          radius: WIREFRAME_DEFAULT_RADIUS * EMPHASIS_RADIUS_FACTOR,
        })
      : null;
    if (emphasis) globeGroup.add(emphasis.group);

    const activeRing = activeRingEnabled
      ? new ActiveCountryRing({
          color: tokens['wireframe.activeRingColor'],
          opacity: tokens['wireframe.activeRingOpacity'],
          thickness: tokens['wireframe.activeRingThickness'],
          padding: wf?.activeRing?.padding ?? tokens['wireframe.activeRingPadding'],
          rotationSpeed:
            wf?.activeRing?.rotationSpeed ?? tokens['wireframe.activeRingRotationSpeed'],
        })
      : null;
    if (activeRing) {
      activeRing.registerFeatures(features as ReadonlyArray<CountryFeature>);
      globeGroup.add(activeRing.group);
    }

    const poleStreams = poleStreamsEnabled
      ? new PoleStreams({
          color: tokens['wireframe.streamColor'],
          count: wf?.poleStreams?.count ?? tokens['wireframe.streamCount'],
          size: tokens['wireframe.streamSize'],
          speed: wf?.poleStreams?.speed ?? tokens['wireframe.streamSpeed'],
          opacity: tokens['wireframe.streamOpacity'],
        })
      : null;
    if (poleStreams) globeGroup.add(poleStreams.group);

    const focusPulse = buildWireframeFocusPulse({
      globeGroup,
      enabled: true,
      color: tokens['wireframe.color'],
      durationSeconds: 0.95,
    });

    return {
      decorations: { focusPulse },
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        if (emphasis) {
          emphasis.dispose();
          globeGroup.remove(emphasis.group);
        }
        if (activeRing) {
          activeRing.dispose();
          globeGroup.remove(activeRing.group);
        }
        if (poleStreams) {
          poleStreams.dispose();
          globeGroup.remove(poleStreams.group);
        }
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        emphasis?.setVisible(visible);
        if (activeRing) activeRing.group.visible = visible;
        poleStreams?.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(elapsedSeconds, delta);
        activeRing?.update(delta);
        poleStreams?.update(delta);
      },
      onPointerDown(point3D: Vector3, _latLng: LatLng) {
        layer.spawnClickPulse(point3D);
      },
      setActiveCountry(id: string | null) {
        activeRing?.setCountry(id);
      },
    };
  },
};

export { WireframeGridLayer, WIREFRAME_DEFAULT_RADIUS } from './wireframe-grid-layer';
export { WireframeEmphasisLayer } from './wireframe-emphasis-layer';
export { ActiveCountryRing } from './active-country-ring';
export { PoleStreams } from './pole-streams';
export { ringRadiusForExtent, stepParticleLat } from './active-ring-extras';
