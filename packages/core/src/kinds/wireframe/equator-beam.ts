import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineLoop,
  LineBasicMaterial,
} from 'three';
import { latLngToVector3 } from '../../utils/coordinates';

export interface WireframeEquatorBeamOptions {
  readonly color: string;
  readonly opacity: number;
  readonly radius: number;
  readonly pulseEnabled?: boolean;
  readonly pulseSpeedHz?: number;
}

const SAMPLE_STEP_DEG = 1; // dense — this is a "beam", not an ordinary parallel.

/**
 * The equator drawn as a thicker glowing closed line — independent from
 * `WireframeEmphasisLayer` so it can be tuned (or pulsed) on its own. Reads
 * as a "data spine" running around the planet and is the obvious place to
 * sell the Tron-data-feed metaphor.
 */
export class WireframeEquatorBeam {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: LineBasicMaterial;
  private readonly originalColor: string;
  private originalOpacity: number;
  private baseOpacity: number;
  private pulseEnabled: boolean;
  private pulseSpeedHz: number;

  public constructor(options: WireframeEquatorBeamOptions) {
    this.group = new Group();
    this.originalColor = options.color;
    this.originalOpacity = options.opacity;
    this.baseOpacity = options.opacity;
    this.pulseEnabled = options.pulseEnabled ?? false;
    this.pulseSpeedHz = options.pulseSpeedHz ?? 0.6;

    const positions: Array<number> = [];
    for (let lng = -180; lng < 180; lng += SAMPLE_STEP_DEG) {
      const v = latLngToVector3([0, lng], options.radius);
      positions.push(v.x, v.y, v.z);
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(positions), 3)
    );

    this.material = new LineBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const loop = new LineLoop(this.geometry, this.material);
    loop.renderOrder = 8;
    this.group.add(loop);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public update(elapsedSeconds: number): void {
    if (!this.pulseEnabled) {
      this.material.opacity = this.baseOpacity;
      return;
    }
    // Sin-bell pulse — never quite goes to zero so the beam "stays alive".
    const wave = (Math.sin(elapsedSeconds * this.pulseSpeedHz * 2 * Math.PI) + 1) * 0.5;
    this.material.opacity = this.baseOpacity * (0.5 + 0.5 * wave);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }

  /* ───────── live setters ───────── */

  public setColor(hex: string): void {
    this.material.color.set(hex);
  }

  public resetColor(): void {
    this.material.color.set(this.originalColor);
  }

  public setOpacity(opacity: number): void {
    this.baseOpacity = Math.max(0, Math.min(1, opacity));
  }

  public resetOpacity(): void {
    this.baseOpacity = this.originalOpacity;
  }

  public setPulse(enabled: boolean): void {
    this.pulseEnabled = enabled;
  }

  public setPulseSpeed(hz: number): void {
    this.pulseSpeedHz = Math.max(0, hz);
  }
}
