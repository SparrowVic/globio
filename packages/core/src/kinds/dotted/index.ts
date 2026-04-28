import { CountriesDottedLayer } from './dotted-layer';
import type { CountryDataMap } from '../../types';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Dotted kind — Apple/Stripe-style. A `THREE.Points` cloud fills each
 * country at a regular lat/lng grid; no visible borders. Hover/click still
 * work via the shared picking layer.
 *
 * Reads tokens `countries.dotted.{color,size,density,opacity}` and the
 * effect tokens `countries.dotted.{rippleBoost,rippleSpeed,rippleWidth,
 * flashColor,flashStrength,flashDecay}`. Per-instance overrides come from
 * `config.dotted.{clickRipple,dataFlash}`.
 */
export const dottedKind: KindModule = {
  kind: 'dotted',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens, config }: KindBuildContext): KindHandle {
    const dottedCfg = config.dotted;
    const ripple = dottedCfg?.clickRipple;
    const flash = dottedCfg?.dataFlash;
    const layer = new CountriesDottedLayer({
      features,
      color: tokens['countries.dotted.color'],
      size: tokens['countries.dotted.size'],
      density: tokens['countries.dotted.density'],
      opacity: tokens['countries.dotted.opacity'],
      rippleBoost: ripple?.boost ?? tokens['countries.dotted.rippleBoost'],
      rippleSpeed: ripple?.speed ?? tokens['countries.dotted.rippleSpeed'],
      rippleWidth: ripple?.width ?? tokens['countries.dotted.rippleWidth'],
      rippleEnabled: ripple?.enabled !== false,
      rippleMaxConcurrent: ripple?.maxConcurrent ?? 3,
      flashColor: tokens['countries.dotted.flashColor'],
      flashStrength: flash?.strength ?? tokens['countries.dotted.flashStrength'],
      flashDecay: flash?.decay ?? tokens['countries.dotted.flashDecay'],
      flashEnabled: flash?.enabled !== false,
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
      update(delta: number, _elapsedSeconds: number) {
        layer.update(delta);
      },
      onPointerDown(point3D) {
        layer.spawnRipple(point3D);
      },
      onCountryDataChange(next: CountryDataMap | null, prev: CountryDataMap | null) {
        if (!next) return;
        for (const [id, entry] of Object.entries(next)) {
          const before = prev?.[id];
          if (before === undefined || before.value !== entry.value) {
            layer.spawnFlash(id);
          }
        }
      },
    };
  },
};

export { CountriesDottedLayer } from './dotted-layer';
export { rippleBrightness, flashBrightness, angularDistance } from './dotted-effects';
