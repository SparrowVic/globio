import { AdditiveBlending, type Blending } from 'three';
import { CountryFillLayer, type CountryFillLayerOptions } from '../shared/country-fill-layer';

export type {
  CountryFillLayerOptions as HologramCountryFillLayerOptions,
  CountryFillMode,
} from '../shared/country-fill-layer';

/**
 * Hologram fills glow additively through the transparent shell instead of
 * painting a plain tint on top of it.
 */
export class HologramCountryFillLayer extends CountryFillLayer {
  public constructor(options: CountryFillLayerOptions) {
    super(options);
    this.group.name = 'HologramCountryFillLayer';
  }

  protected override get blending(): Blending {
    return AdditiveBlending;
  }
}
