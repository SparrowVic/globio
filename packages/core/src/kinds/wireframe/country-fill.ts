import { CountryFillLayer, type CountryFillLayerOptions } from '../shared/country-fill-layer';

export type {
  CountryFillLayerOptions as WireframeCountryFillLayerOptions,
  CountryFillMode,
} from '../shared/country-fill-layer';

export class WireframeCountryFillLayer extends CountryFillLayer {
  public constructor(options: CountryFillLayerOptions) {
    super(options);
    this.group.name = 'WireframeCountryFillLayer';
  }
}
