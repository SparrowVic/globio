import { Raycaster, Vector2, type Camera, type Object3D, type Vector3 } from 'three';

export interface RaycasterTarget {
  readonly type: 'marker' | 'country';
  readonly object: Object3D;
}

export interface RaycasterHit {
  readonly type: 'marker' | 'country';
  readonly object: Object3D;
  readonly instanceId?: number;
  readonly point?: Vector3;
}

export interface PointerRaycasterOptions {
  readonly camera: Camera;
  readonly domElement: HTMLElement;
  readonly targets: ReadonlyArray<RaycasterTarget>;
  readonly onClick: (hit: RaycasterHit | null, originalEvent: PointerEvent) => void;
  readonly onHover: (hit: RaycasterHit | null) => void;
  readonly clickThresholdPx?: number;
}

export class PointerRaycaster {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly downPointer = new Vector2();
  private readonly clickThreshold: number;
  private targets: ReadonlyArray<RaycasterTarget>;
  private lastHoverKey: string | null = null;

  public constructor(private readonly options: PointerRaycasterOptions) {
    this.targets = options.targets;
    this.clickThreshold = options.clickThresholdPx ?? 5;
    this.attach();
  }

  public setTargets(targets: ReadonlyArray<RaycasterTarget>): void {
    this.targets = targets;
  }

  public destroy(): void {
    const el = this.options.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointermove', this.onPointerMove);
  }

  private attach(): void {
    const el = this.options.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointermove', this.onPointerMove);
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.options.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.downPointer.set(event.clientX, event.clientY);
  };

  private onPointerUp = (event: PointerEvent): void => {
    const dx = event.clientX - this.downPointer.x;
    const dy = event.clientY - this.downPointer.y;
    if (Math.sqrt(dx * dx + dy * dy) > this.clickThreshold) return;

    this.updatePointer(event);
    const hit = this.computeHit();
    this.options.onClick(hit, event);
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.updatePointer(event);
    const hit = this.computeHit();
    const key = hit ? `${hit.type}:${hit.instanceId ?? hit.object.uuid}` : null;
    if (key !== this.lastHoverKey) {
      this.lastHoverKey = key;
      this.options.onHover(hit);
    }
  };

  private computeHit(): RaycasterHit | null {
    this.raycaster.setFromCamera(this.pointer, this.options.camera);

    for (const target of this.targets) {
      const intersections = this.raycaster.intersectObject(target.object, true);
      const first = intersections[0];
      if (first) {
        return {
          type: target.type,
          object: first.object,
          ...(first.instanceId !== undefined && { instanceId: first.instanceId }),
          point: first.point,
        };
      }
    }
    return null;
  }
}
