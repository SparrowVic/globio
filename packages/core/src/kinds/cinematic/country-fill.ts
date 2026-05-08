import {
  HologramCountryFillLayer,
  type HologramCountryFillLayerOptions,
} from '../hologram/country-fill';

export class CinematicCountryFillLayer extends HologramCountryFillLayer {
  public constructor(options: HologramCountryFillLayerOptions) {
    super({ ...options, fadeDuration: options.fadeDuration ?? 0.2 });
    this.group.name = 'CinematicCountryFillLayer';
  }
}

