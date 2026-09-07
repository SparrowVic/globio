import { CountryFillLayer, type CountryFillLayerOptions } from '../shared/country-fill-layer';

export type {
  CountryFillLayerOptions as DottedCountryFillLayerOptions,
  CountryFillMode,
} from '../shared/country-fill-layer';

export class DottedCountryFillLayer extends CountryFillLayer {
  public constructor(options: CountryFillLayerOptions) {
    super(options);
    this.group.name = 'DottedCountryFillLayer';
  }
}
