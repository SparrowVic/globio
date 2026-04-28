import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

export interface HologramShellLayerOptions {
  readonly color: string;
  readonly shellOpacity: number;
  readonly rimGlow: number;
  readonly scanlineFreq: number;
  readonly scanlineSpeed: number;
  readonly scanlinesEnabled: boolean;
  readonly rimEnabled: boolean;
  readonly outerGlowEnabled: boolean;
  readonly outerGlowOpacity: number;
}

const SHELL_RADIUS = GLOBE_RADIUS * 1.001;
const OUTER_RADIUS = GLOBE_RADIUS * 1.02;
const SHELL_SEGMENTS = 96;

const SHELL_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SHELL_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uScanlineFreq;
  uniform float uScanlineSpeed;
  uniform float uBaseAlpha;
  uniform float uRimGlow;
  uniform float uScanlinesOn;
  uniform float uRimOn;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  void main() {
    float ndv = max(dot(normalize(vViewDir), normalize(vWorldNormal)), 0.0);
    float rim = (1.0 - ndv);
    rim *= rim;
    float rimContribution = rim * uRimGlow * uRimOn;

    float stripe = sin(vUv.y * uScanlineFreq + uTime * uScanlineSpeed);
    float scanline = mix(1.0, 0.6 + 0.4 * stripe, uScanlinesOn);

    vec3 rgb = uColor * (uBaseAlpha + rimContribution) * scanline;
    float alpha = uBaseAlpha * scanline + rimContribution * 1.5;
    gl_FragColor = vec4(rgb, clamp(alpha, 0.0, 1.0));
  }
`;

const OUTER_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Outer glow draws on the back-side of a slightly larger sphere so the
// silhouette halo is amplified without occluding the main shell.
const OUTER_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    float ndv = max(dot(normalize(vViewDir), normalize(vWorldNormal)), 0.0);
    float rim = 1.0 - ndv;
    rim = pow(rim, 1.5);
    gl_FragColor = vec4(uColor, rim * uOpacity);
  }
`;

export class HologramShellLayer {
  public readonly group: Group;
  private readonly shellGeom: SphereGeometry;
  private readonly shellMat: ShaderMaterial;
  private readonly outerGeom: SphereGeometry | null;
  private readonly outerMat: ShaderMaterial | null;

  public constructor(options: HologramShellLayerOptions) {
    this.group = new Group();

    this.shellGeom = new SphereGeometry(SHELL_RADIUS, SHELL_SEGMENTS, SHELL_SEGMENTS);
    this.shellMat = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uTime: { value: 0 },
        uScanlineFreq: { value: options.scanlineFreq },
        uScanlineSpeed: { value: options.scanlineSpeed },
        uBaseAlpha: { value: options.shellOpacity },
        uRimGlow: { value: options.rimGlow },
        uScanlinesOn: { value: options.scanlinesEnabled ? 1 : 0 },
        uRimOn: { value: options.rimEnabled ? 1 : 0 },
      },
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: FrontSide,
    });
    const shellMesh = new Mesh(this.shellGeom, this.shellMat);
    shellMesh.renderOrder = 2;
    this.group.add(shellMesh);

    if (options.outerGlowEnabled) {
      this.outerGeom = new SphereGeometry(OUTER_RADIUS, SHELL_SEGMENTS, SHELL_SEGMENTS);
      this.outerMat = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(options.color) },
          uOpacity: { value: options.outerGlowOpacity },
        },
        vertexShader: OUTER_VERT,
        fragmentShader: OUTER_FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: BackSide,
      });
      const outerMesh = new Mesh(this.outerGeom, this.outerMat);
      outerMesh.renderOrder = 1;
      this.group.add(outerMesh);
    } else {
      this.outerGeom = null;
      this.outerMat = null;
    }
  }

  public update(elapsedSeconds: number): void {
    this.shellMat.uniforms['uTime']!.value = elapsedSeconds;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.shellGeom.dispose();
    this.shellMat.dispose();
    this.outerGeom?.dispose();
    this.outerMat?.dispose();
    this.group.clear();
  }
}
