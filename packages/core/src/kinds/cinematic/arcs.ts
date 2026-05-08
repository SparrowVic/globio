import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { easeInOutCubic } from '../../utils/easing';
import type { ArcConfig, LatLng } from '../../types';

export interface CinematicArcsLayerOptions {
  readonly defaultColor: string;
  readonly defaultWidth: number;
  readonly defaultOpacity: number;
  readonly headColor: string;
  readonly headSize: number;
  readonly resolution?: Vector2;
}

interface ArcEntry {
  readonly config: ArcConfig;
  readonly carrierLine: Line2;
  readonly carrierMaterial: LineMaterial;
  readonly glowLine: Line2;
  readonly glowMaterial: LineMaterial;
  readonly tracerLine: Line2;
  readonly tracerMaterial: LineMaterial;
  readonly head: Mesh | null;
  readonly headGlow: Mesh | null;
  readonly samplePoints: Vector3[];
  readonly phase: number;
}

const SAMPLES = 84;

export class CinematicArcsLayer {
  public readonly group: Group;
  private readonly defaultColor: string;
  private readonly defaultWidth: number;
  private readonly defaultOpacity: number;
  private readonly headColor: string;
  private readonly headSize: number;
  private readonly entries = new Map<string, ArcEntry>();
  private resolution: Vector2;

  public constructor(options: CinematicArcsLayerOptions) {
    this.group = new Group();
    this.group.name = 'CinematicArcsLayer';
    this.defaultColor = options.defaultColor;
    this.defaultWidth = options.defaultWidth;
    this.defaultOpacity = options.defaultOpacity;
    this.headColor = options.headColor;
    this.headSize = options.headSize;
    this.resolution = options.resolution ?? new Vector2(window.innerWidth, window.innerHeight);
  }

  public setResolution(width: number, height: number): void {
    this.resolution.set(width, height);
    this.entries.forEach((entry) => {
      entry.carrierMaterial.resolution.set(width, height);
      entry.glowMaterial.resolution.set(width, height);
      entry.tracerMaterial.resolution.set(width, height);
    });
  }

  public setArcs(arcs: ReadonlyArray<ArcConfig>): void {
    const incomingIds = new Set(arcs.map((arc) => arc.id));
    for (const id of [...this.entries.keys()]) {
      if (!incomingIds.has(id)) this.removeArc(id);
    }
    arcs.forEach((arc) => {
      this.removeArc(arc.id);
      this.addArc(arc);
    });
  }

  public addArc(config: ArcConfig): void {
    if (this.entries.has(config.id)) this.removeArc(config.id);
    const heightValue = resolveHeight(config);
    const points = sampleArc(config.from, config.to, heightValue);
    const positions = points.flatMap((point) => [point.x, point.y, point.z]);
    const color = new Color(config.color ?? this.defaultColor);
    const headColor = new Color(this.headColor).lerp(color, 0.32);
    const lineWidth = config.width ?? this.defaultWidth;
    const dashed = config.style === 'dashed';

    const carrierMaterial = new LineMaterial({
      color: color.getHex(),
      linewidth: Math.max(1, lineWidth * 0.86),
      worldUnits: false,
      transparent: true,
      opacity: this.defaultOpacity * 0.58,
      dashed,
      ...(dashed
        ? { dashSize: config.dashSize ?? 0.052, gapSize: config.dashGap ?? 0.036 }
        : {}),
      resolution: this.resolution.clone(),
    });
    carrierMaterial.blending = AdditiveBlending;
    carrierMaterial.depthWrite = false;
    if (dashed) carrierMaterial.defines.USE_DASH = '';
    carrierMaterial.needsUpdate = true;
    const carrierLine = new Line2(buildLineGeometry(positions), carrierMaterial);
    if (dashed) carrierLine.computeLineDistances();
    carrierLine.renderOrder = 8;
    this.group.add(carrierLine);

    const glowMaterial = new LineMaterial({
      color: color.getHex(),
      linewidth: Math.max(4, lineWidth * 3.9),
      worldUnits: false,
      transparent: true,
      opacity: this.defaultOpacity * 0.1,
      resolution: this.resolution.clone(),
    });
    glowMaterial.blending = AdditiveBlending;
    glowMaterial.depthWrite = false;
    glowMaterial.needsUpdate = true;
    const glowLine = new Line2(buildLineGeometry(positions), glowMaterial);
    glowLine.renderOrder = 7;
    this.group.add(glowLine);

    const tracerMaterial = new LineMaterial({
      color: headColor.getHex(),
      linewidth: Math.max(1, lineWidth * 0.66),
      worldUnits: false,
      transparent: true,
      opacity: config.animated === false ? this.defaultOpacity * 0.18 : this.defaultOpacity * 0.52,
      dashed: true,
      dashSize: config.dashSize ?? 0.045,
      gapSize: config.dashGap ?? 0.07,
      resolution: this.resolution.clone(),
    });
    tracerMaterial.blending = AdditiveBlending;
    tracerMaterial.depthWrite = false;
    tracerMaterial.defines.USE_DASH = '';
    tracerMaterial.needsUpdate = true;
    const tracerLine = new Line2(buildLineGeometry(positions), tracerMaterial);
    tracerLine.computeLineDistances();
    tracerLine.renderOrder = 9;
    this.group.add(tracerLine);

    let head: Mesh | null = null;
    let headGlow: Mesh | null = null;
    if (config.animated) {
      const headGeo = new SphereGeometry(this.headSize * 0.78, 16, 16);
      const headMat = new MeshBasicMaterial({
        color: headColor,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      head = new Mesh(headGeo, headMat);
      head.renderOrder = 11;
      this.group.add(head);

      const glowGeo = new SphereGeometry(this.headSize * 2.2, 18, 18);
      const glowMat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      headGlow = new Mesh(glowGeo, glowMat);
      headGlow.renderOrder = 10;
      this.group.add(headGlow);
    }

    this.entries.set(config.id, {
      config,
      carrierLine,
      carrierMaterial,
      glowLine,
      glowMaterial,
      tracerLine,
      tracerMaterial,
      head,
      headGlow,
      samplePoints: points,
      phase: hashPhase(config.id),
    });
  }

  public removeArc(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.carrierLine.geometry.dispose();
    entry.carrierMaterial.dispose();
    this.group.remove(entry.carrierLine);
    entry.glowLine.geometry.dispose();
    entry.glowMaterial.dispose();
    this.group.remove(entry.glowLine);
    entry.tracerLine.geometry.dispose();
    entry.tracerMaterial.dispose();
    this.group.remove(entry.tracerLine);
    if (entry.head) {
      entry.head.geometry.dispose();
      (entry.head.material as MeshBasicMaterial).dispose();
      this.group.remove(entry.head);
    }
    if (entry.headGlow) {
      entry.headGlow.geometry.dispose();
      (entry.headGlow.material as MeshBasicMaterial).dispose();
      this.group.remove(entry.headGlow);
    }
    this.entries.delete(id);
  }

  public update(elapsedSeconds: number): void {
    this.entries.forEach((entry) => {
      const wave = 0.82 + 0.18 * Math.sin(elapsedSeconds * 2.1 + entry.phase * Math.PI * 2);
      entry.carrierMaterial.opacity = this.defaultOpacity * 0.58 * wave;
      entry.glowMaterial.opacity = this.defaultOpacity * 0.1 * (0.74 + wave * 0.26);
      entry.tracerMaterial.opacity =
        (entry.config.animated === false ? this.defaultOpacity * 0.18 : this.defaultOpacity * 0.52) *
        (0.72 + 0.28 * Math.sin(elapsedSeconds * 3.4 + entry.phase * 8));
      setDashOffset(entry.tracerMaterial, -elapsedSeconds * (0.035 + entry.phase * 0.024));

      if (!entry.head) return;
      const duration = entry.config.animationDuration ?? 2.4;
      const tRaw = (elapsedSeconds % duration) / duration;
      const easing = entry.config.headEasing ?? 'linear';
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
        a.z + (b.z - a.z) * frac,
      );
      const headOpacity = easing === 'pulse' ? Math.sin(tRaw * Math.PI) : 1;
      (entry.head.material as MeshBasicMaterial).opacity = 0.94 * headOpacity;
      const headScale = 1 + 0.22 * Math.sin(elapsedSeconds * 5.5 + entry.phase * 11);
      entry.head.scale.setScalar(headScale);
      if (entry.headGlow) {
        entry.headGlow.position.copy(entry.head.position);
        entry.headGlow.scale.setScalar(0.9 + headScale * 0.28);
        (entry.headGlow.material as MeshBasicMaterial).opacity = 0.2 * headOpacity;
      }
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
    const min = config.minHeight ?? 0.18;
    const max = config.maxHeight ?? 0.68;
    return min + (max - min) * (angle / Math.PI);
  }
  return config.height ?? 0.46;
};

const buildLineGeometry = (positions: ReadonlyArray<number>): LineGeometry => {
  const geometry = new LineGeometry();
  geometry.setPositions([...positions]);
  return geometry;
};

const hashPhase = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
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
        fromVec.z * a + toVec.z * b,
      );
    }
    const elevation = 1 + Math.sin(t * Math.PI) * height;
    interp.multiplyScalar(GLOBE_RADIUS * elevation);
    points.push(interp);
  }
  return points;
};

const setDashOffset = (material: LineMaterial, offset: number): void => {
  (material as LineMaterial & { dashOffset?: number }).dashOffset = offset;
};
