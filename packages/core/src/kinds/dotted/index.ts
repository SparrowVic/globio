import { CountriesDottedLayer } from './dotted-layer';
import { buildDottedFocusPulse } from '../shared/focus-pulse-decorators';
import type { CountryDataMap } from '../../types';
import type { KindBuildContext, KindHandle, KindModule } from '../types';

/**
 * Dotted kind extras: a `setHoveredCountry` widening so globe.ts can drive
 * the dot expansion + brighten effect from the same hover signal as the
 * outline kind's glow halo.
 */
export interface DottedKindHandle extends KindHandle {
  setHoveredCountry?(id: string | null): void;
}

/**
 * Dotted kind — Apple/Stripe-style. A `THREE.Points` cloud fills each
 * country at a regular lat/lng grid; no visible borders. Hover/click still
 * work via the shared picking layer.
 *
 * Reads tokens `countries.dotted.{color,size,density,opacity}` and the
 * effect tokens `countries.dotted.{rippleBoost,rippleSpeed,rippleWidth,
 * flashColor,flashStrength,flashDecay,driftAmplitude,driftSpeed,driftFreq,
 * driftAxis,hoverScale,hoverBrightnessBoost,hoverDuration}`. Per-instance
 * overrides come from `config.dotted.{clickRipple,dataFlash,drift,hoverDots}`.
 */
export const dottedKind: KindModule = {
  kind: 'dotted',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens, config }: KindBuildContext): DottedKindHandle {
    const dottedCfg = config.dotted;
    const ripple = dottedCfg?.clickRipple;
    const flash = dottedCfg?.dataFlash;
    const drift = dottedCfg?.drift;
    const hoverDots = dottedCfg?.hoverDots;
    const tokenAxis = tokens['countries.dotted.driftAxis'];
    const driftAxis: 'ns' | 'ew' = drift?.axis ?? (tokenAxis === 'ew' ? 'ew' : 'ns');
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
      driftEnabled: drift?.enabled !== false,
      driftAmplitude: drift?.amplitude ?? tokens['countries.dotted.driftAmplitude'],
      driftSpeed: drift?.speed ?? tokens['countries.dotted.driftSpeed'],
      driftFreq: drift?.freq ?? tokens['countries.dotted.driftFreq'],
      driftAxis,
      hoverEnabled: hoverDots?.enabled !== false,
      hoverScale: hoverDots?.scale ?? tokens['countries.dotted.hoverScale'],
      hoverBrightnessBoost:
        hoverDots?.brightnessBoost ?? tokens['countries.dotted.hoverBrightnessBoost'],
      hoverDuration: hoverDots?.duration ?? tokens['countries.dotted.hoverDuration'],
    });
    globeGroup.add(layer.group);

    const focusPulse = buildDottedFocusPulse({
      globeGroup,
      enabled: true,
      color: tokens['countries.dotted.color'],
      durationSeconds: 1.1,
    });

    return {
      decorations: { focusPulse },
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        focusPulse.dispose();
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
      },
      update(delta: number, elapsedSeconds: number) {
        layer.update(delta, elapsedSeconds);
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
      setHoveredCountry(id: string | null) {
        layer.setHoveredCountry(id);
      },
    };
  },
};

export { CountriesDottedLayer } from './dotted-layer';
export {
  rippleBrightness,
  flashBrightness,
  angularDistance,
  driftBrightness,
  easeHoverBoost,
} from './dotted-effects';
