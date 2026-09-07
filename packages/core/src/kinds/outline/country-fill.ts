import { CountryFillLayer, type CountryFillLayerOptions } from '../shared/country-fill-layer';

export type {
  CountryFillLayerOptions as OutlineCountryFillLayerOptions,
  CountryFillMode,
} from '../shared/country-fill-layer';

export class OutlineCountryFillLayer extends CountryFillLayer {
  public constructor(options: CountryFillLayerOptions) {
    super(options);
    this.group.name = 'OutlineCountryFillLayer';
  }
}
