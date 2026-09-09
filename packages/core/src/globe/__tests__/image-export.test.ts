import { PerspectiveCamera, Vector2, type WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { captureGlobeImage } from '../image-export';

const setup = () => {
  const size = new Vector2(800, 400);
  const camera = new PerspectiveCamera(45, 2);
  const frames: number[][] = [];
  let pixelRatio = 2;
  const encode = vi.fn(() => 'data:image/png;base64,frame');
  let background: string | null = '#101820';
  let backdropVisible = true;
  let edgeFade = 0.08;
  const scene = {
    camera,
    renderer: {
      getSize: (target: Vector2) => target.copy(size),
      setSize: (width: number, height: number) => size.set(width, height),
      getPixelRatio: () => pixelRatio,
      setPixelRatio: (value: number) => { pixelRatio = value; },
      domElement: { toDataURL: encode },
    } as unknown as WebGLRenderer,
    renderFrame: () => { frames.push([size.x, size.y, camera.aspect, pixelRatio]); },
    getCanvasBackground: () => background,
    setCanvasBackground: vi.fn((value: string | null) => { background = value; }),
  };
  const context = {
    themeBackground: '#030712',
    backdrop: {
      getVisible: () => backdropVisible,
      setVisible: vi.fn((visible: boolean) => { backdropVisible = visible; }),
      getEdgeFade: () => edgeFade,
      setEdgeFade: vi.fn((value: number) => { edgeFade = value; }),
    },
  };
  const state = () => ({ background, backdropVisible, edgeFade });
  return { scene, context, state, size, frames, encode };
};

describe('image export', () => {
  it('renders with the requested aspect and restores the live frame', async () => {
    const { scene, context, size, frames } = setup();
    expect(await captureGlobeImage(scene, { width: 300, height: 600 }, context)).toContain('data:image/png');
    expect(frames).toEqual([[300, 600, 0.5, 1], [800, 400, 2, 2]]);
    expect(size.toArray()).toEqual([800, 400]);
    expect(scene.camera.aspect).toBe(2);
    expect(scene.renderer.getPixelRatio()).toBe(2);
  });

  it('restores dimensions even when canvas encoding fails', async () => {
    const { scene, context, size, encode, frames } = setup();
    encode.mockImplementation(() => { throw new Error('Canvas unavailable'); });
    await expect(captureGlobeImage(scene, { width: 300, height: 600 }, context)).rejects.toThrow('Canvas unavailable');
    expect(size.toArray()).toEqual([800, 400]);
    expect(scene.camera.aspect).toBe(2);
    expect(frames.at(-1)).toEqual([800, 400, 2, 2]);
    expect(scene.renderer.getPixelRatio()).toBe(2);
  });

  it('rejects incomplete or invalid sizes before resizing', async () => {
    const { scene, context, frames } = setup();
    for (const options of [
      { width: 200 },
      { width: 0, height: 200 },
      { width: 0.5, height: 200 },
      { width: Infinity, height: 200 },
    ]) {
      await expect(captureGlobeImage(scene, options, context)).rejects.toThrow(RangeError);
    }
    expect(frames).toEqual([]);
  });

  it('applies export background and backdrop overrides for one frame only', async () => {
    const { scene, context, state, frames } = setup();
    const exportedStates: ReturnType<typeof state>[] = [];
    scene.renderFrame = () => {
      frames.push([]);
      exportedStates.push(state());
    };

    await captureGlobeImage(scene, {
      background: 'transparent',
      includeBackdrop: false,
      edgeFade: 0.18,
    }, context);

    expect(exportedStates).toEqual([
      { background: null, backdropVisible: false, edgeFade: 0.18 },
      { background: '#101820', backdropVisible: true, edgeFade: 0.08 },
    ]);
    expect(state()).toEqual({
      background: '#101820',
      backdropVisible: true,
      edgeFade: 0.08,
    });
  });

  it('restores export overrides when PNG encoding fails', async () => {
    const { scene, context, state, encode } = setup();
    encode.mockImplementation(() => { throw new Error('Canvas unavailable'); });

    await expect(captureGlobeImage(scene, {
      background: '#fff4d6',
      includeBackdrop: false,
      edgeFade: 0.2,
    }, context)).rejects.toThrow('Canvas unavailable');

    expect(state()).toEqual({
      background: '#101820',
      backdropVisible: true,
      edgeFade: 0.08,
    });
  });
});
