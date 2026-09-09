import { Group, type Vector2 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneManager } from '../scene-manager';
import type { PostFxPipeline } from '../postfx/pipeline';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = { parentElement: null };
      size = new actual.Vector2();
      pixelRatio = 1;
      clearAlpha = 1;
      render = vi.fn();
      dispose = vi.fn();
      forceContextLoss = vi.fn();
      constructor(parameters: Record<string, unknown>) { rendererParameters.push(parameters); }
      setClearAlpha(value: number) { this.clearAlpha = value; }
      getClearAlpha() { return this.clearAlpha; }
      setSize(width: number, height: number) { this.size.set(width, height); }
      getSize(target: Vector2) { return target.copy(this.size); }
      setPixelRatio(value: number) { this.pixelRatio = value; }
      getPixelRatio() { return this.pixelRatio; }
    },
  };
});

let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let resizeCallbacks: Array<() => void>;
let intersectionCallbacks: Array<(visible: boolean) => void>;
let page: EventTarget & { hidden: boolean };
let rendererParameters: Array<Record<string, unknown>>;
const scenes: SceneManager[] = [];

beforeEach(() => {
  nextFrame = 0;
  frames = new Map();
  resizeCallbacks = [];
  intersectionCallbacks = [];
  rendererParameters = [];
  page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', page);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      resizeCallbacks.push(() => callback([], this as unknown as ResizeObserver));
    }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) {
      intersectionCallbacks.push((visible) => callback(
        [{ isIntersecting: visible } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      ));
    }
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  scenes.splice(0).forEach((scene) => scene.destroy());
  vi.unstubAllGlobals();
});

const setup = (backgroundColor: string | null = null) => {
  const container = { clientWidth: 800, clientHeight: 400, appendChild: vi.fn() };
  const onRender = vi.fn();
  const onResize = vi.fn();
  const scene = new SceneManager({
    container: container as unknown as HTMLElement,
    backgroundColor,
    performance: {
      antialias: true, pixelRatio: 1, maxFps: 40,
      adaptiveQuality: false, pauseWhenHidden: true,
    },
    onRender,
    onResize,
  });
  scenes.push(scene);
  return { scene, container, onRender, onResize, render: vi.mocked(scene.renderer.render) };
};

const stepFrame = (now = performance.now() + 50) => {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(now));
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

describe('scene disposal', () => {
  it('releases the WebGL context after disposing renderer resources, only once', () => {
    const { scene, render } = setup();
    scene.start();
    scene.destroy();
    scene.destroy();

    const dispose = vi.mocked(scene.renderer.dispose);
    const release = vi.mocked(scene.renderer.forceContextLoss);
    expect(dispose).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(release.mock.invocationCallOrder[0]!);
    stepFrame();
    expect(render).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
});

describe('canvas backgrounds', () => {
  it('keeps every renderer alpha-capable and changes clear alpha live', () => {
    const { scene } = setup('#102030');
    expect(rendererParameters[0]).toMatchObject({ alpha: true, antialias: true });
    expect(scene.getCanvasBackground()).toBe('#102030');
    expect(scene.scene.background).not.toBeNull();
    expect(scene.renderer.getClearAlpha()).toBe(1);

    scene.setCanvasBackground(null);
    expect(scene.getCanvasBackground()).toBeNull();
    expect(scene.scene.background).toBeNull();
    expect(scene.renderer.getClearAlpha()).toBe(0);

    scene.setCanvasBackground('rebeccapurple');
    expect(scene.getCanvasBackground()).toBe('rebeccapurple');
    expect(scene.scene.background).not.toBeNull();
    expect(scene.renderer.getClearAlpha()).toBe(1);
  });

  it('keeps an attached post-processing target in the same alpha mode', () => {
    const { scene } = setup('#102030');
    const pipeline = {
      setSize: vi.fn(),
      setTransparent: vi.fn(),
      dispose: vi.fn(),
      render: vi.fn(),
    };

    scene.setPostFx(pipeline as unknown as PostFxPipeline);
    expect(pipeline.setTransparent).toHaveBeenLastCalledWith(false);
    scene.setCanvasBackground(null);
    expect(pipeline.setTransparent).toHaveBeenLastCalledWith(true);
  });

  it('redraws a live background change while paused', () => {
    const { scene, onRender, render } = setup('#102030');
    scene.setPaused(true);
    scene.start();
    onRender.mockClear();
    render.mockClear();

    scene.setCanvasBackground(null);
    scene.requestRender();

    expect(onRender).toHaveBeenCalledOnce();
    expect(onRender).toHaveBeenCalledWith(0);
    expect(render).toHaveBeenCalledOnce();
  });
});

describe('paused scene rendering', () => {
  it('renders a still frame when paused before the first scheduled frame', () => {
    const { scene, onRender, render } = setup();
    scene.start();
    scene.setPaused(true);

    expect(onRender.mock.calls).toEqual([[0]]);
    expect(render.mock.calls).toEqual([[scene.scene, scene.camera]]);
    stepFrame();
    expect(frames.size).toBe(0);
    expect(render).toHaveBeenCalledOnce();
  });

  it('renders on start when paused before mounting, without starting animation', () => {
    const { scene, onRender, render } = setup();
    scene.setPaused(true);
    expect(render).not.toHaveBeenCalled();

    scene.start();
    expect(onRender.mock.calls).toEqual([[0]]);
    expect(render).toHaveBeenCalledOnce();
    stepFrame();
    expect(frames.size).toBe(0);
  });

  it('redraws a resized paused buffer through postprocessing after resize uniforms update', () => {
    const { scene, container, onRender, onResize, render } = setup();
    const events: string[] = [];
    const pipeline = {
      setSize: vi.fn(), setTransparent: vi.fn(), dispose: vi.fn(),
      render: vi.fn(() => events.push('draw')),
    };
    scene.setPostFx(pipeline as unknown as PostFxPipeline);
    scene.setPaused(true);
    scene.start();
    stepFrame();
    events.length = 0;
    onRender.mockImplementation((delta) => events.push(`update:${delta}`));
    onResize.mockImplementation(() => events.push('resize'));
    container.clientWidth = 300;
    container.clientHeight = 600;

    resizeCallbacks[0]!();

    expect(scene.camera.aspect).toBe(0.5);
    expect(pipeline.setSize).toHaveBeenLastCalledWith(300, 600, 1);
    expect(events).toEqual(['resize', 'update:0', 'draw']);
    expect(render).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it('draws completed kind geometry only after every shader hold settles', async () => {
    const { scene, onRender, render } = setup();
    scene.setPaused(true);
    scene.start();
    stepFrame();
    render.mockClear();
    onRender.mockClear();
    const compiled = deferred();
    const otherWork = deferred();
    scene.holdRendering(compiled.promise);
    scene.holdRendering(otherWork.promise);
    const kind = new Group();
    kind.name = 'completed-kind';
    scene.scene.add(kind);
    scene.resize();
    const drawnGeometry: string[][] = [];
    render.mockImplementation((value) => {
      drawnGeometry.push(value.children.map((child) => child.name));
    });

    compiled.resolve();
    await compiled.promise;
    expect(render).not.toHaveBeenCalled();
    otherWork.reject(new Error('optional compilation failed'));
    await otherWork.promise.catch(() => undefined);

    expect(onRender.mock.calls).toEqual([[0]]);
    expect(drawnGeometry).toEqual([['completed-kind']]);
    expect(frames.size).toBe(0);
  });

  it('defers a transition into pause until compilation completes', async () => {
    const { scene, onRender, render } = setup();
    scene.start();
    const compiled = deferred();
    scene.holdRendering(compiled.promise);
    scene.setPaused(true);
    stepFrame();
    expect(render).not.toHaveBeenCalled();

    compiled.resolve();
    await compiled.promise;

    expect(onRender.mock.calls).toEqual([[0]]);
    expect(render).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it.each(['stop', 'destroy'] as const)('does not redraw or wake after %s during compilation', async (action) => {
    const { scene, render } = setup();
    scene.start();
    const compiled = deferred();
    scene.holdRendering(compiled.promise);
    scene.setPaused(true);
    scene[action]();
    resizeCallbacks[0]!();

    compiled.resolve();
    await compiled.promise;

    expect(render).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it('defers paused redraws while hidden and draws once visible again', () => {
    const { scene, render, onRender } = setup();
    intersectionCallbacks[0]!(false);
    scene.setPaused(true);
    scene.start();
    scene.resize();
    stepFrame();
    expect(render).not.toHaveBeenCalled();

    intersectionCallbacks[0]!(true);
    expect(onRender.mock.calls).toEqual([[0]]);
    page.hidden = true;
    page.dispatchEvent(new Event('visibilitychange'));
    scene.resize();
    expect(render).toHaveBeenCalledOnce();
    page.hidden = false;
    page.dispatchEvent(new Event('visibilitychange'));

    expect(render).toHaveBeenCalledTimes(2);
    expect(onRender.mock.calls).toEqual([[0], [0]]);
    expect(frames.size).toBe(0);
  });

  it('keeps normal frames scheduled when unpaused and resumes after a pause', () => {
    const { scene, onRender, render } = setup();
    scene.start();
    expect(render).not.toHaveBeenCalled();
    stepFrame();
    expect(onRender.mock.calls[0]![0]).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
    scene.setPaused(true);
    stepFrame();
    expect(frames.size).toBe(0);
    onRender.mockClear();

    scene.setPaused(false);
    stepFrame(performance.now() + 100);

    expect(onRender.mock.calls[0]![0]).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
  });
});
