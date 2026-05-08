import {
  HologramLabelsLayer,
  type HologramLabelsLayerOptions,
} from '../hologram/labels';

export class CinematicLabelsLayer extends HologramLabelsLayer {
  private color: string;

  public constructor(options: HologramLabelsLayerOptions) {
    super(options);
    this.color = options.color;
    this.applyCinematicStyle();
  }

  public override setLabels(labels: Readonly<Record<string, string>>): void {
    super.setLabels(labels);
    this.applyCinematicStyle();
  }

  public override setColor(color: string): void {
    this.color = color;
    super.setColor(color);
    this.applyCinematicStyle();
  }

  public override resetColor(): void {
    super.resetColor();
    this.applyCinematicStyle();
  }

  public override setFontSize(px: number): void {
    super.setFontSize(px);
    this.applyCinematicStyle();
  }

  public override setFontWeight(weight: string): void {
    super.setFontWeight(weight);
    this.applyCinematicStyle();
  }

  private applyCinematicStyle(): void {
    Array.from(this.host.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child.textContent?.startsWith('// ')) {
        child.textContent = child.textContent.slice(3);
      }
      Object.assign(child.style, {
        color: this.color,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderLeft: 'none',
        border: '1px solid rgba(161, 210, 255, 0.18)',
        borderRadius: '5px',
        background:
          'linear-gradient(90deg, rgba(3, 8, 16, 0.72), rgba(7, 15, 27, 0.34))',
        boxShadow: '0 0 18px rgba(88, 178, 255, 0.12)',
        padding: '3px 8px',
      } satisfies Partial<CSSStyleDeclaration>);
    });
  }
}
