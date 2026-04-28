import { WIREFRAME_DEFAULT_RADIUS, WireframeGridLayer } from './wireframe-grid-layer';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Wireframe kind — Tron-style lat/lng grid only, no country geometry. Hover
 * / click are disabled by default because there's no visible country
 * surface to interact with; markers + arcs still raycast normally.
 *
 * Reads tokens `wireframe.{color,opacity,density,pulse}`. Per-instance
 * overrides come from `config.wireframe.{density,pulse,pulseSpeed}`.
 */
export const wireframeKind: KindModule = {
  kind: 'wireframe',
  hasCountryInteraction: false,
  build({ globeGroup, tokens, config }: KindBuildContext): KindHandle {
    const wf = config.wireframe;
    const layer = new WireframeGridLayer({
      color: tokens['wireframe.color'],
      opacity: tokens['wireframe.opacity'],
      density: wf?.density ?? tokens['wireframe.density'],
      pulse: wf?.pulse ?? tokens['wireframe.pulse'],
      ...(wf?.pulseSpeed !== undefined && { pulseSpeed: wf.pulseSpeed }),
      radius: WIREFRAME_DEFAULT_RADIUS,
    });
    globeGroup.add(layer.group);
    return {
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
      },
      update(_delta: number, elapsedSeconds: number) {
        layer.update(elapsedSeconds);
      },
    };
  },
};

export { WireframeGridLayer, WIREFRAME_DEFAULT_RADIUS } from './wireframe-grid-layer';
