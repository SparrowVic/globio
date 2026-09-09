type GlobeRuntime = typeof import('@your-globe/core');

let runtimePromise: Promise<GlobeRuntime> | undefined;

export class GlobeRuntimeLoadError extends Error {
  public readonly code = 'GLOBE_RUNTIME_LOAD_FAILED';

  public constructor(cause: unknown) {
    super('The globe engine could not be downloaded. Reload the page to try again.', { cause });
    this.name = 'GlobeRuntimeLoadError';
  }
}

export const isGlobeRuntimeLoadError = (error: unknown): error is GlobeRuntimeLoadError =>
  error instanceof GlobeRuntimeLoadError;

/** Keep WebGL and its renderer off the page's initial render path. */
export function loadGlobeRuntime(): Promise<GlobeRuntime> {
  runtimePromise ??= import('@your-globe/core').catch((error: unknown) => {
    // Browsers may cache an ES-module download failure for this document.
    // Remounting a preview cannot reliably retry the same import URL; the
    // caller must offer an explicit reload instead of an endless retry loop.
    throw new GlobeRuntimeLoadError(error);
  });
  return runtimePromise;
}
