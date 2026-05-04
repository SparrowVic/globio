import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';

export interface DottedBorderDotsOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  /**
   * Country-id → instance index map. The dotted layer already maintains
   * one for hover / flash purposes; we share the same indexing scheme
   * so a single uniform (`uHoveredCountry`, `uActiveCountry`) controls
   * which border-dot ring fades in.
   */
  readonly countryIndex: ReadonlyMap<string, number>;
  /** Stroke / fill color of the border dots. Defaults to white. */
  readonly color: string;
  /** Base point size in CSS px (before perspective scaling). Default 5.5. */
  readonly size?: number;
  /** Peak opacity when the country is hovered. Default 1.0. */
  readonly opacity?: number;
  /** Sample step along the country's outer ring, in DEGREES of arc. Default 0.9. */
  readonly samplingStepDeg?: number;
  /** Radius factor — same as the dotted layer's interior dots so the
   *  border dots sit on the same shell rather than floating above. */
  readonly radiusFactor?: number;
}

const DEFAULTS = {
  size: 5.5,
  opacity: 1,
  samplingStepDeg: 0.9,
  radiusFactor: 1.0035,
};

/**
 * The dotted kind's answer to "how do we show *which* country is
 * hovered / active?" — instead of a continuous LineSegments stroke
 * (which fights the dot-field aesthetic), we sample the country's
 * outer polygon ring at fixed angular intervals and emit those
 * samples as **brighter, slightly larger dots** living on the same
 * shell as the interior dot cloud.
 *
 * The result reads as the country's outline being **drawn from dots**
 * rather than painted on top of them. Hover and pin states each get
 * their own ease-target so the user can pin one country (slow pulse)
 * and hover another (instant fade-in) without the two visuals
 * fighting.
 */
export class DottedBorderDotsLayer {
  public readonly object: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly count: number;
  private hoveredFade = 0;
  private activeFade = 0;
  private hoverTarget = 0;
  private activeTarget = 0;
  private hoveredCountryIdx = -1;
  private activeCountryIdx = -1;
  private elapsed = 0;
  private opacityScale: number;
  private color: Color;

  public constructor(options: DottedBorderDotsOptions) {
    const step = options.samplingStepDeg ?? DEFAULTS.samplingStepDeg;
    const radiusFactor = options.radiusFactor ?? DEFAULTS.radiusFactor;
    const radius = GLOBE_RADIUS * radiusFactor;

    // Walk every feature's *outer* ring (polygon[0]) and place a sample
    // every `step` degrees of arc along the ring. Holes are skipped —
    // they belong to the country's interior visual but don't read as
    // an outline at typical zoom levels, so adding them would just
    // crowd the result.
    const positions: Array<number> = [];
    const indices: Array<number> = [];
    options.features.forEach((feature) => {
      const idx = options.countryIndex.get(feature.id);
      if (idx === undefined) return;
      for (const polygon of feature.polygons) {
        const outer = polygon[0];
        if (!outer || outer.length < 3) continue;
        let accumulator = 0;
        // For each segment of the ring, emit samples at the configured
        // angular step. We track a continuous accumulator so a sample
        // boundary that falls *between* two ring vertices still emits
        // a dot on the next available segment — keeps the spacing
        // visually even on jagged borders.
        for (let i = 0; i < outer.length; i++) {
          const a = outer[i]!;
          const b = outer[(i + 1) % outer.length]!;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const segLen = Math.sqrt(dx * dx + dy * dy);
          if (segLen <= 1e-6) continue;
          accumulator += segLen;
          while (accumulator >= step) {
            const t = (segLen - (accumulator - step)) / segLen;
            const lng = a[0] + dx * t;
            const lat = a[1] + dy * t;
            const v = latLngToVector3([lat, lng], radius);
            positions.push(v.x, v.y, v.z);
            indices.push(idx);
            accumulator -= step;
          }
        }
      }
    });

    this.count = indices.length;
    const positionArr = new Float32Array(positions);
    const indexArr = new Float32Array(indices);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positionArr, 3));
    this.geometry.setAttribute('aCountryIdx', new BufferAttribute(indexArr, 1));
    // Frustum culling on a globe-spanning Points cloud yields false
    // negatives near the silhouette; the layer's vertex count is small
    // enough (~tens of thousands) that we'd rather always submit it.
    this.geometry.boundingSphere = null;

    this.color = new Color(options.color);
    this.opacityScale = options.opacity ?? DEFAULTS.opacity;

    const pixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uPointSize: { value: options.size ?? DEFAULTS.size },
        uPixelRatio: { value: pixelRatio },
        uColor: { value: this.color },
        uOpacity: { value: this.opacityScale },
        uHoveredCountry: { value: -1 },
        uActiveCountry: { value: -1 },
        uHoveredFade: { value: 0 },
        uActiveFade: { value: 0 },
        uActivePulse: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aCountryIdx;
        uniform float uPointSize;
        uniform float uPixelRatio;
        uniform int uHoveredCountry;
        uniform int uActiveCountry;
        uniform float uHoveredFade;
        uniform float uActiveFade;
        uniform float uActivePulse;
        varying float vAlpha;
        void main() {
          int idx = int(aCountryIdx + 0.5);
          // Per-vertex membership tests — the dot is part of the
          // hovered ring, the active ring, or neither.
          float hovered = (idx == uHoveredCountry) ? 1.0 : 0.0;
          float active = (idx == uActiveCountry) ? 1.0 : 0.0;
          // Combine the two fades so a country that's both hovered AND
          // active reads strongest. The active envelope picks up a
          // small sin pulse so pinned borders breathe.
          float activeEnv = 0.7 + 0.3 * uActivePulse;
          float weight = max(hovered * uHoveredFade, active * uActiveFade * activeEnv);
          vAlpha = weight;
          // Off-ring dots collapse to size 0 so they cost nothing in
          // the fragment shader either.
          float sizeMul = weight > 0.001 ? (1.0 + 0.4 * weight) : 0.0;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPointSize * uPixelRatio * (1.0 / -mv.z) * sizeMul;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          if (vAlpha < 0.001) discard;
          // Round soft point — same disc shape as the dotted layer so
          // border dots feel like the same family of marks.
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = dot(uv, uv);
          float disc = smoothstep(0.25, 0.05, d);
          if (disc < 0.001) discard;
          gl_FragColor = vec4(uColor, disc * vAlpha * uOpacity);
        }
      `,
    });

    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.object.renderOrder = 9; // above the interior dot field
  }

  /** Dot count emitted across all features. */
  public getDotCount(): number {
    return this.count;
  }

  public setHoveredCountry(id: string | null, lookup: ReadonlyMap<string, number>): void {
    if (id === null) {
      this.hoverTarget = 0;
      return;
    }
    const idx = lookup.get(id);
    if (idx === undefined) {
      this.hoverTarget = 0;
      return;
    }
    this.hoveredCountryIdx = idx;
    this.material.uniforms['uHoveredCountry']!.value = idx;
    this.hoverTarget = 1;
  }

  public setActiveCountry(id: string | null, lookup: ReadonlyMap<string, number>): void {
    if (id === null) {
      this.activeTarget = 0;
      return;
    }
    const idx = lookup.get(id);
    if (idx === undefined) {
      this.activeTarget = 0;
      return;
    }
    this.activeCountryIdx = idx;
    this.material.uniforms['uActiveCountry']!.value = idx;
    this.activeTarget = 1;
  }

  /** Per-frame ease + sine pulse. Call once per `requestAnimationFrame`. */
  public update(delta: number, elapsedSeconds: number): void {
    this.elapsed = elapsedSeconds;
    const easeRate = Math.min(1, delta / 0.18);
    this.hoveredFade += (this.hoverTarget - this.hoveredFade) * easeRate;
    this.activeFade += (this.activeTarget - this.activeFade) * easeRate;
    if (this.hoveredFade < 1e-3 && this.hoverTarget === 0) {
      this.material.uniforms['uHoveredCountry']!.value = -1;
      this.hoveredFade = 0;
    }
    if (this.activeFade < 1e-3 && this.activeTarget === 0) {
      this.material.uniforms['uActiveCountry']!.value = -1;
      this.activeFade = 0;
    }
    this.material.uniforms['uHoveredFade']!.value = this.hoveredFade;
    this.material.uniforms['uActiveFade']!.value = this.activeFade;
    this.material.uniforms['uActivePulse']!.value =
      0.5 + 0.5 * Math.sin(this.elapsed * 0.65 * 2 * Math.PI);
  }

  public setColor(color: string): void {
    this.color.set(color);
    this.material.uniforms['uColor']!.value = this.color;
  }

  public setSize(value: number): void {
    this.material.uniforms['uPointSize']!.value = value;
  }

  public setOpacity(value: number): void {
    this.opacityScale = value;
    this.material.uniforms['uOpacity']!.value = value;
  }

  public setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  // For unit tests / debugging — expose the current ease state.
  public _getDebugState(): {
    readonly hoveredFade: number;
    readonly activeFade: number;
    readonly hoveredIdx: number;
    readonly activeIdx: number;
  } {
    return {
      hoveredFade: this.hoveredFade,
      activeFade: this.activeFade,
      hoveredIdx: this.hoveredCountryIdx,
      activeIdx: this.activeCountryIdx,
    };
  }
}
