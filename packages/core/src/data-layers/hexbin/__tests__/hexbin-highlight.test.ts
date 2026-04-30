import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial } from 'three';
import { HexBinHighlight } from '../hexbin-highlight';

describe('HexBinHighlight', () => {
  it('updates the live geometry buffer when shown', () => {
    const highlight = new HexBinHighlight({
      color: '#ffffff',
      opacity: 1,
      liftOffset: 0,
    });
    const corners = new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]);

    highlight.showFace(2, corners);

    const positions = (highlight.mesh.geometry.getAttribute('position') as {
      array: Float32Array;
    }).array;
    expect(positions[0]).toBeCloseTo(1, 6);
    expect(positions[4]).toBeCloseTo(1, 6);
    expect(positions[8]).toBeCloseTo(1, 6);
    highlight.dispose();
  });

  it('updates style and lift without rebuilding the overlay', () => {
    const highlight = new HexBinHighlight({
      color: '#ffffff',
      opacity: 1,
      liftOffset: 0,
    });
    highlight.showFace(0, new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]));

    highlight.updateStyle({ color: '#00ff00', opacity: 0.25, liftOffset: 1 });

    const material = highlight.mesh.material as MeshBasicMaterial;
    const positions = (highlight.mesh.geometry.getAttribute('position') as {
      array: Float32Array;
    }).array;
    expect(material.opacity).toBeCloseTo(0.25, 6);
    expect(material.color.g).toBeCloseTo(1, 6);
    expect(positions[0]).toBeCloseTo(2, 6);
    highlight.dispose();
  });
});
