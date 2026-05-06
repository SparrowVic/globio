import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
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
import { seededJitter } from './jitter';

export interface PaperArcsLayerOptions {
  readonly defaultColor: string;
  readonly defaultWidth: number;
  readonly defaultOpacity: number;
  readonly headColor: string;
  readonly headSize: number;
  /**
   * Initial pixel resolution for screen-space line widths. The layer
   * keeps each arc's `LineMaterial.resolution` uniform in sync via
   * `setResolution` from the scene manager on resize.
   */
  readonly resolution?: Vector2;
}

interface ArcEntry {
  readonly config: ArcConfig;
  readonly line: Line2;
  readonly material: LineMaterial;
  readonly washLine: Line2;
  readonly washMaterial: LineMaterial;
  readonly head: Mesh | null;
  readonly samplePoints: Vector3[];
}

const SAMPLES = 64;
const ROUTE_LIFT = 1.002;
const INK_WOBBLE = 0.010;
const WASH_WIDTH_FACTOR = 2.8;

/**
 * Paper-native routes. They still follow great circles, but the visual is
 * two-pass cartographic ink: a wide translucent watercolor wash below and
 * a thinner, slightly wobbled route line on top. Animated heads read as
 * small moving sealing-wax dots instead of sci-fi packets.
 */
export class PaperArcsLayer {
  public readonly group: Group;
  private readonly defaultColor: string;
  private readonly defaultWidth: number;
  private readonly defaultOpacity: number;
  private readonly headColor: string;
  private readonly headSize: number;
  private readonly entries = new Map<string, ArcEntry>();
  // Mutable so resize handlers can keep all arcs in sync without
  // walking the entries from outside.
  private resolution: Vector2;

  public constructor(options: PaperArcsLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperArcsLayer';
    this.defaultColor = options.defaultColor;
    this.defaultWidth = options.defaultWidth;
    this.defaultOpacity = options.defaultOpacity;
    this.headColor = options.headColor;
    this.headSize = options.headSize;
    this.resolution = options.resolution ?? new Vector2(window.innerWidth, window.innerHeight);
  }

  /**
   * Sync the screen-space resolution used by `LineMaterial` for pixel
   * widths. SceneManager calls this on every resize. Each arc's
   * material is mutated in-place — no rebuild.
   */
  public setResolution(width: number, height: number): void {
    this.resolution.set(width, height);
    this.entries.forEach((entry) => {
      entry.material.resolution.set(width, height);
      entry.washMaterial.resolution.set(width, height);
    });
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
    const points = sampleArc(config.id, config.from, config.to, heightValue);

    // Line2 + LineMaterial use a screen-space pixel pipeline (instanced
    // segments rendered as quads) so `linewidth` is actually honoured —
    // unlike LineBasicMaterial which on WebGL2 always draws at 1px.
    const positions: number[] = [];
    for (const p of points) {
      positions.push(p.x, p.y, p.z);
    }
    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const color = new Color(config.color ?? this.defaultColor);
    const lineWidth = Math.max(0.7, (config.width ?? this.defaultWidth) * 0.82);
    const isDashed = config.style === 'dashed';
    const washMaterial = new LineMaterial({
      color: color.getHex(),
      linewidth: Math.max(2.4, lineWidth * WASH_WIDTH_FACTOR),
      worldUnits: false,
      transparent: true,
      opacity: Math.min(0.38, this.defaultOpacity * 0.32),
      dashed: false,
      resolution: this.resolution.clone(),
      blending: NormalBlending,
      depthWrite: false,
    });
    washMaterial.needsUpdate = true;
    const washGeometry = new LineGeometry();
    washGeometry.setPositions(positions);
    const washLine = new Line2(washGeometry, washMaterial);
    washLine.renderOrder = 5;
    this.group.add(washLine);

    const material = new LineMaterial({
      color: color.getHex(),
      linewidth: lineWidth,
      worldUnits: false, // pixel widths
      transparent: true,
      opacity: Math.min(1, this.defaultOpacity * 0.92),
      dashed: isDashed,
      ...(isDashed
        ? { dashSize: config.dashSize ?? 0.04, gapSize: config.dashGap ?? 0.02 }
        : {}),
      resolution: this.resolution.clone(),
      blending: NormalBlending,
      depthWrite: false,
    });
    if (isDashed) material.defines.USE_DASH = '';
    material.needsUpdate = true;

    const line = new Line2(geometry, material);
    line.renderOrder = 6;
    if (isDashed) line.computeLineDistances();
    this.group.add(line);

    let head: Mesh | null = null;
    if (config.animated) {
      const headGeo = new SphereGeometry(this.headSize * 1.25, 12, 12);
      const headMat = new MeshBasicMaterial({
        color: new Color(config.color ?? this.headColor),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: NormalBlending,
      });
      head = new Mesh(headGeo, headMat);
      head.renderOrder = 7;
      this.group.add(head);
    }

    this.entries.set(config.id, {
      config,
      line,
      material,
      washLine,
      washMaterial,
      head,
      samplePoints: points,
    });
  }

  public removeArc(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.line.geometry.dispose();
    entry.material.dispose();
    this.group.remove(entry.line);
    entry.washLine.geometry.dispose();
    entry.washMaterial.dispose();
    this.group.remove(entry.washLine);
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
      const pulse = Math.sin(tRaw * Math.PI);
      headMat.opacity = easing === 'pulse' ? 0.2 + pulse * 0.75 : 0.9;
      const s = easing === 'pulse' ? 0.75 + pulse * 0.45 : 1;
      entry.head.scale.setScalar(s);
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

const sampleArc = (id: string, from: LatLng, to: LatLng, height: number): Vector3[] => {
  const fromVec = latLngToVector3(from, 1);
  const toVec = latLngToVector3(to, 1);
  const angle = fromVec.angleTo(toVec);
  const sinAngle = Math.sin(angle);
  const points: Vector3[] = [];
  const up = new Vector3(0, 1, 0);
  const tangent = new Vector3();
  const bitangent = new Vector3();
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
    const normal = interp.clone().normalize();
    const helper = Math.abs(normal.dot(up)) > 0.96 ? new Vector3(1, 0, 0) : up;
    tangent.crossVectors(helper, normal).normalize();
    bitangent.crossVectors(normal, tangent).normalize();
    const wobble =
      Math.sin(t * Math.PI) *
      seededJitter(`paper.arc.wobble|${id}|${i}`) *
      INK_WOBBLE;
    interp
      .copy(normal)
      .addScaledVector(tangent, wobble)
      .addScaledVector(bitangent, seededJitter(`paper.arc.cross|${id}|${i}`) * wobble * 0.35)
      .normalize();
    const elevation = ROUTE_LIFT + Math.sin(t * Math.PI) * height;
    interp.multiplyScalar(GLOBE_RADIUS * elevation);
    points.push(interp);
  }
  return points;
};
