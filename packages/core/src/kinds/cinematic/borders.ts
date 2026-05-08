import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineSegments,
  ShaderMaterial,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';

export interface CinematicBordersLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly intensity: number;
  readonly glitch?: {
    readonly enabled: boolean;
    readonly intervalMin: number;
    readonly intervalMax: number;
    readonly amount: number;
    readonly channelShift?: number;
  };
}

const BORDER_RADIUS = GLOBE_RADIUS * 1.003;

const VERTEX_SHADER = /* glsl */ `
  attribute float aSeed;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normalize(position));
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vSeed;

  void main() {
    float ndv = max(dot(normalize(vViewDir), normalize(vWorldNormal)), 0.0);
    float facing = smoothstep(0.0, 0.34, ndv);
    float rim = pow(1.0 - ndv, 1.7);
    float grain = 0.9 + 0.1 * sin(uTime * 0.9 + vSeed * 19.739);
    float alpha = (0.14 + facing * 0.62 + rim * 0.28) * min(uIntensity, 2.6) * 0.28;
    vec3 color = uColor * (0.78 + facing * 0.42 + rim * 0.55) * grain;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class CinematicBordersLayer {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;

  public constructor(options: CinematicBordersLayerOptions) {
    this.group = new Group();
    this.group.name = 'CinematicBordersLayer';
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;

    const positions: number[] = [];
    const seeds: number[] = [];

    options.features.forEach((feature) => {
      feature.coordinates.forEach((ring) => {
        if (ring.length < 2) return;
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i];
          const b = ring[i + 1];
          if (!a || !b) continue;
          const v1 = latLngToVector3([a[1], a[0]], BORDER_RADIUS);
          const v2 = latLngToVector3([b[1], b[0]], BORDER_RADIUS);
          positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
          seeds.push(hash01(a[0], a[1]), hash01(b[0], b[1]));
        }
      });
    });

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
        uTime: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const lines = new LineSegments(this.geometry, this.material);
    lines.name = 'CinematicBordersLayerLines';
    lines.renderOrder = 5;
    this.group.add(lines);
  }

  public update(elapsedSeconds: number, _deltaSeconds: number): void {
    this.material.uniforms['uTime']!.value = elapsedSeconds;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']!.value as Color).set(
      color === '' ? this.defaultColor : color,
    );
  }

  public setIntensity(intensity: number): void {
    this.material.uniforms['uIntensity']!.value =
      intensity > 0 ? intensity : this.defaultIntensity;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}

const hash01 = (lng: number, lat: number): number => {
  const value = Math.sin(lng * 12.9898 + lat * 78.233) * 43758.5453;
  return value - Math.floor(value);
};
