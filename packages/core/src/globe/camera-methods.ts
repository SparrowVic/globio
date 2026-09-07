import { Vector3, type Group, type PerspectiveCamera } from 'three';
import type { GlobeControls } from '../interaction/controls';
import type { GlobeInstance, LatLng } from '../types';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';

interface CameraMethodsOptions {
  readonly camera: PerspectiveCamera;
  readonly globeGroup: Group;
  readonly controls: GlobeControls;
  readonly toWorldPosition: (position: LatLng) => LatLng;
  readonly getCanvas: () => HTMLCanvasElement | null;
}

/** Camera methods share the same globe-local coordinate system as picking. */
export const createCameraMethods = ({ camera, globeGroup, controls, toWorldPosition, getCanvas }: CameraMethodsOptions):
Pick<GlobeInstance, 'setRotation' | 'flyTo' | 'project'> => ({
  setRotation: (position, animate = false) => {
    const worldPosition = toWorldPosition(position);
    if (animate) controls.flyTo(worldPosition);
    else controls.jumpTo(worldPosition);
  },
  flyTo: (position, distance, options) => {
    controls.flyTo(toWorldPosition(position), distance, options ?? {});
  },
  project: (lat, lng) => {
    const canvas = getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const surface = globeGroup.localToWorld(latLngToVector3([lat, lng], GLOBE_RADIUS));
    const center = globeGroup.getWorldPosition(new Vector3());
    const normal = surface.clone().sub(center);
    // Perspective visibility depends on the camera-to-point direction, not
    // just the hemisphere: points beyond the visible horizon are occluded.
    if (normal.dot(camera.position.clone().sub(surface)) <= 0) return null;
    camera.updateMatrixWorld(true);
    surface.project(camera);
    if (Math.abs(surface.x) > 1 || Math.abs(surface.y) > 1 || Math.abs(surface.z) > 1) return null;
    return [((surface.x + 1) / 2) * rect.width, ((1 - surface.y) / 2) * rect.height];
  },
});
