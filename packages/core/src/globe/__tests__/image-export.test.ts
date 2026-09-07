import { PerspectiveCamera, Vector2, type WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { captureGlobeImage } from '../image-export';

const setup = () => {
  const size = new Vector2(800, 400);
  const camera = new PerspectiveCamera(45, 2);
  const frames: number[][] = [];
  const encode = vi.fn(() => 'data:image/png;base64,frame');
  const scene = {
    camera,
    renderer: {
      getSize: (target: Vector2) => target.copy(size),
      setSize: (width: number, height: number) => size.set(width, height),
      domElement: { toDataURL: encode },
    } as unknown as WebGLRenderer,
    renderFrame: () => { frames.push([size.x, size.y, camera.aspect]); },
  };
  return { scene, size, frames, encode };
};

describe('image export', () => {
  it('renders with the requested aspect and restores the live frame', async () => {
    const { scene, size, frames } = setup();
    expect(await captureGlobeImage(scene, { width: 300, height: 600 })).toContain('data:image/png');
    expect(frames).toEqual([[300, 600, 0.5], [800, 400, 2]]);
    expect(size.toArray()).toEqual([800, 400]);
    expect(scene.camera.aspect).toBe(2);
  });

  it('restores dimensions even when canvas encoding fails', async () => {
    const { scene, size, encode, frames } = setup();
    encode.mockImplementation(() => { throw new Error('Canvas unavailable'); });
    await expect(captureGlobeImage(scene, { width: 300, height: 600 })).rejects.toThrow('Canvas unavailable');
    expect(size.toArray()).toEqual([800, 400]);
    expect(scene.camera.aspect).toBe(2);
    expect(frames.at(-1)).toEqual([800, 400, 2]);
  });

  it('rejects incomplete or invalid sizes before resizing', async () => {
    const { scene, frames } = setup();
    for (const options of [{ width: 200 }, { width: 0, height: 200 }, { width: Infinity, height: 200 }]) {
      await expect(captureGlobeImage(scene, options)).rejects.toThrow(RangeError);
    }
    expect(frames).toEqual([]);
  });
});
