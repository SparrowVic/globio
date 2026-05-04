import {
  AdditiveBlending,
  Blending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Points,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

export interface DottedAtmosphereOptions {
  readonly color: string;
  readonly intensity: number;
  /** Mesh radius as a multiplier of `GLOBE_RADIUS`. Default 1.18. */
  readonly radiusScale?: number;
  /** Fresnel exponent. Higher = thinner rim. Default 2.0. */
  readonly power?: number;
  /** Fresnel threshold — where the dot halo starts radiating. Default 0.6. */
  readonly threshold?: number;
  /** Kept for API parity with shared layer; dotted variant always renders both sides via the Points cloud's geometry. */
  readonly side?: 'back' | 'front' | 'double';
  readonly blending?: 'additive' | 'normal';
  readonly pulse?: {
    readonly enabled?: boolean;
    readonly speed?: number;
    readonly amplitude?: number;
  };
}

const DEFAULTS = {
  radiusScale: 1.18,
  power: 2.0,
  threshold: 0.6,
  side: 'back' as const,
  blending: 'additive' as const,
};

/**
 * Number of orbital halo dots. 900 reads as a dense halo at default
 * radius; can be tuned by feel — too few looks like sparse satellites,
 * too many fights the surface dot field for attention.
 */
const HALO_DOT_COUNT = 900;
/** Base size for halo dots (shader pixels). The Fresnel weight scales this further. */
const HALO_POINT_SIZE = 2.6;
/** Slow rotation speed of the halo cloud independent of globe spin (rev/sec). */
const HALO_ROTATION_SPEED = 0.012;

const VERTEX_SHADER = /* glsl */ `
  attribute float aSeed; // per-particle randomness for size variety
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uThreshold;
  uniform float uPulseAmp;
  uniform float uPulseTime;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform float uRotation;
  varying vec3 vColor;
  varying float vAlpha;

  // Cheap rotation around Y for the orbital halo so the cloud drifts
  // independently from globe spin. Keeps the halo feeling like a
  // separate orbital structure rather than glued to the planet.
  vec3 rotateY(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    vec3 rotated = rotateY(position, uRotation);
    // Surface normal of the halo shell points outward from origin.
    vec3 nWorld = normalize(rotated);

    // Fresnel-style weight: dots near the silhouette (perpendicular to
    // the camera ray) read brightest; dots facing the camera (front
    // of halo) and behind (occluded by the globe) fade. Computed in
    // view space by transforming the normal — same shader maths the
    // shared atmosphere uses, just sampled per-particle.
    vec3 nView = normalize(normalMatrix * nWorld);
    // 1 - abs(nView.z) peaks at the silhouette (where the view-space
    // z component approaches 0) and falls to 0 on the front + back
    // caps where the normal aligns with the view ray.
    float silhouette = 1.0 - abs(nView.z);
    // Apply threshold + power for the same shape as the Fresnel halo.
    float fres = smoothstep(uThreshold, 1.0, silhouette);
    fres = pow(fres, uPower);

    // Pulse — same uTime-driven oscillation the shared atmosphere
    // exposes, applied as a brightness multiplier.
    float pulse = 1.0 + uPulseAmp * sin(uPulseTime);

    // Per-particle size variety so the halo doesn't read as a uniform
    // grid. aSeed already in [0,1).
    float sizeMul = 0.5 + aSeed;

    vAlpha = fres * uIntensity * pulse;
    vColor = uColor;

    vec4 mv = modelViewMatrix * vec4(rotated, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPointSize * sizeMul * uPixelRatio * (1.0 / -mv.z);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.001) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = dot(uv, uv);
    // Soft round disc — same shape family as surface + arcs.
    float disc = smoothstep(0.25, 0.0, d);
    if (disc < 0.001) discard;
    gl_FragColor = vec4(vColor * vAlpha, disc * vAlpha);
  }
`;

const resolveBlending = (mode: DottedAtmosphereOptions['blending']): Blending => {
  if (mode === 'normal') return NormalBlending;
  return AdditiveBlending;
};

/**
 * Dotted-native atmosphere — a cloud of **orbital halo dots** instead
 * of the shared Fresnel sphere. The dots are uniformly distributed on
 * a slightly-larger shell around the globe; a Fresnel-style weight
 * peaks them at the silhouette and fades them on the front/back
 * caps, so the visible result is a glittering halo ringing the
 * planet's profile rather than a smooth gradient. The cloud also
 * slowly rotates independently of globe spin, adding life and
 * selling the "this is its own orbital layer" reading.
 *
 * The public surface (`mesh: Mesh`, set/reset accessors, side, blending,
 * pulse, etc.) matches the shared `AtmosphereLayer` so create-globe.ts
 * mounts and lives-updates this kind exactly the same way. The
 * mesh itself is an invisible placeholder; the visible Points
 * cloud is attached as its child so `globeGroup.add(mesh)` brings
 * the halo with it.
 */
export class DottedAtmosphereLayer {
  public readonly mesh: Mesh;
  private points: Points;
  private readonly material: ShaderMaterial;
  private readonly placeholderGeom: SphereGeometry;
  private readonly placeholderMat: MeshBasicMaterial;
  private particleGeometry: BufferGeometry;
  // Cached construction values for reset-to-default flows.
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultPower: number;
  private readonly defaultThreshold: number;
  private readonly defaultRadiusScale: number;
  private radiusScale: number;
  private pulseEnabled: boolean;
  private pulseSpeed: number;
  private elapsedSeconds = 0;

  public constructor(options: DottedAtmosphereOptions) {
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.defaultPower = options.power ?? DEFAULTS.power;
    this.defaultThreshold = options.threshold ?? DEFAULTS.threshold;
    this.defaultRadiusScale = options.radiusScale ?? DEFAULTS.radiusScale;
    this.radiusScale = this.defaultRadiusScale;
    this.pulseEnabled = options.pulse?.enabled ?? false;
    this.pulseSpeed = options.pulse?.speed ?? 0.25;

    const pixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
        uPower: { value: this.defaultPower },
        uThreshold: { value: this.defaultThreshold },
        uPulseAmp: { value: this.pulseEnabled ? (options.pulse?.amplitude ?? 0.25) : 0 },
        uPulseTime: { value: 0 },
        uPointSize: { value: HALO_POINT_SIZE },
        uPixelRatio: { value: pixelRatio },
        uRotation: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: resolveBlending(options.blending),
      transparent: true,
      depthWrite: false,
    });

    this.particleGeometry = this.buildParticleGeometry(this.radiusScale);
    this.points = new Points(this.particleGeometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4; // behind borders/labels, above globe surface

    // Placeholder Mesh — keeps the public `mesh: Mesh` shape that the
    // shared layer exposes, so create-globe.ts and the registry typing
    // don't need a kind-specific branch. Geometry is a degenerate
    // (zero-radius) sphere, the material is fully transparent, so it
    // contributes no fragments. The Points cloud rides as its child.
    this.placeholderGeom = new SphereGeometry(0.0001, 4, 4);
    this.placeholderMat = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mesh = new Mesh(this.placeholderGeom, this.placeholderMat);
    this.mesh.add(this.points);
  }

  /** Tick rotation + brightness oscillator. Called once per render frame. */
  public update(delta: number): void {
    this.elapsedSeconds += delta;
    const rot = this.material.uniforms['uRotation'];
    if (rot) rot.value = this.elapsedSeconds * HALO_ROTATION_SPEED * Math.PI * 2;
    if (this.pulseEnabled) {
      const pt = this.material.uniforms['uPulseTime'];
      if (pt) pt.value = this.elapsedSeconds * this.pulseSpeed * 2 * Math.PI;
    }
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']?.value as Color)?.set(color);
  }

  public setIntensity(intensity: number): void {
    if (this.material.uniforms['uIntensity']) {
      this.material.uniforms['uIntensity'].value = intensity;
    }
  }

  public setPower(power: number): void {
    if (this.material.uniforms['uPower']) {
      this.material.uniforms['uPower'].value = power;
    }
  }

  public setThreshold(threshold: number): void {
    if (this.material.uniforms['uThreshold']) {
      this.material.uniforms['uThreshold'].value = threshold;
    }
  }

  /**
   * Live update for the halo radius. Rebuilds the particle cloud at
   * the new shell radius; cheap (single Points buffer, ~900 floats).
   */
  public setRadiusScale(scale: number): void {
    if (Math.abs(this.radiusScale - scale) < 1e-4) return;
    this.radiusScale = scale;
    const next = this.buildParticleGeometry(scale);
    this.particleGeometry.dispose();
    this.particleGeometry = next;
    this.points.geometry = next;
  }

  public setSide(_mode: DottedAtmosphereOptions['side']): void {
    // The dotted halo's particles render correctly from either side
    // (Points have no face-culling notion). Kept as a no-op for API
    // parity so the live-update path doesn't need to branch on kind.
  }

  public setBlending(mode: DottedAtmosphereOptions['blending']): void {
    this.material.blending = resolveBlending(mode);
    this.material.needsUpdate = true;
  }

  public setPulse(pulse: DottedAtmosphereOptions['pulse'] | null): void {
    const enabled = pulse?.enabled ?? false;
    this.pulseEnabled = enabled;
    if (pulse?.speed !== undefined) this.pulseSpeed = pulse.speed;
    const ampUniform = this.material.uniforms['uPulseAmp'];
    if (ampUniform) ampUniform.value = enabled ? (pulse?.amplitude ?? 0.25) : 0;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public resetIntensity(): void {
    this.setIntensity(this.defaultIntensity);
  }

  public resetPower(): void {
    this.setPower(this.defaultPower);
  }

  public resetThreshold(): void {
    this.setThreshold(this.defaultThreshold);
  }

  public resetRadiusScale(): void {
    this.setRadiusScale(this.defaultRadiusScale);
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.placeholderGeom.dispose();
    this.placeholderMat.dispose();
    this.material.dispose();
  }

  /**
   * Generate a uniform point distribution on a sphere of radius
   * `GLOBE_RADIUS * scale`. Uses the inverse-CDF for cos(phi) so the
   * points don't cluster at the poles (same trick the surface
   * starfield uses).
   */
  private buildParticleGeometry(scale: number): BufferGeometry {
    const radius = GLOBE_RADIUS * scale;
    const positions = new Float32Array(HALO_DOT_COUNT * 3);
    const seeds = new Float32Array(HALO_DOT_COUNT);
    for (let i = 0; i < HALO_DOT_COUNT; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      seeds[i] = Math.random();
    }
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
    return geom;
  }
}
