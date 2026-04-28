import { WIREFRAME_DEFAULT_RADIUS, WireframeGridLayer } from './wireframe-grid-layer';
import { WireframeEmphasisLayer } from './wireframe-emphasis-layer';
import type { Vector3 } from 'three';
import type { KindBuildContext, KindHandle, KindModule } from '../types';
import type { LatLng } from '../../types';

const EMPHASIS_RADIUS_FACTOR = 1.0008;

/**
 * Wireframe kind — Tron-style lat/lng grid only, no country geometry. Hover
 * / click are disabled by default because there's no visible country
 * surface to interact with; markers + arcs still raycast normally.
 *
 * Reads tokens `wireframe.{color,opacity,density,pulse,...}`. Per-instance
 * overrides come from `config.wireframe`. Three optional sub-features —
 * click pulse, equator emphasis, glitch transients — each token-defaulted
 * on and individually toggleable via `config.wireframe.{clickPulse,
 * emphasis,glitch}.enabled`.
 */
export const wireframeKind: KindModule = {
  kind: 'wireframe',
  hasCountryInteraction: false,
  build({ globeGroup, tokens, config }: KindBuildContext): KindHandle {
    const wf = config.wireframe;

    const clickPulseEnabled =
      wf?.clickPulse?.enabled ?? true;
    const emphasisEnabled =
      wf?.emphasis?.enabled ?? tokens['wireframe.emphasisEnabled'];
    const glitchEnabled =
      wf?.glitch?.enabled ?? tokens['wireframe.glitchEnabled'];

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

    return {
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        if (emphasis) {
          emphasis.dispose();
          globeGroup.remove(emphasis.group);
        }
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        emphasis?.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(elapsedSeconds, delta);
      },
      onPointerDown(point3D: Vector3, _latLng: LatLng) {
        layer.spawnClickPulse(point3D);
      },
    };
  },
};

export { WireframeGridLayer, WIREFRAME_DEFAULT_RADIUS } from './wireframe-grid-layer';
export { WireframeEmphasisLayer } from './wireframe-emphasis-layer';
