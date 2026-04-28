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
    const transitionOptions: { duration?: number; easing?: NonNullable<SceneConfig['easing']> } = {
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
