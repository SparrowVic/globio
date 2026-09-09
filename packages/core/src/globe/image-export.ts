import { Vector2 } from 'three';
import type { SceneManager } from '../renderer/scene-manager';
import type { GlobeImageExportOptions } from '../types';
import { resolveExportBackground } from './background';

export interface ImageExportBackdrop {
  readonly getVisible: () => boolean;
  readonly setVisible: (visible: boolean) => void;
  readonly getEdgeFade: () => number;
  readonly setEdgeFade: (edgeFade: number) => void;
}

export interface ImageExportContext {
  readonly themeBackground: string;
  readonly backdrop?: ImageExportBackdrop;
}

/** Capture a frame without leaving export size, density or scene overrides on the live globe. */
export const captureGlobeImage = async (
  scene: Pick<
    SceneManager,
    'renderer' | 'camera' | 'renderFrame' | 'getCanvasBackground' | 'setCanvasBackground'
  >,
  options: GlobeImageExportOptions | undefined,
  context: ImageExportContext,
): Promise<string> => {
  const width = options?.width;
  const height = options?.height;
  const customSize = width !== undefined || height !== undefined;
  if (
    customSize &&
    (width === undefined ||
      height === undefined ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0)
  ) {
    throw new RangeError('Image width and height must both be finite positive integers.');
  }

  const exportBackground = resolveExportBackground(options?.background, context.themeBackground);
  const overrideBackground = exportBackground !== undefined;
  const overrideBackdrop = options?.includeBackdrop === false && context.backdrop !== undefined;
  const overrideEdgeFade = options?.edgeFade !== undefined && context.backdrop !== undefined;
  const hasTemporaryState = customSize || overrideBackground || overrideBackdrop || overrideEdgeFade;
  if (!hasTemporaryState) {
    scene.renderFrame();
    return scene.renderer.domElement.toDataURL('image/png');
  }

  const size = scene.renderer.getSize(new Vector2());
  const pixelRatio = scene.renderer.getPixelRatio();
  const aspect = scene.camera.aspect;
  const background = scene.getCanvasBackground();
  const backdropVisible = context.backdrop?.getVisible();
  const edgeFade = context.backdrop?.getEdgeFade();
  try {
    if (customSize) {
      scene.renderer.setPixelRatio(1);
      scene.renderer.setSize(width!, height!, false);
      scene.camera.aspect = width! / height!;
      scene.camera.updateProjectionMatrix();
    }
    if (overrideBackground) scene.setCanvasBackground(exportBackground);
    if (overrideBackdrop) context.backdrop!.setVisible(false);
    if (overrideEdgeFade) context.backdrop!.setEdgeFade(options!.edgeFade!);
    scene.renderFrame();
    return scene.renderer.domElement.toDataURL('image/png');
  } finally {
    if (customSize) {
      scene.renderer.setSize(size.x, size.y, false);
      scene.renderer.setPixelRatio(pixelRatio);
      scene.camera.aspect = aspect;
      scene.camera.updateProjectionMatrix();
    }
    if (overrideBackground) scene.setCanvasBackground(background);
    if (overrideBackdrop) context.backdrop!.setVisible(backdropVisible!);
    if (overrideEdgeFade) context.backdrop!.setEdgeFade(edgeFade!);
    scene.renderFrame();
  }
};
