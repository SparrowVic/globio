import {
  HologramCrosshairLayer,
  type HologramCrosshairOptions,
} from '../hologram/crosshair';

export class CinematicCrosshairLayer extends HologramCrosshairLayer {
  public constructor(options: HologramCrosshairOptions) {
    super(options);
    this.object.name = 'CinematicCrosshairLayer';
  }
}
