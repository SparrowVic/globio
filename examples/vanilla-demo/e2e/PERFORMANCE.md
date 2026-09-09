# Initial performance comparison

Measured 2026-09-09 against a production Vite preview, before and after the
Studio/loading work. These are **single diagnostic samples**, not release-grade
medians or real-phone results. Both runs used the same Chromium 145 browser,
headful mode, local server and host. The renderer was SwiftShader; browser CPU
throttling does not turn the host into physical mobile hardware. Bundle rows use
the final build; timing samples were taken immediately after the loading change,
before the remaining dialog and recovery refinements.

| Measurement | Before | After |
| --- | ---: | ---: |
| Shell + home JS before engine activation | 1,488.7 kB | 361.1 kB |
| Shell + home JS, gzip | 416.8 kB | 117.3 kB |
| Desktop first contentful paint | 1,196 ms | 1,232 ms |
| Desktop globe ready from navigation | 3,078 ms | 3,140 ms |
| Emulated mobile first contentful paint | 3,956 ms | 2,392 ms |
| Emulated mobile globe ready from navigation | 9,067 ms | 8,059 ms |
| Emulated mobile WebGL context creation → ready | 5,092 ms | 2,191 ms |
| Emulated mobile long-task duration in sample window | 5,458 ms | 2,549 ms |
| All JS eventually loaded through globe ready | 1,490.3 kB | 1,491.2 kB |

Mobile emulation: Pixel 7 viewport 412 × 839, DPR 2.625, CPU slowdown 4×,
1.6 Mbps download / 750 Kbps upload / 150 ms latency. Each sample continues for
three seconds after the hero becomes ready. CSS and fonts remain part of the
real page load. External font requests and host activity can affect timings.

The loading change lets the interface render before downloading/parsing the
engine. It does not remove the engine bytes needed for a live globe. The desktop
timing difference is too small to claim an improvement. Mobile-emulated samples
show earlier content and fewer long tasks, while the bundle reduction is a
deterministic build result.

Reproduce with the commands in [README.md](README.md). JSON reports are generated
under `output/playwright/performance`, kept out of Git. Reports also contain LCP
within the sample window, layout shift, requests and browser scheduling metrics.
Use multiple samples plus a physical phone before making public performance claims.
