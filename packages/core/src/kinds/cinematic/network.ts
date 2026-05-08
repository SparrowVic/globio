import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { CINEMATIC_CITY_NODES } from './city-data';

export interface CinematicSurfaceNetworkLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly maxConnections?: number;
  readonly pulseSpeed?: number;
}

const CONNECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['new-york', 'london'],
  ['new-york', 'los-angeles'],
  ['new-york', 'toronto'],
  ['new-york', 'chicago'],
  ['new-york', 'washington'],
  ['washington', 'atlanta'],
  ['new-york', 'miami'],
  ['chicago', 'toronto'],
  ['chicago', 'los-angeles'],
  ['chicago', 'dallas'],
  ['chicago', 'mexico-city'],
  ['dallas', 'atlanta'],
  ['dallas', 'mexico-city'],
  ['miami', 'mexico-city'],
  ['miami', 'bogota'],
  ['miami', 'sao-paulo'],
  ['toronto', 'london'],
  ['seattle', 'san-francisco'],
  ['seattle', 'tokyo'],
  ['san-francisco', 'los-angeles'],
  ['los-angeles', 'tokyo'],
  ['los-angeles', 'sydney'],
  ['los-angeles', 'mexico-city'],
  ['mexico-city', 'sao-paulo'],
  ['mexico-city', 'bogota'],
  ['bogota', 'lima'],
  ['lima', 'santiago'],
  ['santiago', 'buenos-aires'],
  ['mexico-city', 'buenos-aires'],
  ['sao-paulo', 'buenos-aires'],
  ['sao-paulo', 'lagos'],
  ['sao-paulo', 'johannesburg'],
  ['buenos-aires', 'johannesburg'],
  ['london', 'paris'],
  ['london', 'berlin'],
  ['london', 'madrid'],
  ['paris', 'rome'],
  ['berlin', 'moscow'],
  ['rome', 'cairo'],
  ['cairo', 'dubai'],
  ['cairo', 'lagos'],
  ['lagos', 'johannesburg'],
  ['istanbul', 'dubai'],
  ['istanbul', 'moscow'],
  ['dubai', 'mumbai'],
  ['mumbai', 'delhi'],
  ['delhi', 'bangkok'],
  ['bangkok', 'singapore'],
  ['singapore', 'jakarta'],
  ['hong-kong', 'shanghai'],
  ['hong-kong', 'singapore'],
  ['shanghai', 'beijing'],
  ['shanghai', 'seoul'],
  ['seoul', 'tokyo'],
  ['tokyo', 'osaka'],
  ['tokyo', 'sydney'],
  ['sydney', 'melbourne'],
];

const NETWORK_RADIUS = GLOBE_RADIUS * 1.009;
const DEFAULT_CONNECTIONS = 44;
const PATH_SAMPLES = 18;

export class CinematicSurfaceNetworkLayer {
  public readonly lines: LineSegments;
  private geometry: BufferGeometry;
  private readonly material: LineBasicMaterial;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private maxConnections: number;
  private pulseSpeed: number;
  private opacity: number;

  public constructor(options: CinematicSurfaceNetworkLayerOptions) {
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;
    this.opacity = options.opacity;
    this.maxConnections = Math.max(0, Math.floor(options.maxConnections ?? DEFAULT_CONNECTIONS));
    this.pulseSpeed = options.pulseSpeed ?? 0.32;
    this.geometry = buildGeometry(this.maxConnections);
    this.material = new LineBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: options.opacity,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.lines = new LineSegments(this.geometry, this.material);
    this.lines.name = 'CinematicSurfaceNetworkLayer';
    this.lines.renderOrder = 6;
  }

  public update(_delta: number, elapsedSeconds: number): void {
    this.material.opacity =
      this.opacity * (0.76 + 0.24 * Math.sin(elapsedSeconds * this.pulseSpeed * Math.PI * 2));
  }

  public setVisible(visible: boolean): void {
    this.lines.visible = visible;
  }

  public setColor(color: string): void {
    this.material.color.set(color === '' ? this.defaultColor : color);
  }

  public setOpacity(opacity: number): void {
    this.opacity = opacity >= 0 ? opacity : this.defaultOpacity;
    this.material.opacity = this.opacity;
  }

  public setMaxConnections(count: number): void {
    const next = Math.max(0, Math.floor(count));
    if (next === this.maxConnections) return;
    this.maxConnections = next;
    const previous = this.geometry;
    this.geometry = buildGeometry(next);
    this.lines.geometry = this.geometry;
    previous.dispose();
  }

  public setPulseSpeed(speed: number): void {
    this.pulseSpeed = speed > 0 ? speed : 0.32;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

const buildGeometry = (maxConnections: number): BufferGeometry => {
  const positions: number[] = [];
  const byId = new Map(CINEMATIC_CITY_NODES.map((node) => [node.id, node]));
  CONNECTIONS.slice(0, maxConnections).forEach(([fromId, toId]) => {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) return;
    const samples = sampleSurfacePath([from.lat, from.lng], [to.lat, to.lng]);
    for (let i = 0; i < samples.length - 1; i++) {
      const start = samples[i];
      const end = samples[i + 1];
      if (!start || !end) continue;
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
};

const sampleSurfacePath = (
  from: readonly [number, number],
  to: readonly [number, number],
): Vector3[] => {
  const fromVec = latLngToVector3(from, 1);
  const toVec = latLngToVector3(to, 1);
  const angle = fromVec.angleTo(toVec);
  const sinAngle = Math.sin(angle);
  const points: Vector3[] = [];
  for (let i = 0; i < PATH_SAMPLES; i++) {
    const t = i / (PATH_SAMPLES - 1);
    let point: Vector3;
    if (sinAngle < 1e-6) {
      point = fromVec.clone();
    } else {
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      point = new Vector3(
        fromVec.x * a + toVec.x * b,
        fromVec.y * a + toVec.y * b,
        fromVec.z * a + toVec.z * b,
      );
    }
    points.push(point.multiplyScalar(NETWORK_RADIUS));
  }
  return points;
};
