export interface PaperVignetteOverlayOptions {
  readonly container: HTMLElement;
  readonly enabled: boolean;
  readonly color: string;
  readonly intensity: number;
  readonly radius: number;
}

/**
 * Corner-darkening DOM overlay — a radial-gradient div pinned over the
 * globe canvas. Reads like the centred-illustration framing of a page
 * from an old atlas: the globe glows in the middle, the corners fall to
 * a soft brown / sepia.
 *
 * Lives outside the WebGL pipeline so it composites cleanly over the
 * canvas without blending math. `pointer-events: none` ensures it
 * doesn't intercept clicks/hovers on the globe.
 *
 * All inputs are live-tunable. The overlay regenerates its CSS from the
 * latest values whenever a setter fires.
 */
export class PaperVignetteOverlay {
  private readonly container: HTMLElement;
  private readonly element: HTMLDivElement;
  private currentEnabled: boolean;
  private currentColor: string;
  private currentIntensity: number;
  private currentRadius: number;
  private readonly defaultEnabled: boolean;
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultRadius: number;
  private readonly previousContainerPosition: string;

  public constructor(options: PaperVignetteOverlayOptions) {
    this.container = options.container;
    this.currentEnabled = options.enabled;
    this.currentColor = options.color;
    this.currentIntensity = options.intensity;
    this.currentRadius = options.radius;
    this.defaultEnabled = options.enabled;
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.defaultRadius = options.radius;

    // Make sure the container can host an absolutely-positioned overlay.
    const computed = getComputedStyle(this.container);
    this.previousContainerPosition = this.container.style.position;
    if (computed.position === 'static') {
      this.container.style.position = 'relative';
    }

    this.element = document.createElement('div');
    this.element.className = 'globio-paper-vignette';
    Object.assign(this.element.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      mixBlendMode: 'multiply',
      zIndex: '6',
    } satisfies Partial<CSSStyleDeclaration>);
    this.container.appendChild(this.element);
    this.applyStyle();
  }

  private applyStyle(): void {
    if (!this.currentEnabled || this.currentIntensity <= 0) {
      this.element.style.display = 'none';
      return;
    }
    this.element.style.display = '';
    const r = Math.max(0, Math.min(0.95, this.currentRadius));
    // Convert the color + intensity into an rgba stop. We assume hex
    // input + intensity in [0,1].
    const stop = colorWithAlpha(this.currentColor, this.currentIntensity);
    this.element.style.background = `radial-gradient(ellipse at center, transparent 0%, transparent ${(r * 100).toFixed(1)}%, ${stop} 100%)`;
  }

  public setEnabled(enabled: boolean): void {
    this.currentEnabled = enabled;
    this.applyStyle();
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.applyStyle();
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, intensity));
    this.applyStyle();
  }

  public resetIntensity(): void {
    this.setIntensity(this.defaultIntensity);
  }

  public setRadius(radius: number): void {
    this.currentRadius = Math.max(0, Math.min(0.95, radius));
    this.applyStyle();
  }

  public resetRadius(): void {
    this.setRadius(this.defaultRadius);
  }

  public resetAll(): void {
    this.currentEnabled = this.defaultEnabled;
    this.currentColor = this.defaultColor;
    this.currentIntensity = this.defaultIntensity;
    this.currentRadius = this.defaultRadius;
    this.applyStyle();
  }

  public dispose(): void {
    this.element.remove();
    if (this.previousContainerPosition === '') {
      // Only clear if nothing else has set it since.
      if (this.container.style.position === 'relative') {
        this.container.style.position = '';
      }
    } else {
      this.container.style.position = this.previousContainerPosition;
    }
  }
}

/** Convert a `#rrggbb` (or rgb(a) string) + alpha into a CSS rgba stop. */
function colorWithAlpha(input: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const trimmed = input.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
    }
  }
  // Fallback — opaque-ish black wash. Caller's hex went sideways.
  return `rgba(0, 0, 0, ${a.toFixed(3)})`;
}
