import { Vector2 } from 'three';
import type { SceneManager } from '../renderer/scene-manager';
import type { GlobeInstance } from '../types';

/** Capture a frame without leaving export dimensions on the live renderer. */
export const captureGlobeImage = async (
  scene: Pick<SceneManager, 'renderer' | 'camera' | 'renderFrame'>,
  options?: Parameters<GlobeInstance['toImage']>[0],
): Promise<string> => {
  const width = options?.width;
  const height = options?.height;
  if (width === undefined && height === undefined) {
    scene.renderFrame();
    return scene.renderer.domElement.toDataURL('image/png');
  }
  if (width === undefined || height === undefined || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Image width and height must both be finite positive numbers.');
  }
  const size = scene.renderer.getSize(new Vector2());
  const aspect = scene.camera.aspect;
  try {
    scene.renderer.setSize(width, height, false);
    scene.camera.aspect = width / height;
    scene.camera.updateProjectionMatrix();
    scene.renderFrame();
    return scene.renderer.domElement.toDataURL('image/png');
  } finally {
    scene.renderer.setSize(size.x, size.y, false);
    scene.camera.aspect = aspect;
    scene.camera.updateProjectionMatrix();
    scene.renderFrame();
  }
};
