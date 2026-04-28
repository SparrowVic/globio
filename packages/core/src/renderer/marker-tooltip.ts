import type { MarkerConfig } from '../types';

export interface MarkerTooltipOptions {
  readonly container: HTMLElement;
  readonly background: string;
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly padding: string;
  readonly borderRadius: string;
}

/**
 * Lightweight DOM tooltip following the cursor when a marker is hovered.
 * Reuses the same fade transition pattern as `CountryTooltip`. Shows the
 * marker's `label` if present, otherwise falls back to its `id`.
 */
export class MarkerTooltip {
  private readonly element: HTMLDivElement;
  private currentMarker: MarkerConfig | null = null;

  public constructor(options: MarkerTooltipOptions) {
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute',
      pointerEvents: 'none',
      padding: options.padding,
      borderRadius: options.borderRadius,
      fontSize: `${options.fontSize}px`,
      fontFamily: options.fontFamily,
      lineHeight: '1.2',
      background: options.background,
      color: options.textColor,
      whiteSpace: 'nowrap',
      transform: 'translate(12px, 12px)',
      opacity: '0',
      transition: 'opacity 80ms ease-out',
      zIndex: '10',
    } satisfies Partial<CSSStyleDeclaration>);
    options.container.appendChild(this.element);

    options.container.addEventListener('pointermove', this.onPointerMove);
  }

  public showMarker(marker: MarkerConfig): void {
    this.currentMarker = marker;
    this.element.textContent = marker.label ?? marker.id;
    this.element.style.opacity = '1';
  }

  public clear(): void {
    this.currentMarker = null;
    this.element.style.opacity = '0';
  }

  public dispose(): void {
    this.element.parentElement?.removeEventListener('pointermove', this.onPointerMove);
    this.element.remove();
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.currentMarker) return;
    const parent = this.element.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.element.style.left = `${event.clientX - rect.left}px`;
    this.element.style.top = `${event.clientY - rect.top}px`;
  };
}
