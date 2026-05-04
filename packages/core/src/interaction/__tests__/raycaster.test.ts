import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  SphereGeometry,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PointerRaycaster, type RaycasterHit } from '../raycaster';

class FakeCanvas {
  public addEventListener = vi.fn();
  public removeEventListener = vi.fn();

  public getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      toJSON: () => ({}),
    } as DOMRect;
  }
}

describe('PointerRaycaster', () => {
  const disposables: Array<{ dispose(): void }> = [];

  afterEach(() => {
    for (const item of disposables.splice(0)) item.dispose();
  });

  it('does not let decorative marker children swallow country clicks', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const markerGeometry = new SphereGeometry(1, 8, 8);
    const markerMaterial = new MeshBasicMaterial();
    const markerMesh = new InstancedMesh(markerGeometry, markerMaterial, 1);
    markerMesh.setMatrixAt(0, new Matrix4().makeTranslation(3, 0, 0));
    markerMesh.count = 1;
    markerMesh.updateMatrixWorld();

    const overlayGeometry = new BufferGeometry();
    overlayGeometry.setAttribute(
      'position',
      new Float32BufferAttribute([-1, 0, 0, 1, 0, 0], 3),
    );
    const overlayMaterial = new LineBasicMaterial();
    markerMesh.add(new LineSegments(overlayGeometry, overlayMaterial));

    const countryGeometry = new SphereGeometry(0.5, 16, 8);
    const countryMaterial = new MeshBasicMaterial();
    const countryMesh = new Mesh(countryGeometry, countryMaterial);
    countryMesh.userData['countryId'] = 'test-country';
    countryMesh.updateMatrixWorld();

    disposables.push(
      markerGeometry,
      markerMaterial,
      overlayGeometry,
      overlayMaterial,
      countryGeometry,
      countryMaterial,
    );

    const raycaster = new PointerRaycaster({
      camera,
      domElement: new FakeCanvas() as unknown as HTMLElement,
      targets: [
        { type: 'marker', object: markerMesh },
        { type: 'country', object: countryMesh },
      ],
      onClick: vi.fn(),
      onHover: vi.fn(),
    });

    const hit = (raycaster as unknown as { computeHit(): RaycasterHit | null }).computeHit();

    expect(hit?.type).toBe('country');
    expect(hit?.object.userData['countryId']).toBe('test-country');
    raycaster.destroy();
  });
});
