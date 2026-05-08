import {
  HologramSelectionLayer,
  type HologramSelectionLayerOptions,
} from '../hologram/selection';

export class CinematicSelectionLayer extends HologramSelectionLayer {
  public constructor(options: HologramSelectionLayerOptions) {
    super(options);
    this.object.name = 'CinematicSelectionLayer';
  }
}

