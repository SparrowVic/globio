import { Raycaster, Vector2, type Camera, type Object3D, type Vector3 } from 'three';

export interface RaycasterTarget {
  readonly type: 'marker' | 'country' | 'surface';
  readonly object: Object3D;
}

export interface RaycasterHit {
  readonly type: 'marker' | 'country' | 'surface';
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
  /**
   * Streamed on every pointermove (no key-dedup). Use for follow-cursor HUD
   * elements that need fresh coords each frame. Receives the raw pixel
   * position alongside the current hit so DOM tooltips can re-anchor without
   * recomputing on their own listener.
   */
  readonly onMove?: (
    hit: RaycasterHit | null,
    pixel: { readonly x: number; readonly y: number }
  ) => void;
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
    el.removeEventListener('pointerleave', this.clearHover);
    el.removeEventListener('pointercancel', this.clearHover);
    if (typeof window !== 'undefined') {
      window.removeEventListener('blur', this.clearHover);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private attach(): void {
    const el = this.options.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointermove', this.onPointerMove);
    // Hover state can otherwise go stale: a fast mouse-off the canvas
    // produces no `pointermove` for the void area, the window can lose
    // focus while a hover is active, or the user can switch tabs. In
    // each case the highlight stays "armed" with no event to clear it,
    // and the next time the cursor returns the previous hit-key still
    // matches, so no re-fire happens. Force-dispatching an `onHover(null)`
    // on these signals resets the state machine cleanly.
    el.addEventListener('pointerleave', this.clearHover);
    el.addEventListener('pointercancel', this.clearHover);
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.clearHover);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private clearHover = (): void => {
    if (this.lastHoverKey === null) return;
    this.lastHoverKey = null;
    this.options.onHover(null);
  };

  private onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.clearHover();
    }
  };

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
    const rect = this.options.domElement.getBoundingClientRect();
    this.options.onMove?.(hit, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
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
