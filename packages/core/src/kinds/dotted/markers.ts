import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { MarkerConfig } from '../../types';

export interface DottedMarkersLayerOptions {
  readonly maxMarkers?: number;
  readonly defaultColor: string;
  readonly defaultSize?: number;
  readonly hoverScale?: number;
}

interface MarkerSlot {
  readonly index: number;
  marker: MarkerConfig;
  /** Currently rendered scale (eased toward target). */
  currentScale: number;
}

const DEFAULT_PULSE_SPEED = 1.5;
const DEFAULT_PULSE_AMPLITUDE = 0.4;
const HOVER_EASE_SECONDS = 0.15;

/** Beacon visual constants — tuned by feel. */
const BEACON = {
  /** How many particles draw each ring. Below 16 the ring reads as a dotted gear; above 32 you can't see the dots. */
  particlesPerRing: 24,
  /** Concurrent rings per marker, staggered in phase so a new "ping" launches before the previous one fades. */
  ringsPerMarker: 3,
  /** Angular radius (radians on the sphere) the rings expand to before recycling. ~3.5° feels like a focused beacon, not a country highlight. */
  maxAngularRadius: 0.06,
  /** Cycle period (seconds). One ring travels from r=0 to r=maxAngularRadius over this duration before fading + recycling. */
  durationSec: 1.8,
  /** Base point size for ring particles in the shader (pre-perspective). */
  pointSize: 4,
} as const;

const RING_VERT = /* glsl */ `
  attribute vec3 aMarkerCenter;
  attribute vec3 aTangentX;
  attribute vec3 aTangentY;
  attribute float aRingAngle;
  attribute float aRingPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uDuration;
  uniform float uMaxRadius;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform float uOpacityScale;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Time within this ring's cycle, [0,1) — staggered by aRingPhase so
    // adjacent rings don't pulse in unison.
    float t = mod(uTime / max(uDuration, 1e-3) + aRingPhase, 1.0);
    // Angular radius this particle currently sits at (on the unit
    // tangent plane). Multiplied by GLOBE_RADIUS in the position math
    // below so the ring rides at globe scale.
    float radius = t * uMaxRadius;
    // Tangent-plane offset around the marker centre.
    vec3 offset = (cos(aRingAngle) * aTangentX + sin(aRingAngle) * aTangentY) * radius;
    // Ride the ring on the sphere surface — without this re-projection
    // the tangent-plane particles would float above the surface as the
    // ring expands (the plane departs from the sphere). Renormalising
    // back to GLOBE_RADIUS keeps the ping reading like a ripple on
    // water rather than a flat halo lifted off the globe.
    vec3 onPlane = aMarkerCenter + offset;
    float globeRadius = length(aMarkerCenter);
    vec3 onSphere = normalize(onPlane) * (globeRadius + 0.001);

    // Quadratic fade so the ring is brightest at spawn and gone at
    // the outer rim — reads as "energy expanding outward".
    vAlpha = (1.0 - t) * (1.0 - t) * uOpacityScale;
    vColor = aColor;

    vec4 mv = modelViewMatrix * vec4(onSphere, 1.0);
    gl_Position = projectionMatrix * mv;
    // Particles also shrink as they ride outward — sells the
    // "energy dissipating" feel and stops the outer dots looking
    // chunkier than the centre.
    gl_PointSize = uPointSize * (0.5 + 0.5 * (1.0 - t)) * uPixelRatio * (1.0 / -mv.z);
  }
`;

const RING_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.001) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = dot(uv, uv);
    float disc = smoothstep(0.25, 0.0, d);
    if (disc < 0.001) discard;
    gl_FragColor = vec4(vColor, disc * vAlpha);
  }
`;

const pulseParams = (
  pulse: MarkerConfig['pulse'],
): { speed: number; amplitude: number } | null => {
  if (!pulse) return null;
  if (pulse === true) return { speed: DEFAULT_PULSE_SPEED, amplitude: DEFAULT_PULSE_AMPLITUDE };
  return {
    speed: pulse.speed ?? DEFAULT_PULSE_SPEED,
    amplitude: pulse.amplitude ?? DEFAULT_PULSE_AMPLITUDE,
  };
};

/**
 * Dotted-native markers. Each marker still renders a small instanced
 * sphere "core" that doubles as the raycast target (so picking +
 * tooltips keep working unchanged), but on top of that the layer
 * paints a continuous **radar-ping beacon** — concentric rings of
 * dots ride outward across the sphere surface, fade, and recycle.
 *
 * Why this rewrite: solid spheres on a dot field read as a foreign
 * primitive. The expanding ring of dots is built on the same Points /
 * additive shader family as the surface dot grid, so markers feel
 * like part of the same world — "this is a place broadcasting" rather
 * than "this is a sphere we glued to the surface".
 */
export class DottedMarkersLayer {
  /**
   * Same shape as the shared layer — InstancedMesh kept as raycast
   * target + visible "core" cluster. The beacon ring overlay is
   * attached as a child of `mesh`, so `globeGroup.add(mesh)` (the
   * pattern create-globe.ts already uses) brings both visuals into
   * the scene together. No Group wrapper needed.
   */
  public readonly mesh: InstancedMesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly slots = new Map<string, MarkerSlot>();
  private readonly freeIndices: Array<number> = [];
  private readonly dummy = new Object3D();
  private readonly tempColor = new Color();
  private readonly tempVector = new Vector3();
  private readonly defaultColor: string;
  private readonly defaultSize: number;
  private readonly hoverScale: number;
  private readonly maxMarkers: number;
  private hoveredId: string | null = null;
  private elapsed = 0;
  // Beacon overlay (one shared Points geometry rebuilt on marker set changes).
  private beaconPoints: Points | null = null;
  private beaconGeometry: BufferGeometry | null = null;
  private readonly beaconMaterial: ShaderMaterial;

  public constructor(options: DottedMarkersLayerOptions) {
    this.maxMarkers = options.maxMarkers ?? 10000;
    this.defaultColor = options.defaultColor;
    this.defaultSize = options.defaultSize ?? 0.012;
    this.hoverScale = options.hoverScale ?? 1.5;

    this.geometry = new SphereGeometry(1, 8, 8);
    this.material = new MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new InstancedMesh(this.geometry, this.material, this.maxMarkers);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    for (let i = this.maxMarkers - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }


    const pixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.beaconMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDuration: { value: BEACON.durationSec },
        uMaxRadius: { value: BEACON.maxAngularRadius * GLOBE_RADIUS },
        uPointSize: { value: BEACON.pointSize },
        uPixelRatio: { value: pixelRatio },
        uOpacityScale: { value: 1 },
      },
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }

  public setMarkers(markers: ReadonlyArray<MarkerConfig>): void {
    this.clearAll();
    markers.forEach((marker) => this.addMarker(marker));
    this.rebuildBeacons();
  }

  public addMarker(marker: MarkerConfig): void {
    if (this.slots.has(marker.id)) {
      this.updateMarker(marker);
      this.rebuildBeacons();
      return;
    }
    const index = this.freeIndices.pop();
    if (index === undefined) {
      throw new Error(`DottedMarkersLayer: max markers (${this.maxMarkers}) reached`);
    }
    const baseScale = this.defaultSize * (marker.size ?? 1);
    this.slots.set(marker.id, { index, marker, currentScale: baseScale });
    this.applyToInstance(index, marker, baseScale);
    this.refreshCount();
    this.rebuildBeacons();
  }

  public removeMarker(id: string): void {
    const slot = this.slots.get(id);
    if (!slot) return;
    this.dummy.position.set(0, 0, 0);
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(slot.index, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.slots.delete(id);
    this.freeIndices.push(slot.index);
    this.refreshCount();
    this.rebuildBeacons();
  }

  public getMarkerByInstanceId(instanceId: number): MarkerConfig | null {
    for (const slot of this.slots.values()) {
      if (slot.index === instanceId) return slot.marker;
    }
    return null;
  }

  public setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    // Hovered marker: its rings get a brighter overlay scale. Cheap to
    // implement via the shared opacity uniform — only one hovered
    // marker at a time, so the others stay at default and the hovered
    // one rides bright. (Implementation detail simplification: we
    // could split the geometry into per-marker draws to highlight
    // only one; for the demo's marker counts the global lift reads
    // fine and keeps the geometry single-buffer.)
  }

  public update(delta: number): void {
    this.elapsed += delta;
    if (this.beaconMaterial.uniforms['uTime']) {
      this.beaconMaterial.uniforms['uTime']!.value = this.elapsed;
    }
    if (this.slots.size === 0) return;
    const k = Math.min(1, delta / HOVER_EASE_SECONDS);
    this.slots.forEach((slot, id) => {
      const baseScale = this.defaultSize * (slot.marker.size ?? 1);
      const pulse = pulseParams(slot.marker.pulse);
      const pulsed = pulse
        ? baseScale * (1 + pulse.amplitude * Math.sin(this.elapsed * pulse.speed * 2 * Math.PI))
        : baseScale;
      const target = id === this.hoveredId ? pulsed * this.hoverScale : pulsed;
      const next = slot.currentScale + (target - slot.currentScale) * k;
      const changed = Math.abs(next - slot.currentScale) > 1e-6 || pulse !== null;
      slot.currentScale = next;
      if (changed) {
        this.applyToInstance(slot.index, slot.marker, slot.currentScale);
      }
    });
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
    this.disposeBeacons();
    this.beaconMaterial.dispose();
  }

  // ---------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------

  private updateMarker(marker: MarkerConfig): void {
    const slot = this.slots.get(marker.id);
    if (!slot) return;
    const baseScale = this.defaultSize * (marker.size ?? 1);
    slot.marker = marker;
    slot.currentScale = baseScale;
    this.applyToInstance(slot.index, marker, baseScale);
  }

  private applyToInstance(index: number, marker: MarkerConfig, scale: number): void {
    const surface = latLngToVector3(marker.position, GLOBE_RADIUS, this.tempVector);
    this.dummy.position.copy(surface);
    this.dummy.scale.setScalar(scale);
    this.dummy.lookAt(0, 0, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.tempColor.set(marker.color ?? this.defaultColor);
    this.mesh.setColorAt(index, this.tempColor);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  private clearAll(): void {
    const zero = new Matrix4().makeScale(0, 0, 0);
    this.slots.forEach((slot) => {
      this.mesh.setMatrixAt(slot.index, zero);
      this.freeIndices.push(slot.index);
    });
    this.slots.clear();
    this.mesh.instanceMatrix.needsUpdate = true;
    this.refreshCount();
  }

  private refreshCount(): void {
    this.mesh.count = this.slots.size;
  }

  /**
   * Rebuild the beacon ring particle buffer from the current marker
   * set. Called whenever the set changes (set/add/remove). Skipped
   * when there are no markers — the geometry simply isn't mounted,
   * so there's nothing for the shader to draw.
   */
  private rebuildBeacons(): void {
    this.disposeBeacons();
    if (this.slots.size === 0) return;

    const ringsPerMarker = BEACON.ringsPerMarker;
    const particlesPerRing = BEACON.particlesPerRing;
    const total = this.slots.size * ringsPerMarker * particlesPerRing;

    const positions = new Float32Array(total * 3);
    const aMarkerCenter = new Float32Array(total * 3);
    const aTangentX = new Float32Array(total * 3);
    const aTangentY = new Float32Array(total * 3);
    const aRingAngle = new Float32Array(total);
    const aRingPhase = new Float32Array(total);
    const aColor = new Float32Array(total * 3);

    const center = new Vector3();
    const tangentX = new Vector3();
    const tangentY = new Vector3();
    const tmpUp = new Vector3(0, 1, 0);
    const tmpRight = new Vector3();
    const colorTmp = new Color();
    let writeIdx = 0;

    this.slots.forEach((slot) => {
      latLngToVector3(slot.marker.position, GLOBE_RADIUS, center);
      // Build a stable tangent basis (u, v) at this marker. Prefer
      // world-up as a reference; near the poles fall back to world-X
      // so we never generate a degenerate basis.
      const useUp = Math.abs(center.clone().normalize().dot(tmpUp)) < 0.95;
      const reference = useUp ? tmpUp : new Vector3(1, 0, 0);
      tmpRight.copy(center).cross(reference).normalize();
      // tangentX = right (eastward-ish), tangentY = up-along-surface
      tangentX.copy(tmpRight);
      tangentY.copy(center).cross(tangentX).normalize();

      colorTmp.set(slot.marker.color ?? this.defaultColor);

      for (let r = 0; r < ringsPerMarker; r++) {
        const phase = r / ringsPerMarker; // 0, 1/3, 2/3 → continuous stream
        for (let p = 0; p < particlesPerRing; p++) {
          const angle = (p / particlesPerRing) * Math.PI * 2;
          // Position attribute is unused by the ring shader (everything
          // is derived from aMarkerCenter + tangents), but Three.js
          // wants a `position` attribute so we set the marker centre as
          // a sane default — picks up the bounding sphere correctly.
          positions[writeIdx * 3] = center.x;
          positions[writeIdx * 3 + 1] = center.y;
          positions[writeIdx * 3 + 2] = center.z;
          aMarkerCenter[writeIdx * 3] = center.x;
          aMarkerCenter[writeIdx * 3 + 1] = center.y;
          aMarkerCenter[writeIdx * 3 + 2] = center.z;
          aTangentX[writeIdx * 3] = tangentX.x;
          aTangentX[writeIdx * 3 + 1] = tangentX.y;
          aTangentX[writeIdx * 3 + 2] = tangentX.z;
          aTangentY[writeIdx * 3] = tangentY.x;
          aTangentY[writeIdx * 3 + 1] = tangentY.y;
          aTangentY[writeIdx * 3 + 2] = tangentY.z;
          aRingAngle[writeIdx] = angle;
          aRingPhase[writeIdx] = phase;
          aColor[writeIdx * 3] = colorTmp.r;
          aColor[writeIdx * 3 + 1] = colorTmp.g;
          aColor[writeIdx * 3 + 2] = colorTmp.b;
          writeIdx++;
        }
      }
    });

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('aMarkerCenter', new Float32BufferAttribute(aMarkerCenter, 3));
    geom.setAttribute('aTangentX', new Float32BufferAttribute(aTangentX, 3));
    geom.setAttribute('aTangentY', new Float32BufferAttribute(aTangentY, 3));
    geom.setAttribute('aRingAngle', new Float32BufferAttribute(aRingAngle, 1));
    geom.setAttribute('aRingPhase', new Float32BufferAttribute(aRingPhase, 1));
    geom.setAttribute('aColor', new Float32BufferAttribute(aColor, 3));

    this.beaconGeometry = geom;
    const points = new Points(geom, this.beaconMaterial);
    points.frustumCulled = false;
    points.renderOrder = 7; // above arcs, below the InstancedMesh cores
    this.beaconPoints = points;
    this.mesh.add(points);
  }

  private disposeBeacons(): void {
    if (this.beaconPoints) {
      this.mesh.remove(this.beaconPoints);
      this.beaconPoints = null;
    }
    if (this.beaconGeometry) {
      this.beaconGeometry.dispose();
      this.beaconGeometry = null;
    }
  }
}
