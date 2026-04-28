import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    expect(ctrl.getCurrentScene()?.id).toBe('a');
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
