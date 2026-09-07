import { ArcsLayer, type ArcsLayerOptions } from '../shared/arcs-layer';

export type { ArcsLayerOptions as WireframeArcsLayerOptions } from '../shared/arcs-layer';

export class WireframeArcsLayer extends ArcsLayer {
  public constructor(options: ArcsLayerOptions) {
    super(options);
    this.group.name = 'WireframeArcsLayer';
  }
}
