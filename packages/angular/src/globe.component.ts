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
  pickGlobeConfig,
  type ArcConfig,
  type AtmosphereConfig,
  type AutoRotateConfig,
  type CinematicConfig,
  type CountriesConfig,
  type CountryDataMap,
  type CountryEvent,
  type CountryLabelsConfig,
  type DottedConfig,
  type FramingConfig,
  type GlobeConfig,
  type GlobeConfigInput,
  type GlobeInstance,
  type GlobeKind,
  type GlobeMode,
  type HologramConfig,
  type HtmlMarkerConfig,
  type LatLng,
  type MarkerConfig,
  type MarkerEvent,
  type OutlineConfig,
  type PaperConfig,
  type PerformanceConfig,
  type PostProcessingConfig,
  type StarfieldConfig,
  type StoryCompleteEvent,
  type StorySceneEvent,
  type SurfaceClickEvent,
  type ThemeInput,
  type WireframeConfig,
  type ZoomConfig,
} from '@your-globe/core';

/**
 * `<ng-globe>` — every `GlobeConfig` key is an input, every globe event an
 * output (`error` is exposed as `globeError` so it does not shadow the DOM
 * event), and `getInstance()` returns the engine instance for imperative
 * calls. The globe runs outside Angular's zone; outputs re-enter it.
 */
@Component({
  selector: 'ng-globe',
  standalone: true,
  template: '<div #host class="globe-host"></div>',
  styles: [':host{display:block;width:100%;height:100%}.globe-host{width:100%;height:100%}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) private readonly host!: ElementRef<HTMLDivElement>;

  @Input() public mode?: GlobeMode;
  @Input() public kind?: GlobeKind;
  @Input() public theme?: ThemeInput;
  @Input() public countries?: CountriesConfig;
  @Input() public countryLabels?: CountryLabelsConfig;
  @Input() public countryData?: CountryDataMap;
  @Input() public markers?: ReadonlyArray<MarkerConfig>;
  @Input() public htmlMarkers?: ReadonlyArray<HtmlMarkerConfig>;
  @Input() public arcs?: ReadonlyArray<ArcConfig>;
  @Input() public atmosphere?: AtmosphereConfig;
  @Input() public focusPulse?: GlobeConfig['focusPulse'];
  @Input() public outline?: OutlineConfig;
  @Input() public cinematic?: CinematicConfig;
  @Input() public dotted?: DottedConfig;
  @Input() public wireframe?: WireframeConfig;
  @Input() public paper?: PaperConfig;
  @Input() public hologram?: HologramConfig;
  @Input() public starfield?: StarfieldConfig;
  @Input() public postprocessing?: PostProcessingConfig;
  @Input() public axisTilt?: number;
  @Input() public autoRotate?: AutoRotateConfig;
  @Input() public performance?: PerformanceConfig;
  @Input() public initialPosition?: LatLng;
  @Input() public minZoom?: number;
  @Input() public maxZoom?: number;
  @Input() public zoom?: ZoomConfig;
  @Input() public transparent?: boolean;
  @Input() public framing?: FramingConfig;

  @Output() public readonly countryClick = new EventEmitter<CountryEvent>();
  @Output() public readonly countryHover = new EventEmitter<CountryEvent | null>();
  @Output() public readonly markerClick = new EventEmitter<MarkerEvent>();
  @Output() public readonly markerHover = new EventEmitter<MarkerEvent | null>();
  @Output() public readonly surfaceClick = new EventEmitter<SurfaceClickEvent>();
  @Output() public readonly sceneEnter = new EventEmitter<StorySceneEvent>();
  @Output() public readonly sceneExit = new EventEmitter<StorySceneEvent>();
  @Output() public readonly storyComplete = new EventEmitter<StoryCompleteEvent>();
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
      instance.on('surfaceClick', (e) => this.ngZone.run(() => this.surfaceClick.emit(e)));
      instance.on('sceneEnter', (e) => this.ngZone.run(() => this.sceneEnter.emit(e)));
      instance.on('sceneExit', (e) => this.ngZone.run(() => this.sceneExit.emit(e)));
      instance.on('storyComplete', (e) => this.ngZone.run(() => this.storyComplete.emit(e)));
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

  /** The underlying engine instance, or null before the view is initialised / after destroy. */
  public getInstance(): GlobeInstance | null {
    return this.instance;
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

  private buildConfig(): GlobeConfigInput {
    return pickGlobeConfig(this as unknown as Record<string, unknown>);
  }
}
