import {
  OutlineAtmosphereLayer,
  type OutlineAtmosphereOptions,
} from '../outline/atmosphere';

export class CinematicAtmosphereLayer extends OutlineAtmosphereLayer {
  public constructor(options: OutlineAtmosphereOptions) {
    super(options);
    this.mesh.name = 'CinematicAtmosphereLayer';
  }
}

