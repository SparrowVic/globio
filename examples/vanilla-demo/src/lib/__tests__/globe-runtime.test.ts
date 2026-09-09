import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@your-globe/core');
  vi.resetModules();
});

describe('lazy globe runtime loading', () => {
  it('shares a typed download failure so callers offer reload instead of futile remounts', async () => {
    vi.resetModules();
    const cause = new TypeError('Failed to fetch dynamically imported module');
    vi.doMock('@your-globe/core', () => { throw cause; });
    const { loadGlobeRuntime, isGlobeRuntimeLoadError, GlobeRuntimeLoadError } = await import('@/lib/globe-runtime');
    const first = loadGlobeRuntime();
    const error = await first.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(GlobeRuntimeLoadError);
    expect(isGlobeRuntimeLoadError(error)).toBe(true);
    expect(error).toMatchObject({ code: 'GLOBE_RUNTIME_LOAD_FAILED' });
    expect((error as Error).message).toContain('Reload the page');
    expect(loadGlobeRuntime()).toBe(first);
    await expect(loadGlobeRuntime()).rejects.toBe(error);
  });

  it('does not classify ordinary WebGL initialization errors as download failures', async () => {
    vi.resetModules();
    const error = new Error('WebGL is unavailable');
    const createGlobe = vi.fn(() => { throw error; });
    vi.doMock('@your-globe/core', () => ({ createGlobe }));
    const { loadGlobeRuntime, isGlobeRuntimeLoadError } = await import('@/lib/globe-runtime');
    const runtime = await loadGlobeRuntime();
    expect(() => runtime.createGlobe({ container: {} as HTMLElement })).toThrow(error);
    expect(isGlobeRuntimeLoadError(error)).toBe(false);
    expect(isGlobeRuntimeLoadError(null)).toBe(false);
    expect(await loadGlobeRuntime()).toBe(runtime);
  });
});
