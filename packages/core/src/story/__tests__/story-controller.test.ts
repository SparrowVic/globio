import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoryController } from '../story-controller';
import type { SceneConfig, StoryConfig, StoryGlobeAdapter } from '../types';

const makeMockAdapter = (): StoryGlobeAdapter & {
  calls: Array<{ method: string; args: unknown[] }>;
} => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
    };
  return {
    calls,
    flyTo: record('flyTo'),
    focusOnCountry: record('focusOnCountry'),
    setActiveCountry: record('setActiveCountry'),
    setAutoRotate: record('setAutoRotate'),
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

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
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

  it('repeated play calls keep a single timeline and pause cancels it', () => {
    const ctrl = new StoryController(makeMockAdapter());
    ctrl.setStory({ ...STORY, autoPlay: true });
    vi.advanceTimersByTime(400);
    ctrl.play();
    ctrl.play();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(600);
    expect(ctrl.getCurrentScene()?.id).toBe('b');
    ctrl.pause();
    vi.advanceTimersByTime(5000);
    expect(ctrl.getCurrentScene()?.id).toBe('b');
    expect(ctrl.isPlaying()).toBe(false);
  });

  it('does not report an empty story as playing', () => {
    const ctrl = new StoryController(makeMockAdapter());
    ctrl.setStory({ scenes: [], autoPlay: true });
    ctrl.play();
    expect(ctrl.isPlaying()).toBe(false);
    expect(ctrl.getCurrentScene()).toBeNull();
  });

  it('cancels a delayed camera move when the final scene ends', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ scenes: [{ ...SCENE_A, transitionDelay: 2000 }], autoPlay: true });
    vi.advanceTimersByTime(3000);
    expect(ctrl.isPlaying()).toBe(false);
    expect(adapter.calls.filter((call) => call.method === 'flyTo')).toEqual([]);
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

  it('allows a completion callback to start an independently advancing story', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    const firstStory: StoryConfig = { scenes: [SCENE_A], autoPlay: true };
    const secondStory: StoryConfig = { scenes: [SCENE_B, SCENE_C], autoPlay: true };
    const complete = adapter.emitStoryComplete;
    adapter.emitStoryComplete = (event) => {
      complete(event);
      if (event.story === firstStory) ctrl.setStory(secondStory);
    };

    ctrl.setStory(firstStory);
    vi.advanceTimersByTime(SCENE_A.duration);
    expect(ctrl.getCurrentScene()).toBe(SCENE_B);
    expect(ctrl.isPlaying()).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(SCENE_B.duration);
    expect(ctrl.getCurrentScene()).toBe(SCENE_C);
    vi.advanceTimersByTime(SCENE_C.duration);
    expect(ctrl.isPlaying()).toBe(false);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneExit')).toHaveLength(3);
    expect(adapter.calls.filter((call) => call.method === 'emitStoryComplete').map((call) => call.args[0]))
      .toEqual([{ story: firstStory }, { story: secondStory }]);
  });

  it('does not emit another exit or completion after a non-looping story finishes', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ scenes: [SCENE_C], autoPlay: true });
    vi.advanceTimersByTime(SCENE_C.duration);
    ctrl.next();
    ctrl.next();
    expect(ctrl.getCurrentScene()).toBe(SCENE_C);
    expect(ctrl.isPlaying()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    ctrl.setStory(null);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneExit')).toHaveLength(1);
    expect(adapter.calls.filter((call) => call.method === 'emitStoryComplete')).toHaveLength(1);
  });

  it('replays from the first scene after completion and enters it again', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true, startAt: 'c' });
    vi.advanceTimersByTime(SCENE_C.duration);
    expect(ctrl.getCurrentScene()).toBe(SCENE_C);
    ctrl.play();
    expect(ctrl.getCurrentScene()).toBe(SCENE_A);
    expect(ctrl.isPlaying()).toBe(true);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneExit')).toHaveLength(1);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneEnter').map((call) => call.args[0]))
      .toEqual([{ scene: SCENE_C, index: 2 }, { scene: SCENE_A, index: 0 }]);
    vi.advanceTimersByTime(SCENE_A.duration);
    expect(ctrl.getCurrentScene()).toBe(SCENE_B);
  });

  it('can navigate after completion without exiting the finished scene twice', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ ...STORY, autoPlay: true, startAt: 'c' });
    vi.advanceTimersByTime(SCENE_C.duration);
    ctrl.prev();
    expect(ctrl.getCurrentScene()).toBe(SCENE_B);
    expect(ctrl.isPlaying()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneExit')).toHaveLength(1);
    ctrl.goTo('c');
    ctrl.next();
    expect(adapter.calls.filter((call) => call.method === 'emitStoryComplete')).toHaveLength(2);
  });

  it('preserves a replacement story started from the last scene exit callback', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    const exit = adapter.emitSceneExit;
    adapter.emitSceneExit = (event) => {
      exit(event);
      if (event.scene.id === 'a') ctrl.setStory({ scenes: [SCENE_B, SCENE_C], autoPlay: true });
    };
    ctrl.setStory({ scenes: [SCENE_A], autoPlay: true });
    vi.advanceTimersByTime(SCENE_A.duration);
    expect(ctrl.getCurrentScene()).toBe(SCENE_B);
    expect(ctrl.isPlaying()).toBe(true);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneExit')).toHaveLength(1);
    // Loading a replacement during exit supersedes the old completion dispatch.
    expect(adapter.calls.filter((call) => call.method === 'emitStoryComplete')).toHaveLength(0);
    vi.advanceTimersByTime(SCENE_B.duration);
    expect(ctrl.getCurrentScene()).toBe(SCENE_C);
  });

  it('allows a completion handler to replay immediately without being stopped', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    const complete = adapter.emitStoryComplete;
    let replayed = false;
    adapter.emitStoryComplete = (event) => {
      complete(event);
      if (!replayed) {
        replayed = true;
        ctrl.play();
      }
    };
    ctrl.setStory({ scenes: [SCENE_C], autoPlay: true });
    vi.advanceTimersByTime(SCENE_C.duration);
    expect(ctrl.isPlaying()).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(SCENE_C.duration);
    expect(ctrl.isPlaying()).toBe(false);
    expect(adapter.calls.filter((call) => call.method === 'emitSceneEnter')).toHaveLength(2);
    expect(adapter.calls.filter((call) => call.method === 'emitStoryComplete')).toHaveLength(2);
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
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    expect(ctrl.isPlaying()).toBe(false);
  });

  it('resumes a paused scene with its full duration while delayed camera moves continue', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory({ scenes: [{ ...SCENE_A, transitionDelay: 700 }, SCENE_B], autoPlay: true });
    vi.advanceTimersByTime(400);
    ctrl.pause();
    vi.advanceTimersByTime(500);
    expect(adapter.calls.filter((call) => call.method === 'flyTo')).toHaveLength(1);
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    ctrl.play();
    vi.advanceTimersByTime(999);
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    vi.advanceTimersByTime(1);
    expect(ctrl.getCurrentScene()).toBe(SCENE_B);
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
    expect(ctrl.getCurrentScene()?.id).toBe('b');
  });

  it('prev goes back; cannot go before scene 0', () => {
    const adapter = makeMockAdapter();
    const ctrl = new StoryController(adapter);
    ctrl.setStory(STORY);
    ctrl.next();
    ctrl.next();
    ctrl.prev();
    expect(ctrl.getCurrentScene()?.id).toBe('a');
    ctrl.prev();
    expect(ctrl.getCurrentScene()?.id).toBe('a');
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
