# Story / Narrative Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a declarative scene timeline — `globe.setStory({ scenes: [...] })` — that orchestrates camera moves, country highlights, and HTML popups across a sequence of timed scenes with `play / pause / next / prev / goToScene` controls and per-scene events.

**Architecture:** A `StoryController` class composes the existing primitives (`flyTo`, `focusOnCountry`, `setActiveCountry`, html-markers layer) through a thin `StoryGlobeAdapter` interface. The adapter is implemented in `globe.ts` and bridges controller calls to instance methods + emits events through the existing `GlobeEventEmitter`. Scene-scoped popup is treated as a reserved HTML marker (`__story_popup` id) added on scene enter and removed on exit, so it never conflicts with user-supplied markers. Scene auto-advance uses `setTimeout` driven by `scene.duration`; cancelling on `pause/next/prev/goToScene/setStory` ensures clean state.

**Tech Stack:** TypeScript strict, Vitest with `vi.useFakeTimers()` for controller tests, no new runtime deps.

---

## Why this scope

Ships:
- `setStory(story)` / `clearStory()`
- `playStory()` / `pauseStory()` / `nextScene()` / `prevScene()` / `goToScene(id)` / `getCurrentScene()` / `isStoryPlaying()`
- Scene fields: `flyTo`, `focusOnCountry`, `activeCountry`, `popup`, `duration`, `transitionDuration`, `easing`
- `StoryConfig.autoPlay`, `loop`, `startAt`
- Events: `sceneEnter`, `sceneExit`, `storyComplete`

Defers:
- **Scene-scoped markers/arcs** — would require tracking user vs scene-owned sets in the renderer; clean to add later as a separate plan.
- **Scrollytelling hook** — intersection-observer-driven scene advancement; v2+.
- **Branching scenes** — `scene.branches: [{ if, goTo }]`; v2+.
- **Audio narration sync** — v2+.
- **WYSIWYG editor** — stretch.

---

## File structure

**New files:**

- `packages/core/src/story/types.ts` — `SceneConfig`, `StoryConfig`, `StorySceneEvent`, `StoryGlobeAdapter`
- `packages/core/src/story/story-controller.ts` — pure logic class (uses adapter, no Three.js)
- `packages/core/src/story/index.ts` — barrel
- `packages/core/src/story/__tests__/story-controller.test.ts` — controller behaviour TDD

**Modified files:**

- `packages/core/src/types.ts` — extend `GlobeEvents` with story events; add story methods to `GlobeInstance`
- `packages/core/src/globe.ts` — instantiate controller with adapter, wire methods to instance
- `packages/core/src/index.ts` — re-export `SceneConfig`, `StoryConfig`, story event payload types
- `examples/vanilla-demo/index.html` — Story HUD section (play/pause/prev/next + scene indicator)
- `examples/vanilla-demo/src/main.ts` — define a sample "World Tour" story + wire HUD controls
- `FEATURES.md` — flip status flags for §4.8 items that ship

---

## Task 1: Story types

**Files:**
- Create: `packages/core/src/story/types.ts`

- [ ] **Step 1: Write the type module**

Path: `packages/core/src/story/types.ts`

```ts
import type { EasingFunction, LatLng } from '../types';

/**
 * One step in a story timeline. Each scene optionally moves the camera,
 * highlights a country, and shows a popup; auto-advances after `duration`.
 */
export interface SceneConfig {
  /** Stable id for `goToScene()` and event payloads. Must be unique per story. */
  readonly id: string;
  /** Total scene duration in milliseconds (camera transition + hold). */
  readonly duration: number;
  /**
   * Camera transition length in ms. Defaults to `min(1500, duration * 0.6)` —
   * leaves at least 40% of the scene as a settled "hold" after arrival.
   */
  readonly transitionDuration?: number;
  /** Easing for the camera transition. Default `easeInOutCubic`. */
  readonly easing?: EasingFunction;
  /**
   * Fly the camera to a lat/lng. Mutually exclusive with `focusOnCountry` —
   * if both are provided, `focusOnCountry` wins.
   */
  readonly flyTo?: { readonly position: LatLng; readonly distance?: number };
  /** Auto-frame a country (uses bbox-derived distance + padding). */
  readonly focusOnCountry?: string;
  /**
   * Active country to highlight throughout this scene. Pass `null` to
   * explicitly clear; omit to inherit from the previous scene.
   */
  readonly activeCountry?: string | null;
  /** Optional HTML popup anchored to a position; auto-removed on scene exit. */
  readonly popup?: {
    readonly position: LatLng;
    readonly content: string;
    readonly anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  };
}

export interface StoryConfig {
  readonly scenes: ReadonlyArray<SceneConfig>;
  /** Begin auto-advancing on `setStory()`. Default false. */
  readonly autoPlay?: boolean;
  /** Restart from scene 0 after the last scene completes. Default false. */
  readonly loop?: boolean;
  /** Scene id to start at. Defaults to first scene. */
  readonly startAt?: string;
}

export interface StorySceneEvent {
  readonly scene: SceneConfig;
  readonly index: number;
}

export interface StoryCompleteEvent {
  readonly story: StoryConfig;
}

/**
 * Thin interface the controller uses to drive the globe. Decouples the
 * controller from Three.js / GlobeInstance — makes it unit-testable with a
 * mock adapter and lets future renderers (2D, headless) reuse it.
 */
export interface StoryGlobeAdapter {
  flyTo(position: LatLng, distance: number | undefined, options: { duration?: number; easing?: EasingFunction }): void;
  focusOnCountry(id: string, options: { duration?: number; easing?: EasingFunction }): void;
  setActiveCountry(id: string | null): void;
  setStoryPopup(popup: SceneConfig['popup'] | null): void;
  emitSceneEnter(event: StorySceneEvent): void;
  emitSceneExit(event: StorySceneEvent): void;
  emitStoryComplete(event: StoryCompleteEvent): void;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @your-globe/core typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/story/types.ts
git commit -m "feat(core): story engine types (SceneConfig, StoryConfig, adapter)"
```

---

## Task 2: StoryController class (TDD)

**Files:**
- Create: `packages/core/src/story/story-controller.ts`
- Create: `packages/core/src/story/__tests__/story-controller.test.ts`

The controller drives play/pause/next/prev/goTo, calls into the adapter on transitions, and schedules auto-advance via `setTimeout`. We test through a mock adapter with `vi.useFakeTimers()` so behaviour is deterministic.

- [ ] **Step 1: Write the failing tests**

Path: `packages/core/src/story/__tests__/story-controller.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryController } from '../story-controller';
import type { SceneConfig, StoryConfig, StoryGlobeAdapter } from '../types';

const makeMockAdapter = (): StoryGlobeAdapter & {
  calls: Array<{ method: string; args: unknown[] }>;
} => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
  };
  return {
    calls,
    flyTo: record('flyTo'),
    focusOnCountry: record('focusOnCountry'),
    setActiveCountry: record('setActiveCountry'),
    setStoryPopup: record('setStoryPopup'),
    emitSceneEnter: record('emitSceneEnter'),
    emitSceneExit: record('emitSceneExit'),
    emitStoryComplete: record('emitStoryComplete'),
  };
};

const SCENE_A: SceneConfig = {
  id: 'a',
  duration: 1000,
  flyTo: { position: [0, 0], distance: 3 },
};
const SCENE_B: SceneConfig = {
  id: 'b',
  duration: 1500,
  focusOnCountry: '616',
  activeCountry: '616',
};
const SCENE_C: SceneConfig = {
  id: 'c',
  duration: 800,
  popup: { position: [40, -74], content: 'Hello NYC' },
};
const STORY: StoryConfig = { scenes: [SCENE_A, SCENE_B, SCENE_C] };

describe('StoryController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('does nothing until a story is set', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.play();
    ctrl.next();
    ctrl.goTo('a');
    expect(adapter.calls).toEqual([]);
    expect(ctrl.getCurrentScene()).toBeNull();
  });

  it('setStory + play enters first scene and emits sceneEnter', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.play();
    expect(adapter.calls.find((c) => c.method === 'emitSceneEnter')).toBeDefined();
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    expect(ctrl.isPlaying()).toBe(true);
  });

  it('autoPlay starts immediately on setStory', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true });
    expect(ctrl.isPlaying()).toBe(true);
    expect(ctrl.getCurrentScene()?.id).toBe('a');
  });

  it('auto-advances to next scene after duration elapses', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true });
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    vi.advanceTimersByTime(1000);
    expect(ctrl.getCurrentScene()?.id).toBe('b');
    vi.advanceTimersByTime(1500);
    expect(ctrl.getCurrentScene()?.id).toBe('c');
  });

  it('emits storyComplete after last scene when not looping', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true });
    vi.advanceTimersByTime(1000 + 1500 + 800);
    const completes = adapter.calls.filter((c) => c.method === 'emitStoryComplete');
    expect(completes.length).toBe(1);
    expect(ctrl.isPlaying()).toBe(false);
  });

  it('loops back to scene 0 when loop=true', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true, loop: true });
    vi.advanceTimersByTime(1000 + 1500 + 800);
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    expect(ctrl.isPlaying()).toBe(true);
  });

  it('pause stops auto-advance', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true });
    vi.advanceTimersByTime(500);
    ctrl.pause();
    vi.advanceTimersByTime(2000);
    expect(ctrl.getCurrentScene()?.id).toBe('a'); // didn't advance
    expect(ctrl.isPlaying()).toBe(false);
  });

  it('next advances even when paused, without re-arming the timer', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.next();
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    ctrl.next();
    expect(ctrl.getCurrentScene()?.id).toBe('b');
    vi.advanceTimersByTime(5000);
    expect(ctrl.getCurrentScene()?.id).toBe('b'); // paused, no auto-advance
  });

  it('prev goes back; cannot go before scene 0', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.next();
    ctrl.next(); // at b
    ctrl.prev();
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    ctrl.prev();
    expect(ctrl.getCurrentScene()?.id).toBe('a'); // already first
  });

  it('goTo jumps to scene by id', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.goTo('c');
    expect(ctrl.getCurrentScene()?.id).toBe('c');
  });

  it('goTo with unknown id is a no-op', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.goTo('a');
    ctrl.goTo('does-not-exist');
    expect(ctrl.getCurrentScene()?.id).toBe('a');
  });

  it('emits sceneExit before sceneEnter on transition', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.next();
    adapter.calls.length = 0;
    ctrl.next();
    const order = adapter.calls.map((c) => c.method).filter((m) => m.startsWith('emit'));
    expect(order[0]).toBe('emitSceneExit');
    expect(order.indexOf('emitSceneEnter')).toBeGreaterThan(order.indexOf('emitSceneExit'));
  });

  it('applies focusOnCountry when set on scene', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.goTo('b');
    const focus = adapter.calls.find((c) => c.method === 'focusOnCountry');
    expect(focus?.args[0]).toBe('616');
  });

  it('applies flyTo when set on scene (no focusOnCountry)', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.goTo('a');
    const fly = adapter.calls.find((c) => c.method === 'flyTo');
    expect(fly?.args[0]).toEqual([0, 0]);
  });

  it('updates active country only when scene defines it', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.goTo('a');
    expect(adapter.calls.find((c) => c.method === 'setActiveCountry')).toBeUndefined();
    ctrl.goTo('b');
    const active = adapter.calls.find((c) => c.method === 'setActiveCountry');
    expect(active?.args[0]).toBe('616');
  });

  it('shows popup on enter, clears on exit', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.goTo('c');
    const enterPopup = adapter.calls.find((c) => c.method === 'setStoryPopup');
    expect(enterPopup?.args[0]).toEqual(SCENE_C.popup);
    adapter.calls.length = 0;
    ctrl.goTo('a');
    const exitPopup = adapter.calls.find(
      (c) => c.method === 'setStoryPopup' && c.args[0] === null
    );
    expect(exitPopup).toBeDefined();
  });

  it('setStory(null) pauses + clears state', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.play();
    ctrl.setStory(null);
    expect(ctrl.isPlaying()).toBe(false);
    expect(ctrl.getCurrentScene()).toBeNull();
  });

  it('honours startAt by jumping to that scene initially', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true, startAt: 'b' });
    expect(ctrl.getCurrentScene()?.id).toBe('b');
  });
});
```

- [ ] **Step 2: Run tests — verify all fail**

```bash
pnpm --filter @your-globe/core test
```

Expected: 17 tests fail with module-not-found.

- [ ] **Step 3: Implement the controller**

Path: `packages/core/src/story/story-controller.ts`

```ts
import type {
  SceneConfig,
  StoryConfig,
  StoryGlobeAdapter,
  StorySceneEvent,
} from './types';

export class StoryController {
  private story: StoryConfig | null = null;
  private currentIndex = -1;
  private playing = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  public constructor(private readonly adapter: StoryGlobeAdapter) {}

  public setStory(story: StoryConfig | null): void {
    this.cancelTimer();
    this.exitCurrentScene();
    this.story = story;
    this.currentIndex = -1;
    this.playing = false;
    if (!story) return;
    if (story.startAt) {
      const idx = story.scenes.findIndex((s) => s.id === story.startAt);
      if (idx >= 0) this.goToIndex(idx);
    }
    if (story.autoPlay) this.play();
  }

  public play(): void {
    if (!this.story) return;
    this.playing = true;
    if (this.currentIndex < 0) {
      this.goToIndex(0);
    } else {
      this.scheduleAdvance();
    }
  }

  public pause(): void {
    this.playing = false;
    this.cancelTimer();
  }

  public next(): void {
    if (!this.story) return;
    if (this.currentIndex < 0) {
      this.goToIndex(0);
      return;
    }
    if (this.currentIndex < this.story.scenes.length - 1) {
      this.goToIndex(this.currentIndex + 1);
      return;
    }
    if (this.story.loop) {
      this.goToIndex(0);
      return;
    }
    // End of story
    this.exitCurrentScene();
    this.adapter.emitStoryComplete({ story: this.story });
    this.playing = false;
    this.cancelTimer();
  }

  public prev(): void {
    if (!this.story) return;
    if (this.currentIndex > 0) this.goToIndex(this.currentIndex - 1);
  }

  public goTo(id: string): void {
    if (!this.story) return;
    const idx = this.story.scenes.findIndex((s) => s.id === id);
    if (idx >= 0) this.goToIndex(idx);
  }

  public getCurrentScene(): SceneConfig | null {
    if (!this.story || this.currentIndex < 0) return null;
    return this.story.scenes[this.currentIndex] ?? null;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  private goToIndex(idx: number): void {
    this.cancelTimer();
    this.exitCurrentScene();
    this.currentIndex = idx;
    const scene = this.story?.scenes[idx];
    if (!scene) return;
    this.enterScene(scene, idx);
    if (this.playing) this.scheduleAdvance();
  }

  private enterScene(scene: SceneConfig, index: number): void {
    const transitionOptions = {
      duration: scene.transitionDuration ?? Math.min(1500, Math.floor(scene.duration * 0.6)),
      ...(scene.easing && { easing: scene.easing }),
    };

    if (scene.focusOnCountry) {
      this.adapter.focusOnCountry(scene.focusOnCountry, transitionOptions);
    } else if (scene.flyTo) {
      this.adapter.flyTo(scene.flyTo.position, scene.flyTo.distance, transitionOptions);
    }

    if (scene.activeCountry !== undefined) {
      this.adapter.setActiveCountry(scene.activeCountry);
    }

    this.adapter.setStoryPopup(scene.popup ?? null);

    const event: StorySceneEvent = { scene, index };
    this.adapter.emitSceneEnter(event);
  }

  private exitCurrentScene(): void {
    if (!this.story || this.currentIndex < 0) return;
    const scene = this.story.scenes[this.currentIndex];
    if (!scene) return;
    this.adapter.setStoryPopup(null);
    this.adapter.emitSceneExit({ scene, index: this.currentIndex });
  }

  private scheduleAdvance(): void {
    const scene = this.getCurrentScene();
    if (!scene) return;
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.next();
    }, scene.duration);
  }

  private cancelTimer(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
pnpm --filter @your-globe/core test
```

Expected: all 17 new tests pass alongside the existing 46 (63 total).

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @your-globe/core typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/story/story-controller.ts packages/core/src/story/__tests__/story-controller.test.ts
git commit -m "feat(core): StoryController with play/pause/next/prev/goTo + 17 TDD specs"
```

---

## Task 3: Public types — story events + GlobeInstance methods

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Add story event payloads to `GlobeEvents`**

In `packages/core/src/types.ts`, add the import at the top (after the existing import block):

```ts
import type { SceneConfig, StoryConfig, StorySceneEvent, StoryCompleteEvent } from './story/types';
```

Then in the `GlobeEvents` interface, add three new event entries (alongside the existing `countryClick`, `markerHover`, etc.):

```ts
  readonly sceneEnter: (event: StorySceneEvent) => void;
  readonly sceneExit: (event: StorySceneEvent) => void;
  readonly storyComplete: (event: StoryCompleteEvent) => void;
```

- [ ] **Step 2: Extend `GlobeInstance` with story methods**

In the `GlobeInstance` interface, add (after the existing `getActiveCountry` line):

```ts
  readonly setStory: (story: StoryConfig | null) => void;
  readonly playStory: () => void;
  readonly pauseStory: () => void;
  readonly nextScene: () => void;
  readonly prevScene: () => void;
  readonly goToScene: (id: string) => void;
  readonly getCurrentScene: () => SceneConfig | null;
  readonly isStoryPlaying: () => boolean;
```

- [ ] **Step 3: Re-export story types from public surface**

In `packages/core/src/index.ts`, append to the bottom:

```ts
export type {
  SceneConfig,
  StoryConfig,
  StorySceneEvent,
  StoryCompleteEvent,
} from './story/types';
```

- [ ] **Step 4: Build to surface compile errors**

```bash
pnpm --filter @your-globe/core build
```

Expected: `globe.ts` will fail (missing methods) — that's Task 4. ESM/CJS may build but DTS fails.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): public types for story engine (events + instance methods)"
```

---

## Task 4: Wire StoryController into globe.ts

**Files:**
- Modify: `packages/core/src/globe.ts`

We add the controller construction with an inline adapter that bridges to the existing instance functionality. Scene popup uses a reserved HTML marker id `__story_popup` so it never collides with user-supplied markers.

- [ ] **Step 1: Add imports**

In `packages/core/src/globe.ts`, near the top with the other imports:

```ts
import { StoryController } from './story/story-controller';
import type { SceneConfig, StoryConfig } from './story/types';
```

- [ ] **Step 2: Construct controller and adapter**

Find the line where `state` is constructed (the `const state: InternalState = {...}` block). Right AFTER it, add the controller wiring:

```ts
  const STORY_POPUP_ID = '__story_popup';

  const storyController = new StoryController({
    flyTo: (position, distance, options) => {
      controls.flyTo(globeLocalToWorldLatLng(position), distance, options);
    },
    focusOnCountry: (id, options) => {
      const layer = state.countriesPickingLayer;
      if (!layer) return;
      const bounds = layer.getCountryBounds(id);
      if (!bounds) return;
      const distance = computeFocusDistance(
        bounds,
        scene.camera,
        0.15,
        GLOBE_RADIUS,
        scene.camera.position.length()
      );
      controls.setAutoRotate(false);
      controls.flyTo(globeLocalToWorldLatLng(boundsCenter(bounds)), distance, options);
    },
    setActiveCountry: (id) => {
      state.activeCountryId = id;
      if (id === null) state.countryActiveLayer?.clear();
      else state.countryActiveLayer?.showCountry(id);
    },
    setStoryPopup: (popup) => {
      htmlMarkersLayer.removeMarker(STORY_POPUP_ID);
      if (popup) {
        htmlMarkersLayer.addMarker({
          id: STORY_POPUP_ID,
          position: popup.position,
          content: popup.content,
          ...(popup.anchor && { anchor: popup.anchor }),
        });
      }
    },
    emitSceneEnter: (event) => emitter.emit('sceneEnter', event),
    emitSceneExit: (event) => emitter.emit('sceneExit', event),
    emitStoryComplete: (event) => emitter.emit('storyComplete', event),
  });
```

- [ ] **Step 3: Add story methods to the returned `instance`**

Inside the `const instance: GlobeInstance = {` literal, add (alongside `setActiveCountry`/`getActiveCountry`):

```ts
    setStory: (story: StoryConfig | null) => storyController.setStory(story),
    playStory: () => storyController.play(),
    pauseStory: () => storyController.pause(),
    nextScene: () => storyController.next(),
    prevScene: () => storyController.prev(),
    goToScene: (id: string) => storyController.goTo(id),
    getCurrentScene: (): SceneConfig | null => storyController.getCurrentScene(),
    isStoryPlaying: () => storyController.isPlaying(),
```

- [ ] **Step 4: Clean up controller on destroy**

In the `destroy` block of `instance`, add at the very top (before the existing teardown):

```ts
      storyController.setStory(null);
```

(That call cancels any active timer and exits the current scene cleanly.)

- [ ] **Step 5: Build + typecheck + tests**

```bash
pnpm --filter @your-globe/core build
pnpm --filter @your-globe/core typecheck
pnpm --filter @your-globe/core test
```

Expected: all green; 63 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/globe.ts
git commit -m "feat(core): wire StoryController into globe.ts via inline adapter"
```

---

## Task 5: Demo — sample "World Tour" story + HUD controls

**Files:**
- Modify: `examples/vanilla-demo/index.html`
- Modify: `examples/vanilla-demo/src/main.ts`

- [ ] **Step 1: Add Story HUD section**

In `examples/vanilla-demo/index.html`, add after the existing "Navigation" section:

```html
<div class="hud-section">
  <div class="hud-section-title">Story</div>
  <div class="hud-row">
    <button id="story-prev" style="padding: 4px 8px; cursor: pointer;">⏮</button>
    <button id="story-play" style="padding: 4px 8px; cursor: pointer;">▶ Play tour</button>
    <button id="story-next" style="padding: 4px 8px; cursor: pointer;">⏭</button>
  </div>
  <div class="hud-row">
    <span id="story-status" style="font-size: 11px; color: #8aa0c8;">No story</span>
  </div>
</div>
```

- [ ] **Step 2: Define a sample story + wire controls in `main.ts`**

Add the sample story near the other constants (after `ARCS`):

```ts
const WORLD_TOUR = {
  scenes: [
    {
      id: 'intro',
      duration: 4000,
      flyTo: { position: [20, 0] as const, distance: 3 },
      popup: {
        position: [20, 0] as const,
        content: '<div style="background:rgba(10,14,30,0.9);border:1px solid #ffd700;color:#ffd700;padding:8px 12px;border-radius:6px;font-family:system-ui">🌍 World Tour — sit back, scroll handed</div>',
      },
    },
    {
      id: 'europe',
      duration: 4500,
      focusOnCountry: '616', // Poland (TopoJSON M49 numeric id)
      activeCountry: '616',
      popup: {
        position: [52.2297, 21.0122] as const,
        content: '<div style="background:rgba(10,14,30,0.9);border:1px solid #4a9eff;color:#4a9eff;padding:8px 12px;border-radius:6px;font-family:system-ui">🇵🇱 Warsaw, Poland</div>',
        anchor: 'bottom' as const,
      },
    },
    {
      id: 'americas',
      duration: 4500,
      flyTo: { position: [40.7128, -74.006] as const, distance: 2.6 },
      activeCountry: '840', // USA
      popup: {
        position: [40.7128, -74.006] as const,
        content: '<div style="background:rgba(10,14,30,0.9);border:1px solid #ff5577;color:#ff5577;padding:8px 12px;border-radius:6px;font-family:system-ui">🗽 New York, USA</div>',
        anchor: 'bottom' as const,
      },
    },
    {
      id: 'asia',
      duration: 4500,
      flyTo: { position: [35.6762, 139.6503] as const, distance: 2.6 },
      activeCountry: '392', // Japan
      popup: {
        position: [35.6762, 139.6503] as const,
        content: '<div style="background:rgba(10,14,30,0.9);border:1px solid #22ddaa;color:#22ddaa;padding:8px 12px;border-radius:6px;font-family:system-ui">🗼 Tokyo, Japan</div>',
        anchor: 'bottom' as const,
      },
    },
    {
      id: 'oceania',
      duration: 4500,
      flyTo: { position: [-33.8688, 151.2093] as const, distance: 2.6 },
      activeCountry: '036', // Australia
      popup: {
        position: [-33.8688, 151.2093] as const,
        content: '<div style="background:rgba(10,14,30,0.9);border:1px solid #ffaa33;color:#ffaa33;padding:8px 12px;border-radius:6px;font-family:system-ui">🦘 Sydney, Australia</div>',
        anchor: 'bottom' as const,
      },
    },
  ],
  loop: true,
};
```

Add the DOM refs near the other `$` queries:

```ts
const $storyPrev = document.getElementById('story-prev') as HTMLButtonElement;
const $storyPlay = document.getElementById('story-play') as HTMLButtonElement;
const $storyNext = document.getElementById('story-next') as HTMLButtonElement;
const $storyStatus = document.getElementById('story-status') as HTMLSpanElement;
```

Add the wiring (place near the bottom, before the final `buildGlobe(settings.themeName)` call):

```ts
const renderStoryStatus = (): void => {
  if (!globe) {
    $storyStatus.textContent = 'No story';
    return;
  }
  const scene = globe.getCurrentScene();
  if (!scene) {
    $storyStatus.textContent = 'Story idle';
    return;
  }
  const playing = globe.isStoryPlaying() ? '▶ playing' : '⏸ paused';
  $storyStatus.textContent = `${playing} — scene ${scene.id}`;
};

$storyPlay.addEventListener('click', () => {
  if (!globe) return;
  if (globe.isStoryPlaying()) {
    globe.pauseStory();
    $storyPlay.textContent = '▶ Play tour';
  } else {
    globe.setStory(WORLD_TOUR);
    globe.playStory();
    $storyPlay.textContent = '⏸ Pause';
  }
  renderStoryStatus();
});

$storyPrev.addEventListener('click', () => {
  globe?.prevScene();
  renderStoryStatus();
});

$storyNext.addEventListener('click', () => {
  globe?.nextScene();
  renderStoryStatus();
});
```

- [ ] **Step 3: Subscribe the demo to story events for status updates**

Inside `buildGlobe`, after the existing `globe.on('countryClick', ...)`, add:

```ts
  globe.on('sceneEnter', () => renderStoryStatus());
  globe.on('sceneExit', () => renderStoryStatus());
  globe.on('storyComplete', () => {
    $storyPlay.textContent = '▶ Play tour';
    renderStoryStatus();
  });
```

- [ ] **Step 4: Rebuild core + manual visual verification**

```bash
pnpm --filter @your-globe/core build
```

Open http://localhost:5173/. Click "▶ Play tour":

- Scene 1 (intro): camera flies to (lat 20, lng 0), gold popup
- Scene 2 (europe): focuses Poland, blue popup near Warsaw, country highlighted
- Scene 3-5 advance every ~4.5s with respective focus + popup
- After Oceania (last), loops back to intro
- ⏭ ⏮ skip scenes manually
- Pause (▶ → ⏸) freezes auto-advance
- Status text updates with current scene id + playing state

- [ ] **Step 5: Commit**

```bash
git add examples/vanilla-demo/index.html examples/vanilla-demo/src/main.ts
git commit -m "feat(demo): World Tour story + Story HUD controls"
```

---

## Task 6: FEATURES.md update + final verification

**Files:**
- Modify: `FEATURES.md`

- [ ] **Step 1: Flip status flags**

In `FEATURES.md`, find the "4.8 Story / narrative engine" subsection. Replace these specific lines:

```
- **Scene definition (declarative)** `[v1·GLOBAL·M]` 🌟 — `scenes: [{ id, cameraTo, highlights, popup, duration, transition }]`.
- **Auto-playback** `[v1·GLOBAL·M]` — `autoPlay: true`, `loop: boolean`, `delay: number`.
- **Manual controls** `[v1·GLOBAL·S]` — `play()`, `pause()`, `next()`, `prev()`, `goTo(sceneId)`.
- **Scene events** `[v1·EVENT·S]` — `onSceneEnter`, `onSceneExit`, `onSceneTransition`.
- **Easing per transition** `[v1·GLOBAL·S]` — `easing: 'easeInOutCubic' | 'linear' | function`.
- **Highlight stack** `[v1·GLOBAL·S]` — kraje/markery pokolorowane per scena, smooth restore.
```

with:

```
- **Scene definition (declarative)** `[v1·GLOBAL·M·built]` 🌟 — `globe.setStory({ scenes: [{ id, duration, transitionDuration?, easing?, flyTo?, focusOnCountry?, activeCountry?, popup? }] })`.
- **Auto-playback** `[v1·GLOBAL·M·built]` — `autoPlay: true`, `loop: true`, `startAt: sceneId`.
- **Manual controls** `[v1·GLOBAL·S·built]` — `playStory()`, `pauseStory()`, `nextScene()`, `prevScene()`, `goToScene(id)`, `getCurrentScene()`, `isStoryPlaying()`.
- **Scene events** `[v1·EVENT·S·built]` — `sceneEnter`, `sceneExit`, `storyComplete` z payload `{ scene, index }`.
- **Easing per transition** `[v1·GLOBAL·S·built]` — `scene.easing: EasingFunction`.
- **Highlight stack** `[v1·GLOBAL·S]` — kraje/markery pokolorowane per scena, smooth restore (active country wired; multi-highlight stack to do separately).
```

- [ ] **Step 2: Workspace verification**

```bash
pnpm test
pnpm build
pnpm typecheck
```

Expected: 63 tests pass; 5/5 builds; 5/5 typecheck.

- [ ] **Step 3: Branch summary**

```bash
git log --oneline main..HEAD
```

Expected: ~6 commits (one per task; Task 4 is one commit).

- [ ] **Step 4: Commit**

```bash
git add FEATURES.md
git commit -m "docs: mark story engine core scenes/events/controls as built"
```

---

## Self-review notes

1. **Spec coverage:** Plan covers FEATURES.md §4.8 *Scene definition*, *Auto-playback*, *Manual controls*, *Scene events*, *Easing per transition* — all flip to `[built]`. *Highlight stack* notes that single-active-country wiring ships now and multi-highlight is deferred. *Scrollytelling*, *Branching*, *Audio sync*, *WYSIWYG editor* remain explicitly deferred (FEATURES.md unchanged for those).
2. **Placeholder scan:** No "TBD"/"implement later"/"add error handling". All code blocks are concrete.
3. **Type consistency:** `SceneConfig`, `StoryConfig`, `StorySceneEvent`, `StoryCompleteEvent`, `StoryGlobeAdapter`, `StoryController`, `setStoryPopup`, `emitSceneEnter/Exit/storyComplete` names appear identically across all tasks. Adapter method shapes match controller usage.
4. **Scope check:** Single subsystem (story orchestration over existing primitives). 6 tasks, ~3-5 working days for solo dev. Scene-scoped markers/arcs explicitly deferred to keep scope tight.
