import type { GlobeKind as _GlobeKind } from '../kinds/types';

export type LatLng = readonly [latitude: number, longitude: number];

export type ResolutionLevel = 'low' | 'medium' | 'high';

export type GlobeMode = 'sphere' | 'flat';

// Re-export so the public surface stays at `@your-globe/core`'s `./types`.
export type GlobeKind = _GlobeKind;
export type { GlobeKind as _GlobeKindAlias } from '../kinds/types';
