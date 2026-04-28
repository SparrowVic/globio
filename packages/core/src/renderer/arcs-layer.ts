import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
import { easeInOutCubic } from '../utils/easing';
import type { ArcConfig, LatLng } from '../types';

export interface ArcsLayerOptions {
  readonly defaultColor: string;
  readonly defaultWidth: number;
  readonly defaultOpacity: number;
  readonly headColor: string;
  readonly headSize: number;
}

interface ArcEntry {
  readonly config: ArcConfig;
  readonly line: Line;
  readonly head: Mesh | null;
  readonly samplePoints: Vector3[];
}

const SAMPLES = 64;

/**
 * Connections between lat/lng pairs rendered as great-circle arcs lifted off
 * the globe surface. Curve uses spherical-lerp (slerp) between endpoints +
 * `sin(t·π) * height` radial elevation profile so arcs meet the globe
 * tangentially. Optional moving "head" particle, dashed style, distance-based
 * auto-height — all per-arc.
 */
export class ArcsLayer {
  public readonly group: Group;
  private readonly defaultColor: string;
  private readonly defaultWidth: number;
  private readonly defaultOpacity: number;
  private readonly headColor: string;
  private readonly headSize: number;
  private readonly entries = new Map<string, ArcEntry>();

  public constructor(options: ArcsLayerOptions) {
    this.group = new Group();
    this.group.name = 'ArcsLayer';
    this.defaultColor = options.defaultColor;
    this.defaultWidth = options.defaultWidth;
    this.defaultOpacity = options.defaultOpacity;
    this.headColor = options.headColor;
    this.headSize = options.headSize;
  }

  public setArcs(arcs: ReadonlyArray<ArcConfig>): void {
    const incomingIds = new Set(arcs.map((a) => a.id));
    for (const id of [...this.entries.keys()]) {
      if (!incomingIds.has(id)) this.removeArc(id);
    }
    for (const arc of arcs) {
      this.removeArc(arc.id);
      this.addArc(arc);
    }
  }

  public addArc(config: ArcConfig): void {
    if (this.entries.has(config.id)) this.removeArc(config.id);
    const heightValue = resolveHeight(config);
    const points = sampleArc(config.from, config.to, heightValue);
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const color = new Color(config.color ?? this.defaultColor);
    const lineWidth = config.width ?? this.defaultWidth;
    const isDashed = config.style === 'dashed';
    const material = isDashed
      ? new LineDashedMaterial({
          color,
          transparent: true,
          opacity: this.defaultOpacity,
          linewidth: lineWidth,
          dashSize: config.dashSize ?? 0.04,
          gapSize: config.dashGap ?? 0.02,
        })
      : new LineBasicMaterial({
          color,
          transparent: true,
          opacity: this.defaultOpacity,
          linewidth: lineWidth,
        });

    const line = new Line(geometry, material);
    if (isDashed) line.computeLineDistances();
    this.group.add(line);

    let head: Mesh | null = null;
    if (config.animated) {
      const headGeo = new SphereGeometry(this.headSize, 12, 12);
      const headMat = new MeshBasicMaterial({
        color: new Color(this.headColor),
        transparent: true,
        opacity: 1,
      });
      head = new Mesh(headGeo, headMat);
      this.group.add(head);
    }

    this.entries.set(config.id, { config, line, head, samplePoints: points });
  }

  public removeArc(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.line.geometry.dispose();
    (entry.line.material as LineBasicMaterial | LineDashedMaterial).dispose();
    this.group.remove(entry.line);
    if (entry.head) {
      entry.head.geometry.dispose();
      (entry.head.material as MeshBasicMaterial).dispose();
      this.group.remove(entry.head);
    }
    this.entries.delete(id);
  }

  /** Drive head animation. Pass total elapsed seconds. */
  public update(elapsedSeconds: number): void {
    this.entries.forEach((entry) => {
      if (!entry.head) return;
      const duration = entry.config.animationDuration ?? 2;
      const tRaw = (elapsedSeconds % duration) / duration; // 0..1
      const easing = entry.config.headEasing ?? 'linear';

      // Position along arc (eased for easeInOut, linear otherwise)
      const tPos = easing === 'easeInOut' ? easeInOutCubic(tRaw) : tRaw;
      const idxFloat = tPos * (entry.samplePoints.length - 1);
      const idx = Math.floor(idxFloat);
      const frac = idxFloat - idx;
      const a = entry.samplePoints[idx];
      const b = entry.samplePoints[Math.min(idx + 1, entry.samplePoints.length - 1)];
      if (!a || !b) return;
      entry.head.position.set(
        a.x + (b.x - a.x) * frac,
        a.y + (b.y - a.y) * frac,
        a.z + (b.z - a.z) * frac
      );

      // Opacity (pulse fades in/out across the cycle; others stay at 1)
      const headMat = entry.head.material as MeshBasicMaterial;
      headMat.opacity = easing === 'pulse' ? Math.sin(tRaw * Math.PI) : 1;
    });
  }

  public dispose(): void {
    [...this.entries.keys()].forEach((id) => this.removeArc(id));
    this.group.clear();
  }
}

const resolveHeight = (config: ArcConfig): number => {
  if (config.height === 'auto') {
    const angle = angularDistance(config.from, config.to);
    const min = config.minHeight ?? 0.15;
    const max = config.maxHeight ?? 0.6;
    return min + (max - min) * (angle / Math.PI);
  }
  return config.height ?? 0.4;
};

const angularDistance = (a: LatLng, b: LatLng): number => {
  const va = latLngToVector3(a, 1);
  const vb = latLngToVector3(b, 1);
  return va.angleTo(vb);
};

const sampleArc = (from: LatLng, to: LatLng, height: number): Vector3[] => {
  const fromVec = latLngToVector3(from, 1);
  const toVec = latLngToVector3(to, 1);
  const angle = fromVec.angleTo(toVec);
  const sinAngle = Math.sin(angle);
  const points: Vector3[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
    let interp: Vector3;
    if (sinAngle < 1e-6) {
      interp = fromVec.clone();
    } else {
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      interp = new Vector3(
        fromVec.x * a + toVec.x * b,
        fromVec.y * a + toVec.y * b,
        fromVec.z * a + toVec.z * b
      );
    }
    const elevation = 1 + Math.sin(t * Math.PI) * height;
    interp.multiplyScalar(GLOBE_RADIUS * elevation);
    points.push(interp);
  }
  return points;
};
