import { Group, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { GlobeControls } from '../../interaction/controls';
import { latLngToVector3, vector3ToLatLng } from '../../utils/coordinates';
import { createCameraMethods } from '../camera-methods';

const setup = (tilt = 0) => {
  const camera = new PerspectiveCamera(45, 2, 0.1, 100);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  const globeGroup = new Group();
  globeGroup.rotation.z = -tilt * Math.PI / 180;
  const element = { addEventListener() {}, removeEventListener() {} } as unknown as HTMLElement;
  const controls = new GlobeControls({ camera, domElement: element });
  const canvas = { getBoundingClientRect: () => ({ width: 800, height: 400 }) } as HTMLCanvasElement;
  const methods = createCameraMethods({
    camera, globeGroup, controls, getCanvas: () => canvas,
    toWorldPosition: (position) => vector3ToLatLng(globeGroup.localToWorld(latLngToVector3(position))),
  });
  return { ...methods, camera, globeGroup, controls };
};

describe('globe camera methods', () => {
  it('sets rotation immediately and preserves distance on a tilted globe', () => {
    const globe = setup(23.5);
    globe.setRotation([35, 45]);
    const target = globe.globeGroup.localToWorld(latLngToVector3([35, 45])).normalize();
    expect(globe.camera.position.length()).toBeCloseTo(3);
    expect(globe.camera.position.clone().normalize().distanceTo(target)).toBeLessThan(1e-10);
    const projected = globe.project(35, 45);
    expect(projected?.[0]).toBeCloseTo(400);
    expect(projected?.[1]).toBeCloseTo(200);
  });

  it('animates rotation only when requested and can interrupt it with a jump', () => {
    const globe = setup();
    const original = globe.camera.position.clone();
    globe.setRotation([30, 20], true);
    expect(globe.camera.position.equals(original)).toBe(true);
    globe.controls.update(0.5);
    expect(globe.camera.position.equals(original)).toBe(false);
    globe.setRotation([-20, 70]);
    const jumped = globe.camera.position.clone();
    globe.controls.update(2);
    expect(globe.camera.position.distanceTo(jumped)).toBeLessThan(1e-10);
  });

  it('projects tilted surface points rather than the untilted coordinate', () => {
    const globe = setup(90);
    const point = globe.project(30, -90);
    expect(point?.[0]).toBeGreaterThan(400);
    expect(point?.[1]).toBeCloseTo(200);
  });

  it('hides far-side, perspective-occluded and clipped points', () => {
    const globe = setup();
    expect(globe.project(0, 90)).toBeNull();
    expect(globe.project(80, -90)).toBeNull();
    globe.camera.fov = 5;
    globe.camera.updateProjectionMatrix();
    expect(globe.project(25, -90)).toBeNull();
  });

  it('finishes zero-duration flights immediately without invalid coordinates', () => {
    const globe = setup(23.5);
    globe.flyTo([20, 30], 4, { duration: 0 });
    globe.controls.update(0);
    expect(globe.camera.position.length()).toBeCloseTo(4);
    expect(globe.project(20, 30)?.[0]).toBeCloseTo(400);
    expect(globe.project(20, 30)?.[1]).toBeCloseTo(200);
  });
});
