---
name: globio-perf-check
description: Use when the Globio landing or Studio feels laggy or stutters while scrolling, or before and after any change to globe creation, kind switching, the frame scheduler, country geometry or post-processing — measures the page in a real browser instead of guessing.
---

# Globio perf check

## Overview

Globe *rendering* is rarely the stutter. The synchronous kind build that runs after the country
fetch is: 225–470 ms per `createGlobe` at medium geometry, 60–190 ms at low. Measure with the
script below before changing anything, and re-measure with the same script after. Pass = no
long task during the scroll and at most one frame over 34 ms.

## Setup

1. Dev server: `mcp__Claude_Browser__preview_start` with name `vanilla-demo` (Vite plus
   `tsup --watch` for `@your-globe/core`). `curl -s -o /dev/null -w "%{http_code}"
   http://localhost:5173/` must print 200; if not, start it again — it dies with the session.
   The demo renders `packages/core/dist`: check `ls -la packages/core/dist/index.js` is newer
   than your last core edit, or rebuild once with `pnpm --filter @your-globe/core build`.
2. Chrome DevTools MCP (preferred over Playwright here — one page, one tool): load the deferred
   schemas first with `ToolSearch` `select:mcp__plugin_chrome-devtools-mcp_chrome-devtools__new_page,…resize_page,…evaluate_script,…list_console_messages`,
   then `new_page` on `http://localhost:5173/` and `resize_page` 1440×900. Every later call
   takes the `pageId` that `new_page` prints. Do not use `performance_start_trace` on an
   already loaded page: without a navigation it returns no insights. The script below is the
   measurement.

## Measure

`evaluate_script` (pageId, waitForStableDom: false) with this function, unchanged so runs
stay comparable. The 9 s sleep lets the deck warm every chapter globe first — those builds
are expected and are not the finding.

```js
async () => {
  await new Promise((r) => setTimeout(r, 9000));
  const tasks = [];
  const obs = new PerformanceObserver((l) => { for (const e of l.getEntries())
    tasks.push({ dur: Math.round(e.duration), scrollY: Math.round(scrollY),
      canvases: document.querySelectorAll('canvas').length }); });
  obs.observe({ type: 'longtask' });
  const H = document.documentElement.scrollHeight - innerHeight, frames = [];
  const run = (a, b, ms) => new Promise((done) => { const t0 = performance.now(); let last = t0;
    const step = (now) => { const p = Math.min(1, (now - t0) / ms); scrollTo(0, a + (b - a) * p);
      frames.push(now - last); last = now; p < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step); });
  const before = performance.getEntriesByType('measure').length;
  await run(0, H, 3000); await new Promise((r) => setTimeout(r, 800)); await run(H, 0, 2500);
  obs.disconnect();
  const builds = {};
  for (const m of performance.getEntriesByType('measure').slice(before))
    (builds[m.name] ||= []).push(Math.round(m.duration));
  return { longTasks: tasks, frames: frames.length, over34ms: frames.filter((d) => d > 34).length,
    worstMs: frames.length ? Math.round(Math.max(...frames)) : null, builds,
    canvases: document.querySelectorAll('canvas').length };
}
```

## Read it

The engine records five User Timing measures per globe (`packages/core/src/utils/perf-marks.ts`):
`globio:construct` (renderer + layers), `globio:countries-load` (fetch + parse, cached per URL),
`globio:kind-build` (synchronous geometry build), `globio:shader-compile` (parallel compile while
frames are held) and `globio:mount-to-ready` (mount → `ready`, the sum).

| Signal | Pass | Meaning |
|---|---|---|
| `longTasks` during the scroll | empty | a globe was built mid-scroll (chapter switch, mount/unmount thrash) |
| `over34ms` of `frames` | ≤ 1 | dropped frames the user feels; ~650 frames at 120 Hz, ~330 at 60 Hz |
| `builds['globio:kind-build']` | ≤ 190 ms low, ≤ 470 ms medium | once per `createGlobe`; the only long task the engine produces |
| `builds['globio:construct']` | 15–30 ms | WebGL context plus layers — not the problem |
| `canvases` | ≤ 8 | warm deck layers plus the data globe |

Attribution is a heuristic: `scrollY` and `canvases` are sampled when the entry is delivered, a
few ms after the task. A `canvases` count that just went up means a build; a long task with a
steady count during a kind switch means a build replaced a layer.

## Fixes that worked

- Never create a globe during scroll: keep layers warm (`GlobeDeck` + `lib/idle-queue.ts`) and
  pause hidden ones with `globe.setPaused(true)`; one synchronous build at a time, only while
  scroll-quiet.
- `countries.resolution: 'low'` for any globe shown at ≤ 700 px.
- Mount once and keep alive; the core already pauses off-screen globes.

## Common mistakes

- Trusting the page's FPS meter: it shows rendering, not the one 300 ms build that froze it.
- Measuring right after load: the first ~9 s contain warm-up builds by design.
- Screenshots: `take_screenshot` writes only inside the repo — `mkdir -p tmp-shots` first
  (git-ignored).
