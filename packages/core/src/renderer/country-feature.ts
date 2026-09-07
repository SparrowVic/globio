/**
 * Shared geometry types for a country, used by every renderer/kind that
 * touches country shapes (borders, dotted fill, picking, labels, fill,
 * highlight). Lives outside any specific layer so kind modules in
 * `kinds/<name>/` can import without depending on a sibling kind's file.
 */

/** Single GeoJSON-style polygon: first ring is outer, rest are holes. */
export type CountryPolygon = ReadonlyArray<ReadonlyArray<readonly [number, number]>>;

export interface CountryFeature {
  /**
   * Numeric ISO 3166-1 code as a zero-padded 3-character string ('032',
   * '840') — the loader normalises numeric ids to this form; non-numeric
   * ids from custom TopoJSON are kept verbatim.
   */
  readonly id: string;
  readonly name: string;
  /**
   * Flat list of all rings (outer + holes from every polygon). Used by
   * border, picking and highlight layers — they render every ring as a
   * line/loop.
   */
  readonly coordinates: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  /**
   * Polygon-with-holes structure preserved from the source geometry. Used by
   * fillers / triangulators (Lesotho-in-SA, San-Marino-in-IT) and to handle
   * antimeridian-crossing rings (Russia, Fiji) cleanly.
   */
  readonly polygons: ReadonlyArray<CountryPolygon>;
}
