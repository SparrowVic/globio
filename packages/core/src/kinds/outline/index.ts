import { CountriesLayer } from './borders-layer';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Outline kind — vector country borders rendered as `LineSegments` on top
 * of a solid sphere. The default look. Country interaction (hover/click +
 * highlight) is fully supported via the shared picking infrastructure.
 */
export const outlineKind: KindModule = {
  kind: 'outline',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens }: KindBuildContext): KindHandle {
    const layer = new CountriesLayer({
      features,
      borderColor: tokens['countries.border.color'],
      borderWidth: tokens['countries.border.width'],
      borderOpacity: tokens['countries.border.opacity'],
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

export { CountriesLayer } from './borders-layer';
