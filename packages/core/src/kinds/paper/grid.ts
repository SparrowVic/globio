import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';

export interface PaperGridLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly stepDeg?: number;
  readonly majorEvery?: number;
  readonly majorOpacity?: number;
}

const GRID_RADIUS = GLOBE_RADIUS * 1.0004;
const SAMPLE_STEP_DEG = 4;

const DEFAULT_STEP = 15;
const DEFAULT_MAJOR_EVERY = 3; // every 3rd line at 15° step → emphasise 45° / 135° / equator
const DEFAULT_MAJOR_OPACITY_FACTOR = 1.6;

/**
 * Faint warm-grey atlas registration grid. Equirectangular lat/lng lines
 * sampled at a coarse density so they read as a printed grid behind the
 * land, not a sci-fi wireframe. Two parallel sub-grids — minor (every
 * `stepDeg`) at the base opacity, major (every `stepDeg × majorEvery`) at
 * a ramped opacity — give the user a tuneable visual hierarchy without a
 * shader.
 *
 * All inputs are live-tunable; geometry-baked fields (step, majorEvery)
 * trigger an in-place rebuild — single BufferGeometry, no measurable hitch.
 */
export class PaperGridLayer {
  public readonly group: Group;
  private currentColor: string;
  private currentOpacity: number;
  private currentStep: number;
  private currentMajorEvery: number;
  private currentMajorOpacity: number;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private readonly defaultStep: number;
  private readonly defaultMajorEvery: number;
  private readonly defaultMajorOpacity: number;

  // Materials persist across rebuilds so opacity/color updates don't
  // churn shader compilations.
  private readonly minorMaterial: LineBasicMaterial;
  private readonly majorMaterial: LineBasicMaterial;
  private liveGeometries: Array<BufferGeometry> = [];

  public constructor(options: PaperGridLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperGridLayer';
    this.currentColor = options.color;
    this.currentOpacity = options.opacity;
    this.currentStep = options.stepDeg ?? DEFAULT_STEP;
    this.currentMajorEvery = options.majorEvery ?? DEFAULT_MAJOR_EVERY;
    this.currentMajorOpacity =
      options.majorOpacity ?? Math.min(1, options.opacity * DEFAULT_MAJOR_OPACITY_FACTOR);
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;
    this.defaultStep = this.currentStep;
    this.defaultMajorEvery = this.currentMajorEvery;
    this.defaultMajorOpacity = this.currentMajorOpacity;

    this.minorMaterial = new LineBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: this.currentOpacity,
      depthWrite: false,
    });
    this.majorMaterial = new LineBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: this.currentMajorOpacity,
      depthWrite: false,
    });

    this.rebuild();
  }

  private rebuild(): void {
    for (const g of this.liveGeometries) g.dispose();
    this.liveGeometries = [];
    this.group.clear();

    const step = Math.max(1, this.currentStep);
    const major = Math.max(1, Math.round(this.currentMajorEvery));

    const minorPositions: Array<number> = [];
    const majorPositions: Array<number> = [];

    let row = 0;
    for (let lat = -90 + step; lat <= 90 - step + 1e-6; lat += step) {
      const target = row % major === 0 ? majorPositions : minorPositions;
      let prev = latLngToVector3([lat, -180], GRID_RADIUS);
      for (let lng = -180 + SAMPLE_STEP_DEG; lng <= 180 + 1e-6; lng += SAMPLE_STEP_DEG) {
        const next = latLngToVector3([lat, lng], GRID_RADIUS);
        target.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
      row += 1;
    }
    let col = 0;
    for (let lng = -180; lng <= 180 - step + 1e-6; lng += step) {
      const target = col % major === 0 ? majorPositions : minorPositions;
      let prev = latLngToVector3([-90, lng], GRID_RADIUS);
      for (let lat = -90 + SAMPLE_STEP_DEG; lat <= 90 + 1e-6; lat += SAMPLE_STEP_DEG) {
        const next = latLngToVector3([lat, lng], GRID_RADIUS);
        target.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
      col += 1;
    }

    if (minorPositions.length > 0) {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(new Float32Array(minorPositions), 3));
      this.liveGeometries.push(g);
      this.group.add(new LineSegments(g, this.minorMaterial));
    }
    if (majorPositions.length > 0) {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(new Float32Array(majorPositions), 3));
      this.liveGeometries.push(g);
      this.group.add(new LineSegments(g, this.majorMaterial));
    }
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.minorMaterial.color.set(color);
    this.majorMaterial.color.set(color);
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.minorMaterial.opacity = opacity;
  }

  public resetOpacity(): void {
    this.setOpacity(this.defaultOpacity);
  }

  public setMajorOpacity(opacity: number): void {
    this.currentMajorOpacity = opacity;
    this.majorMaterial.opacity = opacity;
  }

  public resetMajorOpacity(): void {
    this.setMajorOpacity(this.defaultMajorOpacity);
  }

  public setStep(stepDeg: number): void {
    if (stepDeg === this.currentStep) return;
    this.currentStep = Math.max(1, stepDeg);
    this.rebuild();
  }

  public resetStep(): void {
    this.setStep(this.defaultStep);
  }

  public setMajorEvery(every: number): void {
    if (every === this.currentMajorEvery) return;
    this.currentMajorEvery = Math.max(1, Math.round(every));
    this.rebuild();
  }

  public resetMajorEvery(): void {
    this.setMajorEvery(this.defaultMajorEvery);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const g of this.liveGeometries) g.dispose();
    this.liveGeometries = [];
    this.minorMaterial.dispose();
    this.majorMaterial.dispose();
    this.group.clear();
  }
}
