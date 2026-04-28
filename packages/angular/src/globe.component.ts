import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  createGlobe,
  type AtmosphereConfig,
  type AutoRotateConfig,
  type CountriesConfig,
  type CountryEvent,
  type GlobeConfig,
  type GlobeInstance,
  type LatLng,
  type MarkerConfig,
  type MarkerEvent,
  type PerformanceConfig,
} from '@your-globe/core';

@Component({
  selector: 'ng-globe',
  standalone: true,
  template: '<div #host class="globe-host"></div>',
  styles: [':host{display:block;width:100%;height:100%}.globe-host{width:100%;height:100%}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) private readonly host!: ElementRef<HTMLDivElement>;

  @Input() public mode: GlobeConfig['mode'];
  @Input() public countries?: CountriesConfig;
  @Input() public markers: ReadonlyArray<MarkerConfig> = [];
  @Input() public atmosphere?: AtmosphereConfig;
  @Input() public autoRotate?: AutoRotateConfig;
  @Input() public performance?: PerformanceConfig;
  @Input() public initialPosition?: LatLng;
  @Input() public minZoom?: number;
  @Input() public maxZoom?: number;

  @Output() public readonly countryClick = new EventEmitter<CountryEvent>();
  @Output() public readonly countryHover = new EventEmitter<CountryEvent | null>();
  @Output() public readonly markerClick = new EventEmitter<MarkerEvent>();
  @Output() public readonly markerHover = new EventEmitter<MarkerEvent | null>();
  @Output() public readonly ready = new EventEmitter<void>();
  @Output() public readonly globeError = new EventEmitter<Error>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private instance: GlobeInstance | null = null;

  public ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      const instance = createGlobe({
        container: this.host.nativeElement,
        ...this.buildConfig(),
      });

      instance.on('countryClick', (e) => this.ngZone.run(() => this.countryClick.emit(e)));
      instance.on('countryHover', (e) => this.ngZone.run(() => this.countryHover.emit(e)));
      instance.on('markerClick', (e) => this.ngZone.run(() => this.markerClick.emit(e)));
      instance.on('markerHover', (e) => this.ngZone.run(() => this.markerHover.emit(e)));
      instance.on('ready', () => this.ngZone.run(() => this.ready.emit()));
      instance.on('error', (err) => this.ngZone.run(() => this.globeError.emit(err)));

      instance.mount();
      this.instance = instance;
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (!this.instance) return;
    const hasRelevantChange = Object.keys(changes).some((key) => !changes[key]?.firstChange);
    if (hasRelevantChange) {
      this.ngZone.runOutsideAngular(() => this.instance?.update(this.buildConfig()));
    }
  }

  public ngOnDestroy(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  public setRotation(position: LatLng, animate?: boolean): void {
    this.instance?.setRotation(position, animate);
  }

  public addMarker(marker: MarkerConfig): void {
    this.instance?.addMarker(marker);
  }

  public removeMarker(id: string): void {
    this.instance?.removeMarker(id);
  }

  public resize(): void {
    this.instance?.resize();
  }

  private buildConfig(): Omit<GlobeConfig, 'container'> {
    return {
      ...(this.mode !== undefined && { mode: this.mode }),
      ...(this.countries !== undefined && { countries: this.countries }),
      markers: this.markers,
      ...(this.atmosphere !== undefined && { atmosphere: this.atmosphere }),
      ...(this.autoRotate !== undefined && { autoRotate: this.autoRotate }),
      ...(this.performance !== undefined && { performance: this.performance }),
      ...(this.initialPosition !== undefined && { initialPosition: this.initialPosition }),
      ...(this.minZoom !== undefined && { minZoom: this.minZoom }),
      ...(this.maxZoom !== undefined && { maxZoom: this.maxZoom }),
    };
  }
}
