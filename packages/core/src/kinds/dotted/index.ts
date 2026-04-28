import { CountriesDottedLayer } from './dotted-layer';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Dotted kind — Apple/Stripe-style. A `THREE.Points` cloud fills each
 * country at a regular lat/lng grid; no visible borders. Hover/click still
 * work via the shared picking layer.
 *
 * Reads tokens `countries.dotted.{color,size,density,opacity}`.
 */
export const dottedKind: KindModule = {
  kind: 'dotted',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens }: KindBuildContext): KindHandle {
    const layer = new CountriesDottedLayer({
      features,
      color: tokens['countries.dotted.color'],
      size: tokens['countries.dotted.size'],
      density: tokens['countries.dotted.density'],
      opacity: tokens['countries.dotted.opacity'],
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
    };
  },
};

export { CountriesDottedLayer } from './dotted-layer';
