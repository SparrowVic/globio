# @globiojs/angular

Angular standalone component for the [GlobioJS](https://github.com/SparrowVic/globiojs) interactive 3D globe engine.

## Installation

```bash
npm install @globiojs/angular @globiojs/core three
```

GlobioJS supports Angular 17 through 22. The package uses Angular's partial compilation format so applications can process it with their own Angular compiler.

## Usage

Import the standalone component and give its host an explicit size:

```ts
import { Component } from '@angular/core';
import {
  GlobeComponent,
  type MarkerConfig,
  type MarkerEvent,
} from '@globiojs/angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [GlobeComponent],
  template: `
    <ng-globe
      class="globe"
      kind="outline"
      theme="outline-cyber"
      [markers]="markers"
      (markerClick)="openMarker($event)"
    />
  `,
  styles: `.globe { display: block; width: 100%; height: 32rem; }`,
})
export class HomeComponent {
  readonly markers = [
    { id: 'warsaw', position: [52.2297, 21.0122], label: 'Warsaw' },
  ] satisfies ReadonlyArray<MarkerConfig>;

  openMarker(event: MarkerEvent): void {
    console.log(event.marker);
  }
}
```

Every public `GlobeConfig` option is available as an input. Engine events are Angular outputs; the engine's `error` event is exposed as `globeError` to avoid colliding with the native DOM event.

## Imperative API

Use `getInstance()` when an operation is easier to express imperatively:

```ts
import { Component, ViewChild } from '@angular/core';
import { GlobeComponent } from '@globiojs/angular';

@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: `<ng-globe #globe class="globe" />`,
  styles: `.globe { display: block; width: 100%; height: 32rem; }`,
})
export class GlobePageComponent {
  @ViewChild('globe') private globe?: GlobeComponent;

  focusWarsaw(): void {
    this.globe?.setRotation([52.2297, 21.0122], true);
  }
}
```

The component initializes the WebGL engine outside Angular's zone, re-enters the zone for outputs, skips initialization during server-side rendering, and destroys the engine with the component.

## License

[MIT](./LICENSE) © Wiktor Wróbel.
