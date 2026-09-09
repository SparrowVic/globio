import { afterEach, describe, expect, it } from 'vitest';
import { CinematicStarfieldLayer } from '../../cinematic/starfield';
import { DottedStarfieldLayer } from '../../dotted/starfield';
import { HologramStarfieldLayer } from '../../hologram/starfield';
import { StarfieldLayer } from '../starfield-layer';

type UniformValue = { readonly value: unknown };
type MaterialAccess = {
  readonly material: { readonly uniforms: Record<string, UniformValue> };
  readonly bandMaterial?: { readonly uniforms: Record<string, UniformValue> };
  readonly constellationMaterial?: { readonly uniforms: Record<string, UniformValue> } | null;
};

const layers: Array<{ dispose(): void }> = [];

afterEach(() => {
  layers.splice(0).forEach((layer) => layer.dispose());
});

const uniformsOf = (layer: unknown): MaterialAccess => layer as MaterialAccess;

describe('starfield viewport edge fade', () => {
  it('clamps and updates the shared backdrop shader', () => {
    const layer = new StarfieldLayer({ count: 0, color: '#fff', size: 1, edgeFade: 2 });
    layers.push(layer);
    expect(uniformsOf(layer).material.uniforms['uEdgeFade']?.value).toBe(0.5);

    layer.setEdgeFade(-1);
    expect(uniformsOf(layer).material.uniforms['uEdgeFade']?.value).toBe(0);
  });

  it('updates cinematic stars and Milky Way as one backdrop', () => {
    const layer = new CinematicStarfieldLayer({
      count: 0,
      color: '#fff',
      size: 1,
      edgeFade: 0.18,
    });
    layers.push(layer);
    const access = uniformsOf(layer);
    expect(access.material.uniforms['uEdgeFade']?.value).toBe(0.18);
    expect(access.bandMaterial?.uniforms['uEdgeFade']?.value).toBe(0.18);

    layer.setEdgeFade(0.22);
    expect(access.material.uniforms['uEdgeFade']?.value).toBe(0.22);
    expect(access.bandMaterial?.uniforms['uEdgeFade']?.value).toBe(0.22);

    layer.setVisible(false);
    expect(layer.object.visible).toBe(false);
    expect(layer.object.children).toHaveLength(1);
  });

  it('keeps hologram and dotted-native backdrop shaders on the same contract', () => {
    const hologram = new HologramStarfieldLayer({
      count: 0,
      color: '#fff',
      size: 1,
      edgeFade: 0.1,
    });
    const dotted = new DottedStarfieldLayer({
      count: 3,
      color: '#fff',
      size: 1,
      radius: 1,
      edgeFade: 0.1,
      constellations: { linkDistance: 10, maxLinksPerStar: 2 },
    });
    layers.push(hologram, dotted);

    hologram.setEdgeFade(0.2);
    dotted.setEdgeFade(0.2);
    expect(uniformsOf(hologram).material.uniforms['uEdgeFade']?.value).toBe(0.2);
    expect(uniformsOf(dotted).material.uniforms['uEdgeFade']?.value).toBe(0.2);
    expect(uniformsOf(dotted).constellationMaterial?.uniforms['uEdgeFade']?.value).toBe(0.2);
  });
});
