import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';

export interface AtmosphereOptions {
  readonly color: string;
  readonly intensity: number;
}

const VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0) * uIntensity;
    gl_FragColor = vec4(uColor, 1.0) * intensity;
  }
`;

export class AtmosphereLayer {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: ShaderMaterial;

  public constructor(options: AtmosphereOptions) {
    this.geometry = new SphereGeometry(GLOBE_RADIUS * 1.15, 64, 64);
    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: AdditiveBlending,
      side: BackSide,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new Mesh(this.geometry, this.material);
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']?.value as Color)?.set(color);
  }

  public setIntensity(intensity: number): void {
    if (this.material.uniforms['uIntensity']) {
      this.material.uniforms['uIntensity'].value = intensity;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
