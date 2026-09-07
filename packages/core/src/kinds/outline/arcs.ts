import { ArcsLayer, type ArcsLayerOptions } from '../shared/arcs-layer';

export type { ArcsLayerOptions as OutlineArcsLayerOptions } from '../shared/arcs-layer';

export class OutlineArcsLayer extends ArcsLayer {
  public constructor(options: ArcsLayerOptions) {
    super(options);
    this.group.name = 'OutlineArcsLayer';
  }
}
