import { CountriesLayer } from './borders-layer';
import { FocusPulseLayer } from './focus-pulse-layer';
import { HoverGlowLayer } from './hover-glow-layer';
import type { CountryFeature } from '../../renderer/country-feature';
import type { KindBuildContext, KindHandle, KindModule } from '../types';
import type { LatLng } from '../../types';

const DEFAULT_PULSE_DURATION_MS = 1400;

/**
 * Outline kind extras: a `setHoveredCountry` widening so globe.ts can drive
 * the glow halo from the same place it drives `CountryHighlightLayer`.
 */
export interface OutlineKindHandle extends KindHandle {
  setHoveredCountry?(id: string | null): void;
}

/**
 * Outline kind — vector country borders rendered as `LineSegments` on top
 * of a solid sphere. The default look. Country interaction (hover/click +
 * highlight) is fully supported via the shared picking infrastructure.
 *
 * Extras shipped on top of the base mesh:
 *  - `HoverGlowLayer` — soft additive halo that wraps the hovered country.
 *  - `FocusPulseLayer` — sonar ring that fires from `onCountryFocus`.
 * Both default-on; toggle via `GlobeConfig.outline.{hoverGlow,focusPulse}`.
 */
export const outlineKind: KindModule = {
  kind: 'outline',
  hasCountryInteraction: true,
  build({ globeGroup, features, tokens, config }: KindBuildContext): OutlineKindHandle {
    const layer = new CountriesLayer({
      features,
      borderColor: tokens['countries.border.color'],
      borderWidth: tokens['countries.border.width'],
      borderOpacity: tokens['countries.border.opacity'],
    });
    globeGroup.add(layer.group);

    const outlineConfig = config.outline;
    const glowEnabled = outlineConfig?.hoverGlow?.enabled ?? true;
    const pulseEnabled = outlineConfig?.focusPulse?.enabled ?? true;

    const glow: HoverGlowLayer | null = glowEnabled
      ? new HoverGlowLayer({
          color: tokens['countries.borderHover.glowColor'],
          width: tokens['countries.borderHover.glowWidth'],
          opacity: tokens['countries.borderHover.glowOpacity'],
        })
      : null;
    if (glow) {
      glow.registerFeatures(features as ReadonlyArray<CountryFeature>);
      globeGroup.add(glow.object);
    }

    const pulseDurationMs = outlineConfig?.focusPulse?.durationMs ?? DEFAULT_PULSE_DURATION_MS;
    const pulseColor = outlineConfig?.focusPulse?.color ?? tokens['countries.borderActive.color'];
    const pulse: FocusPulseLayer | null = pulseEnabled
      ? new FocusPulseLayer({
          color: pulseColor,
          durationSeconds: pulseDurationMs / 1000,
        })
      : null;
    if (pulse) globeGroup.add(pulse.group);

    return {
      dispose() {
        layer.dispose();
        globeGroup.remove(layer.group);
        if (glow) {
          glow.dispose();
          globeGroup.remove(glow.object);
        }
        if (pulse) {
          pulse.dispose();
          globeGroup.remove(pulse.group);
        }
      },
      setVisible(visible: boolean) {
        layer.setVisible(visible);
        if (glow) glow.object.visible = visible && glow.object.visible;
        if (pulse) pulse.group.visible = visible;
      },
      update(delta: number) {
        glow?.update(delta);
        pulse?.update(delta);
      },
      onCountryFocus(latLng: LatLng) {
        pulse?.spawn(latLng);
      },
      setHoveredCountry(id: string | null) {
        if (!glow) return;
        if (id === null) glow.clear();
        else glow.showCountry(id);
      },
    };
  },
};

export { CountriesLayer } from './borders-layer';
export { FocusPulseLayer, computePulseFrame } from './focus-pulse-layer';
export { HoverGlowLayer } from './hover-glow-layer';
