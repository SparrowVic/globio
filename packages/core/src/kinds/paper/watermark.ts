export type PaperWatermarkPosition =
  | 'center'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

export interface PaperWatermarkOptions {
  readonly container: HTMLElement;
  readonly enabled: boolean;
  readonly text: string;
  readonly color: string;
  readonly opacity: number;
  /** Pixel font-size. */
  readonly size: number;
  readonly position: PaperWatermarkPosition;
}

/**
 * Faint DOM watermark text — sits over the canvas as a `pointer-events:
 * none` element, picked up by the human eye as "this is paper, this is
 * an artefact." Default copy "ATLAS" all-caps with wide letter-spacing
 * mimics the engraved title plates on 17th-century atlases.
 *
 * Lives outside WebGL because text rendering at this fidelity in the
 * scene would require an SDF font atlas + sprite — overkill for one
 * label. DOM CSS does it cleanly.
 *
 * All inputs live-tunable. The element is reused across updates;
 * setters mutate inline styles.
 */
export class PaperWatermark {
  private readonly container: HTMLElement;
  private readonly element: HTMLDivElement;
  private currentEnabled: boolean;
  private currentText: string;
  private currentColor: string;
  private currentOpacity: number;
  private currentSize: number;
  private currentPosition: PaperWatermarkPosition;
  private readonly defaultText: string;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private readonly defaultSize: number;
  private readonly defaultPosition: PaperWatermarkPosition;
  private readonly previousContainerPosition: string;

  public constructor(options: PaperWatermarkOptions) {
    this.container = options.container;
    this.currentEnabled = options.enabled;
    this.currentText = options.text;
    this.currentColor = options.color;
    this.currentOpacity = options.opacity;
    this.currentSize = options.size;
    this.currentPosition = options.position;
    this.defaultText = options.text;
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;
    this.defaultSize = options.size;
    this.defaultPosition = options.position;

    const computed = getComputedStyle(this.container);
    this.previousContainerPosition = this.container.style.position;
    if (computed.position === 'static') {
      this.container.style.position = 'relative';
    }

    this.element = document.createElement('div');
    this.element.className = 'globio-paper-watermark';
    Object.assign(this.element.style, {
      position: 'absolute',
      pointerEvents: 'none',
      fontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
      fontWeight: '600',
      letterSpacing: '0.42em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      zIndex: '7',
      transition: 'opacity 240ms ease',
    } satisfies Partial<CSSStyleDeclaration>);
    this.container.appendChild(this.element);
    this.applyStyle();
  }

  private positionStyle(): Partial<CSSStyleDeclaration> {
    switch (this.currentPosition) {
      case 'topLeft':
        return { top: '4%', left: '4%', transform: '' };
      case 'topRight':
        return { top: '4%', right: '4%', transform: '' };
      case 'bottomLeft':
        return { bottom: '4%', left: '4%', transform: '' };
      case 'bottomRight':
        return { bottom: '4%', right: '4%', transform: '' };
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  }

  private applyStyle(): void {
    if (!this.currentEnabled) {
      this.element.style.display = 'none';
      return;
    }
    this.element.style.display = '';
    this.element.textContent = this.currentText;
    this.element.style.color = this.currentColor;
    this.element.style.opacity = String(Math.max(0, Math.min(1, this.currentOpacity)));
    this.element.style.fontSize = `${Math.max(8, this.currentSize)}px`;

    // Reset positional fields before reapplying so the previous
    // position doesn't leak through (e.g. left set, then user picks
    // 'topRight' which should clear left).
    this.element.style.top = '';
    this.element.style.left = '';
    this.element.style.right = '';
    this.element.style.bottom = '';
    this.element.style.transform = '';
    Object.assign(this.element.style, this.positionStyle());
  }

  public setEnabled(enabled: boolean): void {
    this.currentEnabled = enabled;
    this.applyStyle();
  }

  public setText(text: string): void {
    this.currentText = text;
    this.applyStyle();
  }

  public resetText(): void {
    this.setText(this.defaultText);
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.applyStyle();
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.applyStyle();
  }

  public resetOpacity(): void {
    this.setOpacity(this.defaultOpacity);
  }

  public setSize(size: number): void {
    this.currentSize = size;
    this.applyStyle();
  }

  public resetSize(): void {
    this.setSize(this.defaultSize);
  }

  public setPosition(position: PaperWatermarkPosition): void {
    this.currentPosition = position;
    this.applyStyle();
  }

  public resetPosition(): void {
    this.setPosition(this.defaultPosition);
  }

  public dispose(): void {
    this.element.remove();
    if (this.previousContainerPosition === '') {
      if (this.container.style.position === 'relative') {
        this.container.style.position = '';
      }
    } else {
      this.container.style.position = this.previousContainerPosition;
    }
  }
}
