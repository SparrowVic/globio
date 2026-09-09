import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';

export interface StarfieldTwinkleOptions {
  /** Default false. Twinkle is opt-in — static stars are also fine. */
  readonly enabled?: boolean;
  /** Brightness variation amplitude per star, 0..1. Default 0.45. */
  readonly intensity?: number;
  /** Average twinkle frequency (Hz). Default 0.55. */
  readonly speed?: number;
}

export interface DottedStarfieldLayerOptions {
  readonly count: number;
  readonly color: string;
  readonly size: number;
  readonly radius?: number;
  readonly palette?: ReadonlyArray<string>;
  readonly sizeVariety?: number;
  readonly twinkle?: StarfieldTwinkleOptions;
  /** Viewport-edge fade width, as a 0..0.5 fraction. Default 0. */
  readonly edgeFade?: number;
  /**
   * Constellation overlay — faint lines between nearby stars, slowly
   * fading in and out so the visible "constellations" shift over
   * time. Default-on for the dotted kind because it's the layer's
   * defining visual flourish; pass `false` to disable.
   */
  readonly constellations?:
    | boolean
    | {
        /** Default true. */
        readonly enabled?: boolean;
        /** Max distance (in world units) between two stars for them to be linked. Default 4 — ~7-8° on a radius-30 shell. */
        readonly linkDistance?: number;
        /** Max links per star. Higher = denser web; lower = airier. Default 2. */
        readonly maxLinksPerStar?: number;
        /** Base line opacity at peak of its breathe cycle. Default 0.18 — faintly visible without fighting the stars. */
        readonly opacity?: number;
        /** Optional override for line color; defaults to the star base color. */
        readonly color?: string;
      };
}

const STAR_VERT = /* glsl */ `
attribute float aPhase;
attribute float aSizeScale;
attribute vec3 aColor;
uniform float uTime;
uniform float uBaseSize;
uniform float uTwinkleIntensity;
uniform float uTwinkleSpeed;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
varying vec4 vClipPosition;
void main() {
  float wave = sin(uTime * uTwinkleSpeed * 6.28318 + aPhase);
  float brightness = 1.0 - uTwinkleIntensity * 0.5 * (1.0 - wave);
  vColor = aColor;
  vAlpha = brightness;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vClipPosition = gl_Position;
  gl_PointSize = uBaseSize * aSizeScale * uPixelRatio;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying vec4 vClipPosition;
uniform float uEdgeFade;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float disc = smoothstep(0.5, 0.18, d);
  vec2 screenUv = vClipPosition.xy / vClipPosition.w * 0.5 + 0.5;
  float edgeDistance = min(min(screenUv.x, 1.0 - screenUv.x), min(screenUv.y, 1.0 - screenUv.y));
  float edgeMask = uEdgeFade > 0.0 ? smoothstep(0.0, uEdgeFade, edgeDistance) : 1.0;
  float alpha = disc * vAlpha * edgeMask;
  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(vColor * vAlpha * edgeMask, alpha);
}
`;

/**
 * Constellation-line shader — each pair of vertices belongs to one
 * line segment (LineSegments topology), and the two vertices share
 * the same `aPairPhase` so their opacity wave stays in sync. The
 * sine wave runs slow (0.08 Hz) so the visible constellations shift
 * over a span of ~12 seconds, never crystallising into a fixed
 * pattern. A small floor keeps lines barely-visible at the trough so
 * the field never goes blank.
 */
const LINE_VERT = /* glsl */ `
attribute float aPairPhase;
uniform float uTime;
uniform float uBaseOpacity;
varying float vAlpha;
varying vec4 vClipPosition;
void main() {
  float wave = sin(uTime * 0.5 + aPairPhase);
  // 0.10 floor + 0.90 wave amplitude so lines never go fully black.
  float weight = 0.10 + 0.45 * (wave + 1.0);
  vAlpha = uBaseOpacity * weight;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vClipPosition = gl_Position;
}
`;

const LINE_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uEdgeFade;
varying float vAlpha;
varying vec4 vClipPosition;
void main() {
  vec2 screenUv = vClipPosition.xy / vClipPosition.w * 0.5 + 0.5;
  float edgeDistance = min(min(screenUv.x, 1.0 - screenUv.x), min(screenUv.y, 1.0 - screenUv.y));
  float edgeMask = uEdgeFade > 0.0 ? smoothstep(0.0, uEdgeFade, edgeDistance) : 1.0;
  float alpha = vAlpha * edgeMask;
  if (alpha < 0.001) discard;
  gl_FragColor = vec4(uColor * edgeMask, alpha);
}
`;

/**
 * Dotted-native starfield. The base star Points layer is kept
 * (uniform shell distribution + per-star twinkle), but on top of it
 * a **constellation overlay** draws faint lines between nearby
 * stars. The lines slowly breathe in and out at staggered phases —
 * different "constellations" become visible over time, never
 * crystallising into a fixed pattern. This turns the backdrop from
 * "starfield" into "living sky", reading as the same family of
 * visual ideas (connections, links, networks) the dotted globe
 * itself uses.
 *
 * Constellations are default-on for the dotted kind, off for everyone
 * else (the per-kind copies of this file in outline/hologram/etc.
 * pass `constellations: false` if they care).
 */
export class DottedStarfieldLayer {
  /** Public field kept as `Points` for parity with the shared layer. The constellation lines ride as a child of this Points object so `scene.add(starfield.object)` brings the whole thing. */
  public readonly object: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly constellationLines: LineSegments | null;
  private readonly constellationGeometry: BufferGeometry | null;
  private readonly constellationMaterial: ShaderMaterial | null;
  private twinkleEnabled: boolean;
  private elapsed = 0;

  public constructor(options: DottedStarfieldLayerOptions) {
    const radius = options.radius ?? 30;
    const sizeVariety = clamp01(options.sizeVariety ?? 0.5);
    const twinkle = options.twinkle;
    this.twinkleEnabled = twinkle?.enabled ?? false;

    const positions = new Float32Array(options.count * 3);
    const phases = new Float32Array(options.count);
    const sizeScales = new Float32Array(options.count);
    const colors = new Float32Array(options.count * 3);

    const palette =
      options.palette && options.palette.length > 0 ? options.palette : [options.color];
    const tmpColor = new Color();
    const baseColors = palette.map((hex) => new Color(hex));
    const tmp = new Vector3();

    for (let i = 0; i < options.count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      tmp.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      phases[i] = Math.random() * Math.PI * 2;
      sizeScales[i] = 1 + (Math.random() * 2 - 1) * sizeVariety;

      const picked = baseColors[Math.floor(Math.random() * baseColors.length)] ?? baseColors[0]!;
      tmpColor.copy(picked);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    this.geometry.setAttribute('aSizeScale', new BufferAttribute(sizeScales, 1));
    this.geometry.setAttribute('aColor', new BufferAttribute(colors, 3));

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: options.size },
        uTwinkleIntensity: {
          value: this.twinkleEnabled ? clamp01(twinkle?.intensity ?? 0.45) : 0,
        },
        uTwinkleSpeed: { value: twinkle?.speed ?? 0.55 },
        uPixelRatio: {
          value: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        },
        uEdgeFade: { value: clampEdgeFade(options.edgeFade) },
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;

    // Constellation overlay — faint lines between nearby stars,
    // slowly breathing. Default-on; opt out via `constellations: false`.
    const cfg = resolveConstellationsCfg(options.constellations);
    if (cfg && cfg.enabled) {
      const linkDistance = cfg.linkDistance ?? 4;
      const maxLinks = cfg.maxLinksPerStar ?? 2;
      const opacity = cfg.opacity ?? 0.18;
      const lineColor = cfg.color
        ? new Color(cfg.color)
        : (baseColors[0] ?? new Color(options.color));
      const built = buildConstellationGeometry(
        positions,
        options.count,
        linkDistance,
        maxLinks,
      );
      if (built !== null) {
        this.constellationGeometry = built;
        this.constellationMaterial = new ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uBaseOpacity: { value: opacity },
            uColor: { value: lineColor.clone() },
            uEdgeFade: { value: clampEdgeFade(options.edgeFade) },
          },
          vertexShader: LINE_VERT,
          fragmentShader: LINE_FRAG,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        this.constellationLines = new LineSegments(built, this.constellationMaterial);
        this.constellationLines.frustumCulled = false;
        this.object.add(this.constellationLines);
      } else {
        this.constellationGeometry = null;
        this.constellationMaterial = null;
        this.constellationLines = null;
      }
    } else {
      this.constellationGeometry = null;
      this.constellationMaterial = null;
      this.constellationLines = null;
    }
  }

  public update(delta: number): void {
    this.elapsed += delta;
    if (this.twinkleEnabled) {
      const uniform = this.material.uniforms['uTime'];
      if (uniform) uniform.value = this.elapsed;
    }
    if (this.constellationMaterial) {
      const u = this.constellationMaterial.uniforms['uTime'];
      if (u) u.value = this.elapsed;
    }
  }

  public setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  public setSize(size: number): void {
    const uniform = this.material.uniforms['uBaseSize'];
    if (uniform) uniform.value = size;
  }

  /** Fade both dots and constellation lines near viewport edges. */
  public setEdgeFade(edgeFade: number): void {
    const value = clampEdgeFade(edgeFade);
    const starUniform = this.material.uniforms['uEdgeFade'];
    const lineUniform = this.constellationMaterial?.uniforms['uEdgeFade'];
    if (starUniform) starUniform.value = value;
    if (lineUniform) lineUniform.value = value;
  }

  public setTwinkle(twinkle: StarfieldTwinkleOptions | null): void {
    const enabled = twinkle?.enabled ?? false;
    this.twinkleEnabled = enabled;
    const intensityUniform = this.material.uniforms['uTwinkleIntensity'];
    const speedUniform = this.material.uniforms['uTwinkleSpeed'];
    if (intensityUniform) {
      intensityUniform.value = enabled ? clamp01(twinkle?.intensity ?? 0.45) : 0;
    }
    if (speedUniform) {
      speedUniform.value = twinkle?.speed ?? 0.55;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.constellationGeometry?.dispose();
    this.constellationMaterial?.dispose();
  }
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const clampEdgeFade = (value: number | undefined): number =>
  value !== undefined && Number.isFinite(value) ? Math.max(0, Math.min(0.5, value)) : 0;

interface ResolvedConstellationCfg {
  readonly enabled: boolean;
  readonly linkDistance?: number;
  readonly maxLinksPerStar?: number;
  readonly opacity?: number;
  readonly color?: string;
}

const resolveConstellationsCfg = (
  spec: DottedStarfieldLayerOptions['constellations'],
): ResolvedConstellationCfg | null => {
  if (spec === false) return null;
  if (spec === undefined || spec === true) return { enabled: true };
  return { ...spec, enabled: spec.enabled ?? true };
};

/**
 * Compute pairs of stars within `linkDistance` of each other and
 * build a `LineSegments` BufferGeometry where each segment shares a
 * `aPairPhase` attribute (so both endpoints fade at the same time).
 *
 * O(N × cellNeighbours) via a coarse spatial hash — fine for the
 * 1000-2500 star counts the dotted starfield typically uses. Returns
 * `null` when no pairs were found (degenerate count or radius).
 */
const buildConstellationGeometry = (
  starPositions: Float32Array,
  count: number,
  linkDistance: number,
  maxLinksPerStar: number,
): BufferGeometry | null => {
  if (count < 2 || linkDistance <= 0) return null;
  const cellSize = linkDistance;
  const cells = new Map<string, number[]>();
  const keyFor = (x: number, y: number, z: number): string =>
    `${Math.floor(x / cellSize)}|${Math.floor(y / cellSize)}|${Math.floor(z / cellSize)}`;

  for (let i = 0; i < count; i++) {
    const x = starPositions[i * 3]!;
    const y = starPositions[i * 3 + 1]!;
    const z = starPositions[i * 3 + 2]!;
    const k = keyFor(x, y, z);
    let arr = cells.get(k);
    if (!arr) {
      arr = [];
      cells.set(k, arr);
    }
    arr.push(i);
  }

  const linkCounts = new Int32Array(count);
  const pairsA: number[] = [];
  const pairsB: number[] = [];
  const linkDistSq = linkDistance * linkDistance;

  for (let i = 0; i < count; i++) {
    if (linkCounts[i]! >= maxLinksPerStar) continue;
    const x = starPositions[i * 3]!;
    const y = starPositions[i * 3 + 1]!;
    const z = starPositions[i * 3 + 2]!;
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    const cz = Math.floor(z / cellSize);
    // Walk this cell + 26 neighbours (3³ block).
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const arr = cells.get(`${cx + dx}|${cy + dy}|${cz + dz}`);
          if (!arr) continue;
          for (const j of arr) {
            if (j <= i) continue;
            if (linkCounts[i]! >= maxLinksPerStar) break;
            if (linkCounts[j]! >= maxLinksPerStar) continue;
            const dxv = starPositions[j * 3]! - x;
            const dyv = starPositions[j * 3 + 1]! - y;
            const dzv = starPositions[j * 3 + 2]! - z;
            const dsq = dxv * dxv + dyv * dyv + dzv * dzv;
            if (dsq > linkDistSq) continue;
            pairsA.push(i);
            pairsB.push(j);
            linkCounts[i]!++;
            linkCounts[j]!++;
          }
        }
      }
    }
  }

  if (pairsA.length === 0) return null;

  const segCount = pairsA.length;
  const positions = new Float32Array(segCount * 6); // 2 verts × 3 floats per pair
  const phases = new Float32Array(segCount * 2);

  for (let s = 0; s < segCount; s++) {
    const a = pairsA[s]!;
    const b = pairsB[s]!;
    positions[s * 6] = starPositions[a * 3]!;
    positions[s * 6 + 1] = starPositions[a * 3 + 1]!;
    positions[s * 6 + 2] = starPositions[a * 3 + 2]!;
    positions[s * 6 + 3] = starPositions[b * 3]!;
    positions[s * 6 + 4] = starPositions[b * 3 + 1]!;
    positions[s * 6 + 5] = starPositions[b * 3 + 2]!;
    const phase = Math.random() * Math.PI * 2;
    phases[s * 2] = phase;
    phases[s * 2 + 1] = phase;
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geom.setAttribute('aPairPhase', new Float32BufferAttribute(phases, 1));
  return geom;
};

// Re-export the unused import so the bundler doesn't tree-shake it
// when downstream callers want to swap in a vanilla LineBasicMaterial
// for debugging.
export type { LineBasicMaterial };
