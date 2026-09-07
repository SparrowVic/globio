import { NormalBlending, type Blending } from 'three';
import { StarfieldLayer } from '../shared/starfield-layer';

export type {
  StarfieldLayerOptions as PaperStarfieldLayerOptions,
  StarfieldTwinkleOptions,
} from '../shared/starfield-layer';

/**
 * Paper-native "starfield": a quiet cloud of printed speckles / classroom
 * pin-pricks around the globe. Same API as the other kinds, but normal
 * blending so the soft discs read as pigment on the stage rather than
 * light in space outside the atmosphere.
 */
export class PaperStarfieldLayer extends StarfieldLayer {
  protected override get blending(): Blending {
    return NormalBlending;
  }
}
