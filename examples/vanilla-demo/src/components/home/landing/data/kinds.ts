import type { GlobeKind } from '@your-globe/core';

export interface KindChapterData {
  readonly kind: GlobeKind;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly traits: ReadonlyArray<string>;
}

/**
 * The six chapters of the planet stage — one per globe kind, in the order the
 * globe morphs through them. Copy names what each renderer actually does.
 */
export const KIND_CHAPTERS: ReadonlyArray<KindChapterData> = [
  {
    kind: 'cinematic',
    title: 'Cinematic',
    tagline: 'A filmic Earth, lit like a keynote.',
    description:
      'Procedural land and ocean with relief, drifting clouds that cast shadows, a scattering atmosphere and a sun you can pin, orbit or sync to real time. HDR bloom on top. Drop in a 2k texture set when you want the real planet.',
    traits: ['HDR post-processing', 'clouds & aurora', 'sun: fixed / realtime / orbit', 'optional textures'],
  },
  {
    kind: 'outline',
    title: 'Outline',
    tagline: 'The default. Borders on a deep sea.',
    description:
      'Crisp country borders, hover and active states, and a crosshair that reads out latitude and longitude under the cursor. Five themes from Cyber to Light, every colour a token.',
    traits: ['hover & active states', 'lat / lng crosshair', 'five themes'],
  },
  {
    kind: 'dotted',
    title: 'Dotted',
    tagline: 'Continents as tuned dot fields.',
    description:
      'Choropleth fills sit behind the dot field, while changed country values can flash the dots. Optional latitude bands, constellation links and country borders add structure, with country interaction underneath.',
    traits: ['choropleth backdrop', 'ripple pulses', 'point-data friendly'],
  },
  {
    kind: 'wireframe',
    title: 'Wireframe',
    tagline: 'Pure topology on a translucent shell.',
    description:
      'A latitude and longitude grid over glass, with pulses, data packets and pole-to-pole streams running along it. Select a country and it gets a spinning geodesic ring. Made for network, infrastructure and status views.',
    traits: ['geodesic active ring', 'grid pulses', 'Tron palette'],
  },
  {
    kind: 'hologram',
    title: 'Hologram',
    tagline: 'A projection that never sits still.',
    description:
      'Scanlines, a fresnel rim and a shimmer that keeps moving. Best on black, sharpest at large sizes, and the arcs glitch on cue.',
    traits: ['scanlines', 'fresnel rim', 'shimmer'],
  },
  {
    kind: 'paper',
    title: 'Paper',
    tagline: 'Ink on grain, labels from an atlas.',
    description:
      'Hand-drawn borders, paper texture and serif labels. The kind to reach for when a story should feel printed rather than rendered: education, museums, editorial.',
    traits: ['ink borders', 'paper grain', 'atlas labels'],
  },
];
