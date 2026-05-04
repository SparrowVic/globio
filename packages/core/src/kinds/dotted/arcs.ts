import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { ArcConfig, LatLng } from '../../types';

export interface DottedArcsLayerOptions {
  readonly defaultColor: string;
  /** Kept for API parity with the shared `ArcsLayer`; ignored by the dotted variant (line width has no analogue when the path is a particle stream). */
  readonly defaultWidth: number;
  readonly defaultOpacity: number;
  readonly headColor: string;
  /** Base particle screen size (controls how chunky the dot trail reads). */
  readonly headSize: number;
  /** Kept for API parity with the shared `ArcsLayer.setResolution`; the dotted variant draws Points (no LineMaterial pixel-resolution dependency). */
  readonly resolution?: Vector2;
}

/** Tuned constants for the particle-stream look. */
const DEFAULTS = {
  /** Particles per arc — denser path = stronger "telegraph signal" line, but more GPU. 80 is the sweet spot for ~8-arc demos. */
  pointsPerArc: 80,
  /** Sigma of the moving "head" brightness peak (in fraction-of-arc units). Wider = a longer streak; narrower = a sharper spark. */
  headSigma: 0.06,
  /** Baseline brightness of "tail" (non-head) dots — the steady glowing path the head rides on. 0 = invisible without head, 0.25 = always readable. */
  tailBrightness: 0.22,
  /** Default arc cycle period (seconds) when the caller's arc has no `animationDuration`. */
  defaultDurationSec: 3.5,
} as const;

const VERT_SHADER = /* glsl */ `
  attribute float aT;          // 0..1 position along the arc
  attribute float aSpeed;      // 1/duration — per-particle so each arc cycles at its own pace
  attribute vec3 aTailColor;   // base color (config.color or theme default)
  attribute vec3 aHeadColor;   // moving-spark color (config.headColor or theme accent)
  attribute float aAnimated;   // 1.0 if arc is animated, 0.0 = static glow
  uniform float uTime;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uTailBrightness;
  uniform float uHeadSigma;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Head position along the arc, advancing with time. Wrap to [0,1).
    float head = mod(uTime * aSpeed, 1.0);

    // Distance to head, wrapped on the unit circle so the spark can
    // teleport from t=0.99 to t=0.01 without flickering.
    float d = abs(aT - head);
    if (d > 0.5) d = 1.0 - d;

    // Sharp Gaussian peak at the head — sigma controls streak length.
    float sigma = max(uHeadSigma, 1e-4);
    float headWeight = exp(-(d / sigma) * (d / sigma));
    // Animated arcs: head spark on top of baseline tail glow. Static
    // arcs: ignore the head and just show the tail evenly across the path.
    float brightness = mix(1.0, uTailBrightness + headWeight, aAnimated);

    // Color blend: head dot picks up the head colour near the spark,
    // fades back to the tail colour along the body. Smoothstep gives a
    // softer gradient than linear lerp.
    float tColor = smoothstep(0.0, sigma * 2.0, d);
    vColor = mix(aHeadColor, aTailColor, tColor);
    vAlpha = brightness * uOpacity;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Size scales with brightness so the head reads visibly bigger
    // than the tail — same trick the surface dot field uses.
    gl_PointSize = uPointSize * (0.55 + 0.85 * brightness) * uPixelRatio * (1.0 / -mv.z);
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.001) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = dot(uv, uv);
    // Soft round disc with a hot core — same shape family as the
    // surface dot field so arcs feel like part of the same world.
    float disc = smoothstep(0.25, 0.0, d);
    if (disc < 0.001) discard;
    gl_FragColor = vec4(vColor, disc * vAlpha);
  }
`;

/**
 * Dotted-native arcs. Replaces the shared `Line2`-based stroke with a
 * **particle stream**: every arc is rendered as a chain of glowing
 * dots tracing the great-circle path, with a brighter "head" spark
 * sliding along it like a telegraph signal. Static (non-animated)
 * arcs render the chain at uniform brightness — a steady stippled
 * trail — while animated ones get the moving spark.
 *
 * Why particle streams: the shared line layer reads as foreign material
 * on a globe that's otherwise nothing but dots. Particles built on the
 * same Points / additive-blend / soft-disc shader family as the
 * surface dot field tie arcs visually into the rest of the kind. The
 * resulting picture reads as "data flowing across the network" rather
 * than "lines drawn on top of stars".
 */
export class DottedArcsLayer {
  public readonly group: Group;
  private readonly material: ShaderMaterial;
  private points: Points | null = null;
  private geometry: BufferGeometry | null = null;
  private readonly defaultColor: Color;
  private readonly headColor: Color;
  private readonly defaultOpacity: number;
  private readonly basePointSize: number;
  // Track the active arc set so `addArc` / `removeArc` can rebuild
  // the particle stream incrementally without forcing callers to
  // re-send the whole list each time.
  private currentArcs: Array<ArcConfig> = [];

  public constructor(options: DottedArcsLayerOptions) {
    this.group = new Group();
    this.group.name = 'DottedArcsLayer';
    this.defaultColor = new Color(options.defaultColor);
    this.headColor = new Color(options.headColor);
    this.defaultOpacity = options.defaultOpacity;
    // headSize from theme tokens lives in lat/lng-radius units (e.g.
    // 0.012). Multiply into shader-pixel range so a small theme value
    // becomes a chunky-but-not-huge dot.
    this.basePointSize = options.headSize * 800;

    const pixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPointSize: { value: this.basePointSize },
        uPixelRatio: { value: pixelRatio },
        uOpacity: { value: this.defaultOpacity },
        uTailBrightness: { value: DEFAULTS.tailBrightness },
        uHeadSigma: { value: DEFAULTS.headSigma },
      },
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }

  /** No-op for dotted arcs (Points don't depend on screen-pixel resolution like LineMaterial does). Kept so SceneManager's onResize plumbing works without branching. */
  public setResolution(_width: number, _height: number): void {
    /* no-op */
  }

  /**
   * Replace the displayed arc set. Each arc gets `pointsPerArc` particles
   * baked into a single shared geometry; the shader drives per-arc
   * timing through per-particle attributes. Calling with `[]` clears
   * everything in one frame — no leftover ghosts from the previous set.
   */
  public setArcs(arcs: ReadonlyArray<ArcConfig>): void {
    this.currentArcs = [...arcs];
    this.rebuild();
  }

  /**
   * Append one arc to the current set without disturbing the others.
   * Re-runs the geometry build (cheap — `pointsPerArc` particles per
   * arc, even at 50 arcs that's 4k positions / sub-millisecond bake).
   */
  public addArc(config: ArcConfig): void {
    // Replace by id if it already exists — same semantic as the shared
    // ArcsLayer so callers can use `addArc` as an upsert.
    const existing = this.currentArcs.findIndex((a) => a.id === config.id);
    if (existing >= 0) this.currentArcs[existing] = config;
    else this.currentArcs.push(config);
    this.rebuild();
  }

  /** Remove an arc by id. Silently no-ops on unknown ids. */
  public removeArc(id: string): void {
    const idx = this.currentArcs.findIndex((a) => a.id === id);
    if (idx < 0) return;
    this.currentArcs.splice(idx, 1);
    this.rebuild();
  }

  private rebuild(): void {
    this.disposeMesh();
    const arcs = this.currentArcs;
    if (arcs.length === 0) return;

    const N = DEFAULTS.pointsPerArc;
    const total = arcs.length * N;
    const positions = new Float32Array(total * 3);
    const aT = new Float32Array(total);
    const aSpeed = new Float32Array(total);
    const aTailColor = new Float32Array(total * 3);
    const aHeadColor = new Float32Array(total * 3);
    const aAnimated = new Float32Array(total);

    const fromVec = new Vector3();
    const toVec = new Vector3();
    const interp = new Vector3();
    const tmp = new Vector3();
    let writeIdx = 0;

    for (const arc of arcs) {
      latLngToVector3(arc.from, 1, fromVec);
      latLngToVector3(arc.to, 1, toVec);
      // Great-circle angle for slerp + height interpolation.
      const dot = Math.max(-1, Math.min(1, fromVec.dot(toVec)));
      const omega = Math.acos(dot);
      const sinOmega = Math.sin(omega);

      const heightSpec = arc.height ?? 'auto';
      const minH = arc.minHeight ?? 0.15;
      const maxH = arc.maxHeight ?? 0.6;
      const heightFactor =
        typeof heightSpec === 'number'
          ? heightSpec
          : minH + (maxH - minH) * Math.min(1, omega / Math.PI);

      const tail = arc.color ? new Color(arc.color) : this.defaultColor;
      const animated = arc.animated ?? false;
      // Per-particle speed = 1 / duration; static arcs get speed 0 so
      // the head stays put (we suppress its visual via aAnimated=0).
      const duration = arc.animationDuration ?? DEFAULTS.defaultDurationSec;
      const speed = animated ? 1 / Math.max(0.05, duration) : 0;

      for (let k = 0; k < N; k++) {
        const t = k / (N - 1);
        // slerp for stable curvature on long great-circles
        if (sinOmega < 1e-6) {
          // Endpoints coincident — degenerate arc, just place all
          // particles on `fromVec`. Won't be visible as a line; user
          // gets a cluster, which is correct for a 0-length arc.
          interp.copy(fromVec);
        } else {
          const a = Math.sin((1 - t) * omega) / sinOmega;
          const b = Math.sin(t * omega) / sinOmega;
          interp.copy(fromVec).multiplyScalar(a);
          tmp.copy(toVec).multiplyScalar(b);
          interp.add(tmp);
        }
        // Height arch — sin(πt) gives a smooth peak at the midpoint.
        const archLift = 1 + heightFactor * Math.sin(t * Math.PI);
        const radius = GLOBE_RADIUS * archLift;
        interp.normalize().multiplyScalar(radius);
        positions[writeIdx * 3] = interp.x;
        positions[writeIdx * 3 + 1] = interp.y;
        positions[writeIdx * 3 + 2] = interp.z;

        aT[writeIdx] = t;
        aSpeed[writeIdx] = speed;
        aTailColor[writeIdx * 3] = tail.r;
        aTailColor[writeIdx * 3 + 1] = tail.g;
        aTailColor[writeIdx * 3 + 2] = tail.b;
        aHeadColor[writeIdx * 3] = this.headColor.r;
        aHeadColor[writeIdx * 3 + 1] = this.headColor.g;
        aHeadColor[writeIdx * 3 + 2] = this.headColor.b;
        aAnimated[writeIdx] = animated ? 1 : 0;

        writeIdx++;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aT', new Float32BufferAttribute(aT, 1));
    geometry.setAttribute('aSpeed', new Float32BufferAttribute(aSpeed, 1));
    geometry.setAttribute('aTailColor', new Float32BufferAttribute(aTailColor, 3));
    geometry.setAttribute('aHeadColor', new Float32BufferAttribute(aHeadColor, 3));
    geometry.setAttribute('aAnimated', new Float32BufferAttribute(aAnimated, 1));

    this.geometry = geometry;
    const points = new Points(geometry, this.material);
    points.frustumCulled = false;
    points.renderOrder = 6;
    this.points = points;
    this.group.add(points);
  }

  public update(elapsedSeconds: number): void {
    const u = this.material.uniforms['uTime'];
    if (u) u.value = elapsedSeconds;
  }

  public dispose(): void {
    this.disposeMesh();
    this.material.dispose();
  }

  private disposeMesh(): void {
    if (this.points) {
      this.group.remove(this.points);
      this.points = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
  }
}

// LatLng kept available for callers who set arcs from outside the kind
// (mirrors the shared layer's import surface).
export type { LatLng };
