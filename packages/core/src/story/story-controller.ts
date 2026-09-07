import { resolveEasing } from '../utils/easing';
import type { EasingFunction } from '../types';
import type {
  SceneConfig,
  StoryConfig,
  StoryGlobeAdapter,
  StorySceneEvent,
} from './types';

interface TransitionOptions {
  duration?: number;
  easing?: EasingFunction;
  elevation?: number;
}

export class StoryController {
  private story: StoryConfig | null = null;
  private currentIndex = -1;
  private playing = false;
  private completed = false;
  private sceneEntered = false;
  // Event handlers can synchronously load a story or navigate to another scene.
  private revision = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private delayTimeoutId: ReturnType<typeof setTimeout> | null = null;

  public constructor(private readonly adapter: StoryGlobeAdapter) {}

  public setStory(story: StoryConfig | null): void {
    const revision = ++this.revision;
    this.cancelTimer();
    this.cancelDelayTimer();
    this.playing = false;
    this.exitCurrentScene();
    if (this.revision !== revision) return;
    this.story = story;
    this.currentIndex = -1;
    this.completed = false;
    if (!story) return;
    if (story.startAt) {
      const idx = story.scenes.findIndex((s) => s.id === story.startAt);
      if (idx >= 0 && !this.goToIndex(idx)) return;
    }
    if (story.autoPlay) this.play();
  }

  public play(): void {
    if (!this.story?.scenes.length || this.playing) return;
    this.playing = true;
    if (this.currentIndex < 0 || this.completed) {
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
    if (!this.story?.scenes.length || this.completed) return;
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
    // Finish before publishing events so a handler can start another story.
    const completedStory = this.story;
    const revision = ++this.revision;
    this.completed = true;
    this.playing = false;
    this.cancelTimer();
    this.cancelDelayTimer();
    this.exitCurrentScene();
    if (this.revision !== revision) return;
    this.adapter.emitStoryComplete({ story: completedStory });
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

  private goToIndex(idx: number): boolean {
    const scene = this.story?.scenes[idx];
    if (!scene) return false;
    const revision = ++this.revision;
    this.cancelTimer();
    this.cancelDelayTimer();
    this.exitCurrentScene();
    if (this.revision !== revision) return false;
    this.currentIndex = idx;
    this.completed = false;
    this.sceneEntered = true;
    this.enterScene(scene, idx);
    if (this.revision !== revision) return false;
    if (this.playing) this.scheduleAdvance();
    return true;
  }

  private enterScene(scene: SceneConfig, index: number): void {
    const transitionOptions: TransitionOptions = {
      duration: scene.transitionDuration ?? Math.min(1500, Math.floor(scene.duration * 0.6)),
    };
    const easing = resolveEasing(scene.easing);
    if (easing) transitionOptions.easing = easing;
    if (scene.transitionElevation !== undefined) {
      transitionOptions.elevation = scene.transitionElevation;
    }

    const moveCamera = (): void => {
      if (scene.focusOnCountry) {
        const focus = scene.focusOnCountry;
        if (typeof focus === 'string') {
          this.adapter.focusOnCountry(focus, transitionOptions);
        } else {
          this.adapter.focusOnCountry(focus.id, {
            ...transitionOptions,
            ...(focus.padding !== undefined && { padding: focus.padding }),
          });
        }
      } else if (scene.flyTo) {
        this.adapter.flyTo(scene.flyTo.position, scene.flyTo.distance, transitionOptions);
      }
    };

    const delay = scene.transitionDelay ?? 0;
    if (delay > 0) {
      this.delayTimeoutId = setTimeout(() => {
        this.delayTimeoutId = null;
        moveCamera();
      }, delay);
    } else {
      moveCamera();
    }

    if (scene.activeCountry !== undefined) {
      this.adapter.setActiveCountry(scene.activeCountry);
    }
    if (scene.autoRotate !== undefined) {
      this.adapter.setAutoRotate(scene.autoRotate);
    }

    this.adapter.setStoryPopup(scene.popup ?? null);

    const event: StorySceneEvent = { scene, index };
    this.adapter.emitSceneEnter(event);
  }

  private exitCurrentScene(): void {
    if (!this.sceneEntered || !this.story || this.currentIndex < 0) return;
    const scene = this.story.scenes[this.currentIndex];
    if (!scene) return;
    const index = this.currentIndex;
    this.sceneEntered = false;
    this.adapter.setStoryPopup(null);
    this.adapter.emitSceneExit({ scene, index });
  }

  private scheduleAdvance(): void {
    this.cancelTimer();
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

  private cancelDelayTimer(): void {
    if (this.delayTimeoutId !== null) {
      clearTimeout(this.delayTimeoutId);
      this.delayTimeoutId = null;
    }
  }
}
