/**
 * Canvas fill used behind the WebGL scene.
 *
 * - `'theme'` resolves to the active theme's `background.color` token.
 * - `'transparent'` lets the host page show through.
 * - Any other string is interpreted as a CSS colour by Three.js.
 */
export type GlobeCanvasBackground = 'theme' | 'transparent' | (string & {});

/** Canvas and scene-backdrop settings shared by every globe kind. */
export interface GlobeBackgroundConfig {
  /** Canvas fill. Defaults to `'theme'`. */
  readonly canvas?: GlobeCanvasBackground;
  /**
   * Width of the viewport-edge fade applied to the backdrop layer: stars,
   * the cinematic Milky Way and dotted constellation lines. Expressed as a
   * fraction of each canvas dimension and clamped to 0..0.5. The globe,
   * atmosphere, markers and arcs are never faded. Default 0.
   */
  readonly edgeFade?: number;
}
