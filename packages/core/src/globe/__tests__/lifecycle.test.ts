import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGlobe } from '../create-globe';

const lifecycle = vi.hoisted(() => ({
  loadCountries: vi.fn(),
  build: vi.fn(),
  start: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('../../data/geo-loader', () => ({ loadCountries: lifecycle.loadCountries }));

vi.mock('../../kinds/registry', async () => {
  const { Group } = await import('three');
  class Layer {
    group = new Group();
    object = this.group;
    mesh = this.group;
    dispose() {}
    setVisible() {}
    setResolution() {}
    registerFeatures() {}
    setEnabled() {}
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
          LabelsLayer: Layer,
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
      renderer = { domElement: { style: {} } };
      start = lifecycle.start;
      constructor() { this.camera.position.set(0, 0, 3); }
      holdRendering() {}
      setPostFx() {}
      destroy() {}
      getCanvas() { return this.renderer.domElement; }
    },
  };
});

vi.mock('../../renderer/postfx/pipeline', () => ({
  PostFxPipeline: class {},
}));
vi.mock('../../renderer/globe-mesh', async () => {
  const { Group } = await import('three');
  return { GlobeMesh: class { mesh = new Group(); dispose() {} } };
});
vi.mock('../../renderer/countries-picking-layer', async () => {
  const { Group } = await import('three');
  return { CountriesPickingLayer: class { group = new Group(); dispose() {} } };
});
vi.mock('../../renderer/country-tooltip', () => ({
  CountryTooltip: class { dispose() {} },
}));
vi.mock('../../renderer/marker-tooltip', () => ({
  MarkerTooltip: class { dispose() {} },
}));
vi.mock('../../renderer/html-markers-layer', () => ({
  HtmlMarkersLayer: class { dispose() {} },
}));
vi.mock('../../interaction/controls', () => ({
  GlobeControls: class { destroy() {} },
}));
vi.mock('../../interaction/raycaster', () => ({
  PointerRaycaster: class { setTargets() {} destroy() {} },
}));

const container = { clientWidth: 800, clientHeight: 400 } as HTMLElement;
const instances: ReturnType<typeof createGlobe>[] = [];
const makeGlobe = () => {
  const globe = createGlobe({ container });
  instances.push(globe);
  return globe;
};

beforeEach(() => {
  vi.clearAllMocks();
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
  });
});
