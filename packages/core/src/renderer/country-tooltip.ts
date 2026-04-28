import type { CountryData } from '../types';

export interface CountryTooltipOptions {
  readonly container: HTMLElement;
  readonly background: string;
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly padding: string;
  readonly borderRadius: string;
}

/**
 * Lightweight DOM tooltip following the cursor when a country is hovered.
 * Lives in the same container as the canvas so it scrolls/resizes naturally.
 */
export class CountryTooltip {
  private readonly element: HTMLDivElement;
  private currentCountry: CountryData | null = null;

  public constructor(options: CountryTooltipOptions) {
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

  public showCountry(country: CountryData): void {
    this.currentCountry = country;
    this.element.textContent = country.name;
    this.element.style.opacity = '1';
  }

  public clear(): void {
    this.currentCountry = null;
    this.element.style.opacity = '0';
  }

  public dispose(): void {
    this.element.parentElement?.removeEventListener('pointermove', this.onPointerMove);
    this.element.remove();
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.currentCountry) return;
    const parent = this.element.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.element.style.left = `${event.clientX - rect.left}px`;
    this.element.style.top = `${event.clientY - rect.top}px`;
  };
}
