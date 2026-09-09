# Browser regression and performance checks

These tests exercise the production demo with the real Globio WebGL engine. The
only intentional mock is the no-WebGL recovery scenario. Tests run sequentially
to avoid competing for the GPU and use port **4174**, separate from development.

From the repository root:

```sh
pnpm install
pnpm --filter vanilla-demo exec playwright install chromium
pnpm --filter @your-globe/core build
pnpm --filter vanilla-demo build
pnpm --filter vanilla-demo typecheck:e2e
pnpm --filter vanilla-demo test:bundle
pnpm --filter vanilla-demo test:e2e
```

Build again after app or engine changes: the preview serves `dist`, not source.
`GLOBIO_TEST_PORT=4175` selects another isolated port. On CI a server already
listening there is an error. Locally an existing production preview can be reused.

The suite covers six globe styles and a theme change, actual PNG download and
dimensions, all five data examples, keyboard tabs, live WebGL context cleanup,
home → Studio → home, Studio import/export, custom-theme live edits/save/cancel,
repeated snapshotless heatmap imports,
mobile layout, reduced motion, and WebGL/engine-download fallback recovery.
Failed runs retain screenshots and Playwright traces under
`output/playwright`; use `pnpm --filter vanilla-demo test:e2e:report` to inspect.

## Measuring load and responsiveness

```sh
GLOBIO_HEADED=1 GLOBIO_PERF_LABEL=after pnpm --filter vanilla-demo test:performance
```

Each run saves desktop and emulated mobile JSON under
`output/playwright/performance/after-*.json`, with an attachment and screenshot in
the Playwright report. Use `GLOBIO_PERF_LABEL=before` before making a change to
retain both samples. Use the same build server, browser mode, machine and workload
for comparisons. Run several samples and compare medians for release decisions;
single local runs fluctuate and do not represent field performance.

The mobile profile uses the Pixel 7 viewport/DPR/touch settings, **4× CPU
slowdown, 1.6 Mbps download, 750 Kbps upload and 150 ms latency**. This is browser
emulation on the host computer, not a physical Android device. The JSON identifies
the WebGL renderer; headless environments may use SwiftShader. Headed mode is
available for hardware renderer measurements. Timings from different renderers
must not be compared as equivalent.

The fixed window ends three seconds after the hero reports ready. Measurements
include first contentful paint, largest contentful paint within that window,
navigation/context creation → globe ready, layout shift, request/JavaScript bytes,
long tasks and browser animation-frame scheduling. The latter is **not globe
FPS**; Globio intentionally caps renderer FPS. Cross-origin resource byte sizes
may be unavailable without `Timing-Allow-Origin` and are reported as zero.

Timing samples are diagnostic, without machine-dependent pass/fail thresholds.
The deterministic build gate enforces the shell + homepage static JavaScript
budget (450 KiB raw / 150 KiB gzip) and largest chunk budget (1250 KiB raw).
Browser assertions separately ensure editor-only code is not loaded on home.
The engine is downloaded on demand and counted in browser totals once started.
