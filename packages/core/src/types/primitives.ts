import type { GlobeKind as _GlobeKind } from '../kinds/types';

/** Geographic latitude and longitude in degrees, in that order. */
export type LatLng = readonly [latitude: number, longitude: number];

/** Bundled country-geometry detail level. */
export type ResolutionLevel = 'low' | 'medium' | 'high';

/** Projection mode. Sphere is implemented; flat is reserved and currently renders a sphere. */
export type GlobeMode = 'sphere' | 'flat';

// Re-export so the public surface stays at `@globiojs/core`'s `./types`.
/** Visual rendering identity: cinematic, outline, dotted, wireframe, hologram or paper. */
export type GlobeKind = _GlobeKind;
export type { GlobeKind as _GlobeKindAlias } from '../kinds/types';
