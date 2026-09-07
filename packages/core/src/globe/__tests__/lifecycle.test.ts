import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGlobe } from '../create-globe';

const lifecycle = vi.hoisted(() => ({
  loadCountries: vi.fn(),
  build: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  compileAsync: vi.fn(),
  compileAvailable: true,
  holdRendering: vi.fn(),
  dispose: vi.fn(),
  gpuDispose: vi.fn(),
  sceneDispose: vi.fn(),
  overlayDispose: vi.fn(),
  removeCanvas: vi.fn(),
  destroyControls: vi.fn(),
  destroyRaycaster: vi.fn(),
}));

vi.mock('../../data/geo-loader', () => ({ loadCountries: lifecycle.loadCountries }));

vi.mock('../../kinds/registry', async () => {
  const { Group } = await import('three');
  class Layer {
    group = new Group();
    object = this.group;
    mesh = this.group;
    dispose() { lifecycle.gpuDispose(); }
    setVisible() {}
    setResolution() {}
    registerFeatures() {}
    setEnabled() {}
  }
  class LabelsLayer extends Layer {
    override dispose() { lifecycle.overlayDispose(); }
  }
  return {
    PRESET_DEFAULT_KIND: {},
    KIND_MODULES: {
      outline: {
        kind: 'outline',
        hasCountryInteraction: true,
        build: lifecycle.build,
        layers: {
          AtmosphereLayer: Layer,
          MarkersLayer: Layer,
          ArcsLayer: Layer,
          SelectionLayer: Layer,
          LabelsLayer,
        },
      },
    },
  };
});

vi.mock('../../renderer/scene-manager', async () => {
  const { PerspectiveCamera, Scene } = await import('three');
  return {
    SceneManager: class {
      scene = new Scene();
      camera = new PerspectiveCamera(45, 2, 0.1, 100);
      renderer = {
        domElement: { style: {}, remove: lifecycle.removeCanvas },
        get compileAsync() {
          return lifecycle.compileAvailable ? lifecycle.compileAsync : undefined;
        },
      };
      start = lifecycle.start;
      stop = lifecycle.stop;
      constructor() { this.camera.position.set(0, 0, 3); }
      holdRendering = lifecycle.holdRendering;
      setPostFx() {}
      destroy = lifecycle.sceneDispose;
      getCanvas() { return this.renderer.domElement; }
    },
  };
});

vi.mock('../../renderer/postfx/pipeline', () => ({
  PostFxPipeline: class {},
}));
vi.mock('../../renderer/globe-mesh', async () => {
  const { Group } = await import('three');
  return { GlobeMesh: class { mesh = new Group(); dispose = lifecycle.gpuDispose; } };
});
vi.mock('../../renderer/countries-picking-layer', async () => {
  const { Group } = await import('three');
  return { CountriesPickingLayer: class { group = new Group(); dispose = lifecycle.gpuDispose; } };
});
vi.mock('../../renderer/country-tooltip', () => ({
  CountryTooltip: class { dispose = lifecycle.overlayDispose; },
}));
vi.mock('../../renderer/marker-tooltip', () => ({
  MarkerTooltip: class { dispose = lifecycle.overlayDispose; },
}));
vi.mock('../../renderer/html-markers-layer', () => ({
  HtmlMarkersLayer: class { dispose = lifecycle.overlayDispose; },
}));
vi.mock('../../interaction/controls', () => ({
  GlobeControls: class { destroy = lifecycle.destroyControls; },
}));
vi.mock('../../interaction/raycaster', () => ({
  PointerRaycaster: class { setTargets() {} destroy = lifecycle.destroyRaycaster; },
}));

const container = { clientWidth: 800, clientHeight: 400 } as HTMLElement;
const instances: ReturnType<typeof createGlobe>[] = [];
const makeGlobe = () => {
  const globe = createGlobe({ container });
  instances.push(globe);
  return globe;
};

beforeEach(() => {
  vi.resetAllMocks();
  lifecycle.compileAvailable = true;
  lifecycle.compileAsync.mockResolvedValue(undefined);
  lifecycle.loadCountries.mockResolvedValue([]);
  lifecycle.build.mockReturnValue({ dispose: lifecycle.dispose });
});

afterEach(() => {
  instances.splice(0).forEach((globe) => globe.destroy());
});

describe('globe lifecycle', () => {
  it('loads default geometry and builds the kind when countries is omitted', async () => {
    const globe = makeGlobe();
    const ready = vi.fn();
    const error = vi.fn();
    globe.on('ready', ready);
    globe.on('error', error);

    globe.mount();

    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
    expect(lifecycle.start).toHaveBeenCalledOnce();
    expect(lifecycle.loadCountries).toHaveBeenCalledWith({ resolution: 'medium' });
    expect(lifecycle.build).toHaveBeenCalledWith(expect.objectContaining({
      features: [],
      config: { container },
    }));
    expect(error).not.toHaveBeenCalled();
  });

  it('does not build or emit ready when destroyed before geometry finishes loading', async () => {
    let finish!: (features: []) => void;
    lifecycle.loadCountries.mockReturnValue(new Promise<[]>((resolve) => { finish = resolve; }));
    const globe = makeGlobe();
    const ready = vi.fn();
    globe.on('ready', ready);
    globe.mount();
    globe.destroy();
    finish([]);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(lifecycle.build).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
  });

  it('ignores repeated mount calls before and after initialization', async () => {
    const globe = makeGlobe();
    const ready = vi.fn();
    globe.on('ready', ready);
    globe.mount();
    globe.mount();

    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
    globe.mount();
    expect(lifecycle.start).toHaveBeenCalledOnce();
    expect(lifecycle.loadCountries).toHaveBeenCalledOnce();
    expect(lifecycle.build).toHaveBeenCalledOnce();
  });

  it('emits an error without ready when country loading fails', async () => {
    const failure = new Error('Geometry unavailable');
    lifecycle.loadCountries.mockRejectedValue(failure);
    const globe = makeGlobe();
    const error = vi.fn();
    const ready = vi.fn();
    globe.on('error', error);
    globe.on('ready', ready);
    globe.mount();

    await vi.waitFor(() => expect(error).toHaveBeenCalledWith(failure));
    expect(lifecycle.build).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
  });

  it('does not restart an instance after destroy', () => {
    const globe = makeGlobe();
    globe.destroy();
    globe.mount();
    expect(lifecycle.start).not.toHaveBeenCalled();
    expect(lifecycle.loadCountries).not.toHaveBeenCalled();
    expect(lifecycle.gpuDispose).toHaveBeenCalled();
    expect(lifecycle.sceneDispose).toHaveBeenCalledOnce();
  });

  it('keeps materials alive for compilation while removing a destroyed globe immediately', async () => {
    let currentProgram: { isReady: () => boolean } | undefined = { isReady: () => true };
    let checkMaterialsReady!: () => void;
    lifecycle.gpuDispose.mockImplementation(() => { currentProgram = undefined; });
    lifecycle.compileAsync.mockImplementation(() => new Promise((resolve) => {
      // Mirrors Three.js compileAsync's later material-properties lookup.
      checkMaterialsReady = () => {
        if (currentProgram!.isReady()) resolve(undefined);
      };
    }));
    const globe = makeGlobe();
    const ready = vi.fn();
    const error = vi.fn();
    globe.on('ready', ready);
    globe.on('error', error);
    globe.mount();
    await vi.waitFor(() => expect(lifecycle.compileAsync).toHaveBeenCalledOnce());

    globe.destroy();
    globe.destroy();
    expect(lifecycle.stop).toHaveBeenCalledOnce();
    expect(lifecycle.removeCanvas).toHaveBeenCalledOnce();
    expect(lifecycle.destroyControls).toHaveBeenCalledOnce();
    expect(lifecycle.destroyRaycaster).toHaveBeenCalledOnce();
    expect(lifecycle.overlayDispose).toHaveBeenCalled();
    expect(lifecycle.gpuDispose).not.toHaveBeenCalled();
    expect(lifecycle.dispose).not.toHaveBeenCalled();
    expect(lifecycle.sceneDispose).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(lifecycle.gpuDispose).not.toHaveBeenCalled();
    expect(checkMaterialsReady).not.toThrow();
    await vi.waitFor(() => expect(lifecycle.sceneDispose).toHaveBeenCalledOnce());
    expect(lifecycle.gpuDispose).toHaveBeenCalled();
    expect(lifecycle.dispose).toHaveBeenCalledOnce();
    expect(ready).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('releases deferred resources when shader compilation rejects without emitting after destroy', async () => {
    let rejectCompilation!: (error: Error) => void;
    lifecycle.compileAsync.mockReturnValue(new Promise((_, reject) => { rejectCompilation = reject; }));
    const globe = makeGlobe();
    const ready = vi.fn();
    const error = vi.fn();
    globe.on('ready', ready);
    globe.on('error', error);
    globe.mount();
    await vi.waitFor(() => expect(lifecycle.compileAsync).toHaveBeenCalledOnce());

    globe.destroy();
    expect(lifecycle.sceneDispose).not.toHaveBeenCalled();
    rejectCompilation(new Error('Shader compilation failed'));
    await vi.waitFor(() => expect(lifecycle.sceneDispose).toHaveBeenCalledOnce());
    expect(lifecycle.dispose).toHaveBeenCalledOnce();
    expect(ready).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('destroys resources synchronously after shader compilation has completed', async () => {
    const globe = makeGlobe();
    const ready = vi.fn();
    globe.on('ready', ready);
    globe.mount();
    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());

    globe.destroy();
    expect(lifecycle.sceneDispose).toHaveBeenCalledOnce();
    expect(lifecycle.dispose).toHaveBeenCalledOnce();
    expect(lifecycle.gpuDispose).toHaveBeenCalled();
  });

  it('does not defer destruction when the renderer has no async compiler', async () => {
    lifecycle.compileAvailable = false;
    const globe = makeGlobe();
    globe.mount();
    await vi.waitFor(() => expect(lifecycle.build).toHaveBeenCalledOnce());

    globe.destroy();
    expect(lifecycle.compileAsync).not.toHaveBeenCalled();
    expect(lifecycle.holdRendering).not.toHaveBeenCalled();
    expect(lifecycle.sceneDispose).toHaveBeenCalledOnce();
    expect(lifecycle.dispose).toHaveBeenCalledOnce();
  });

  it('clears country data queued before initialization instead of mounting a stale choropleth', async () => {
    const choropleth = vi.fn(() => ({ type: 'choropleth', dispose() {} }));
    lifecycle.build.mockReturnValue({
      dispose: lifecycle.dispose,
      decorations: { dataLayers: { choropleth } },
    });
    const globe = makeGlobe();
    const ready = vi.fn();
    globe.on('ready', ready);
    globe.mount();
    globe.setCountryData({ '616': { value: 5 } });
    globe.setCountryData(null);

    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
    expect(choropleth).not.toHaveBeenCalled();
    expect(globe.getDataLayer()).toBeNull();
    expect(globe.getCountryData()).toBeNull();
  });

  it('preserves a queued heatmap when country data is cleared before initialization', async () => {
    const choropleth = vi.fn(() => ({ type: 'choropleth', dispose() {} }));
    const heatmap = vi.fn(() => ({ type: 'heatmap', dispose() {} }));
    lifecycle.build.mockReturnValue({
      dispose: lifecycle.dispose,
      decorations: { dataLayers: { choropleth, heatmap } },
    });
    const layer = { type: 'heatmap' as const, data: [{ position: [0, 0] as const, value: 3 }] };
    const globe = makeGlobe();
    const ready = vi.fn();
    globe.on('ready', ready);
    globe.mount();
    globe.setCountryData({ '616': { value: 5 } });
    globe.setDataLayer(layer);
    globe.setCountryData(null);

    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
    expect(choropleth).not.toHaveBeenCalled();
    expect(heatmap).toHaveBeenCalledOnce();
    expect(globe.getDataLayer()).toBe(layer);
    expect(globe.getCountryData()).toBeNull();
  });

  it('honors an explicit queued layer removal while retaining the bound country data', async () => {
    const choropleth = vi.fn(() => ({ type: 'choropleth', dispose() {} }));
    lifecycle.build.mockReturnValue({
      dispose: lifecycle.dispose,
      decorations: { dataLayers: { choropleth } },
    });
    const data = { '616': { value: 5 } };
    const globe = makeGlobe();
    const ready = vi.fn();
    globe.on('ready', ready);
    globe.mount();
    globe.setCountryData(data);
    globe.setDataLayer(null);

    await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
    expect(choropleth.mock.calls.length).toBe(0);
    expect(globe.getDataLayer()).toBeNull();
    expect(globe.getCountryData()).toEqual(data);
  });
});
