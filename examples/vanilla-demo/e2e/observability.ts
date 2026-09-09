import { expect, type Page } from '@playwright/test';

interface ContextRecord {
  canvas: HTMLCanvasElement;
  createdAt: number;
  lost: boolean;
  renderer: string;
}

interface BrowserProbe {
  contexts: ContextRecord[];
  longTasks: { start: number; duration: number }[];
  lcp: number | null;
  cls: number;
  readyAt: number | null;
  hostMountedAt: number | null;
  frameGaps: number[];
}

declare global {
  interface Window { __globioProbe: BrowserProbe }
}

/** Observe browser APIs only; these checks do not require app-only test hooks. */
export async function observeBrowser(page: Page) {
  await page.addInitScript(() => {
    const probe: BrowserProbe = window.__globioProbe = {
      contexts: [], longTasks: [], lcp: null, cls: 0, readyAt: null, hostMountedAt: null, frameGaps: [],
    };
    const original = HTMLCanvasElement.prototype.getContext;
    const seen = new WeakSet<object>();
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      const context = original.apply(this, args);
      if ((args[0] === 'webgl' || args[0] === 'webgl2' || args[0] === 'experimental-webgl') && context && !seen.has(context)) {
        seen.add(context);
        const gl = context as WebGLRenderingContext;
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER));
        const record: ContextRecord = { canvas: this, createdAt: performance.now(), lost: false, renderer };
        probe.contexts.push(record);
        this.addEventListener('webglcontextlost', () => { record.lost = true; });
        this.addEventListener('webglcontextrestored', () => { record.lost = false; });
      }
      return context;
    } as typeof original;
    for (const type of ['longtask', 'largest-contentful-paint', 'layout-shift']) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (type === 'longtask') probe.longTasks.push({ start: entry.startTime, duration: entry.duration });
          if (type === 'largest-contentful-paint') probe.lcp = entry.startTime;
          if (type === 'layout-shift' && !(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
            probe.cls += (entry as PerformanceEntry & { value: number }).value;
          }
        }
      }).observe({ type, buffered: true });
    }
    const ready = new MutationObserver(() => {
      if (probe.hostMountedAt === null && document.querySelector('.home-globe-canvas, [data-studio-globe-host]')) {
        probe.hostMountedAt = performance.now();
      }
      if (probe.readyAt === null && document.querySelector('.home-globe-canvas.is-live, [data-testid="studio-status"][data-ready="true"]')) {
        probe.readyAt = performance.now();
      }
    });
    ready.observe(document, { subtree: true, attributes: true, childList: true });
    let previous = 0;
    const frame = (now: number) => {
      if (probe.readyAt !== null && previous) probe.frameGaps.push(now - previous);
      previous = now;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

export async function contextCounts(page: Page) {
  return page.evaluate(() => ({
    created: window.__globioProbe.contexts.length,
    live: window.__globioProbe.contexts.filter((context) => !context.lost).length,
    connected: window.__globioProbe.contexts.filter((context) => !context.lost && context.canvas.isConnected).length,
    detached: window.__globioProbe.contexts.filter((context) => !context.lost && !context.canvas.isConnected).length,
  }));
}

export async function expectHeroReady(page: Page) {
  await expect(page.locator('.home-globe-canvas.is-live canvas')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Save PNG', exact: true })).toBeEnabled();
}

export async function expectStudioReady(page: Page) {
  await expect(page.getByTestId('studio-status')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.locator('[data-studio-globe-host] canvas')).toBeVisible();
}

export async function metrics(page: Page) {
  return page.evaluate(() => {
    const probe = window.__globioProbe;
    const round = (value: number | null) => value === null ? null : Math.round(value * 10) / 10;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const firstContext = probe.contexts[0];
    const frames = [...probe.frameGaps].sort((a, b) => a - b);
    return {
      userAgent: navigator.userAgent,
      webGLRenderer: firstContext?.renderer ?? null,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      navigationToDOMContentLoadedMs: round(navigation.domContentLoadedEventEnd),
      firstContentfulPaintMs: round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null),
      largestContentfulPaintMs: round(probe.lcp),
      firstWebGLContextMs: round(firstContext?.createdAt ?? null),
      navigationToGlobeReadyMs: round(probe.readyAt),
      hostMountToGlobeReadyMs: round(probe.readyAt && probe.hostMountedAt ? probe.readyAt - probe.hostMountedAt : null),
      contextToGlobeReadyMs: round(firstContext && probe.readyAt ? probe.readyAt - firstContext.createdAt : null),
      cumulativeLayoutShift: Math.round(probe.cls * 10000) / 10000,
      requestCount: resources.length,
      resourceTransferBytes: resources.reduce((total, resource) => total + resource.transferSize, 0),
      javaScriptDecodedBytes: resources.filter((resource) => new URL(resource.name).pathname.endsWith('.js')).reduce((total, resource) => total + resource.decodedBodySize, 0),
      longTaskCount: probe.longTasks.length,
      longTaskTotalMs: round(probe.longTasks.reduce((total, task) => total + task.duration, 0)),
      maxLongTaskMs: round(Math.max(0, ...probe.longTasks.map((task) => task.duration))),
      // Browser scheduling, not rendered WebGL FPS (Globio deliberately caps FPS).
      browserAnimationFrameP95Ms: round(frames.length ? frames[Math.min(frames.length - 1, Math.floor(frames.length * 0.95))] : null),
      resources: resources.map((resource) => ({ path: new URL(resource.name).pathname, bytes: resource.decodedBodySize })),
    };
  });
}
