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

export interface HologramArcsLayerOptions {
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
  readonly auraLine: Line2;
  readonly auraMaterial: LineMaterial;
  readonly packetLine: Line2;
  readonly packetMaterial: LineMaterial;
  readonly head: Mesh | null;
  readonly samplePoints: Vector3[];
  readonly phase: number;
}

const SAMPLES = 64;

/**
 * Hologram-native connection beams. Each route is a layered projection:
 * a crisp carrier line, a much wider additive aura, a dashed "data packet"
 * glint riding the same great-circle, and an optional wireframe head probe.
 * It still honours the canonical ArcConfig fields, but maps them to a
 * holographic beam language rather than outline-style cartographic strokes.
 */
export class HologramArcsLayer {
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

  public constructor(options: HologramArcsLayerOptions) {
    this.group = new Group();
    this.group.name = 'HologramArcsLayer';
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
      entry.auraMaterial.resolution.set(width, height);
      entry.packetMaterial.resolution.set(width, height);
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
    const points = sampleArc(config.from, config.to, heightValue);

    // Line2 + LineMaterial use a screen-space pixel pipeline (instanced
    // segments rendered as quads) so `linewidth` is actually honoured —
    // unlike LineBasicMaterial which on WebGL2 always draws at 1px.
    const positions: number[] = [];
    for (const p of points) {
      positions.push(p.x, p.y, p.z);
    }
    const color = new Color(config.color ?? this.defaultColor);
    const lineWidth = config.width ?? this.defaultWidth;
    const isDashed = config.style === 'dashed';
    const carrierGeometry = buildLineGeometry(positions);
    const material = new LineMaterial({
      color: color.getHex(),
      linewidth: lineWidth,
      worldUnits: false, // pixel widths
      transparent: true,
      opacity: this.defaultOpacity * 0.9,
      dashed: isDashed,
      ...(isDashed
        ? { dashSize: config.dashSize ?? 0.04, gapSize: config.dashGap ?? 0.02 }
        : {}),
      resolution: this.resolution.clone(),
    });
    material.blending = AdditiveBlending;
    material.depthWrite = false;
    if (isDashed) material.defines.USE_DASH = '';
    material.needsUpdate = true;

    const line = new Line2(carrierGeometry, material);
    if (isDashed) line.computeLineDistances();
    this.group.add(line);

    const auraMaterial = new LineMaterial({
      color: color.getHex(),
      linewidth: Math.max(lineWidth * 4.2, 4),
      worldUnits: false,
      transparent: true,
      opacity: this.defaultOpacity * 0.18,
      resolution: this.resolution.clone(),
    });
    auraMaterial.blending = AdditiveBlending;
    auraMaterial.depthWrite = false;
    auraMaterial.needsUpdate = true;
    const auraLine = new Line2(buildLineGeometry(positions), auraMaterial);
    this.group.add(auraLine);

    const packetMaterial = new LineMaterial({
      color: new Color(this.headColor).getHex(),
      linewidth: Math.max(1, lineWidth * 0.85),
      worldUnits: false,
      transparent: true,
      opacity: config.animated === false ? this.defaultOpacity * 0.28 : this.defaultOpacity * 0.62,
      dashed: true,
      dashSize: config.dashSize ?? 0.055,
      gapSize: config.dashGap ?? 0.045,
      resolution: this.resolution.clone(),
    });
    packetMaterial.blending = AdditiveBlending;
    packetMaterial.depthWrite = false;
    packetMaterial.defines.USE_DASH = '';
    packetMaterial.needsUpdate = true;
    const packetLine = new Line2(buildLineGeometry(positions), packetMaterial);
    packetLine.computeLineDistances();
    this.group.add(packetLine);

    let head: Mesh | null = null;
    if (config.animated) {
      const headGeo = new SphereGeometry(this.headSize, 12, 12);
      const headMat = new MeshBasicMaterial({
        color: new Color(this.headColor),
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
        depthWrite: false,
        wireframe: true,
      });
      head = new Mesh(headGeo, headMat);
      this.group.add(head);
    }

    this.entries.set(config.id, {
      config,
      line,
      material,
      auraLine,
      auraMaterial,
      packetLine,
      packetMaterial,
      head,
      samplePoints: points,
      phase: hashPhase(config.id),
    });
  }

  public removeArc(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.line.geometry.dispose();
    entry.material.dispose();
    this.group.remove(entry.line);
    entry.auraLine.geometry.dispose();
    entry.auraMaterial.dispose();
    this.group.remove(entry.auraLine);
    entry.packetLine.geometry.dispose();
    entry.packetMaterial.dispose();
    this.group.remove(entry.packetLine);
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
      const flicker = 0.82 + 0.18 * Math.sin(elapsedSeconds * 8.7 + entry.phase * 6.28318);
      entry.material.opacity = this.defaultOpacity * 0.9 * flicker;
      entry.auraMaterial.opacity = this.defaultOpacity * 0.18 * (0.7 + 0.3 * flicker);
      entry.packetMaterial.opacity =
        (entry.config.animated === false ? this.defaultOpacity * 0.28 : this.defaultOpacity * 0.62) *
        (0.75 + 0.25 * Math.sin(elapsedSeconds * 11.0 + entry.phase * 9.0));
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
      const headScale = 1 + 0.28 * Math.sin(elapsedSeconds * 14 + entry.phase * 10);
      entry.head.scale.setScalar(headScale);
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
        fromVec.z * a + toVec.z * b
      );
    }
    const elevation = 1 + Math.sin(t * Math.PI) * height;
    interp.multiplyScalar(GLOBE_RADIUS * elevation);
    points.push(interp);
  }
  return points;
};
