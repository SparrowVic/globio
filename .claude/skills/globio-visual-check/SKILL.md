---
name: globio-visual-check
description: Use when a change touches the Globio landing page, Studio or any globe kind's look and it needs a browser check or screenshots at desktop and mobile sizes, or when the dev server or the core build output looks stale.
---

# Globio visual check

## Overview

Two facts decide whether a screenshot tells the truth: the demo renders `packages/core/dist`,
not core sources, and a globe draws nothing until its `globio:mount-to-ready` measure exists
(0.3–1 s after mount, longer for the cinematic kind).

## Steps

1. Server: `mcp__Claude_Browser__preview_start` with name `vanilla-demo`, then
   `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` must print 200. If a core
   edit does not show up: `pgrep -fl tsup` — the watcher dies with the session; either run
   `preview_start` again (it restarts both) or build once with
   `pnpm --filter @your-globe/core build`.
2. Browser: Chrome DevTools MCP (preferred; load schemas with `ToolSearch`
   `select:mcp__plugin_chrome-devtools-mcp_chrome-devtools__new_page,…resize_page,…navigate_page,…evaluate_script,…take_screenshot,…list_console_messages`).
   `new_page` prints the `pageId` every other call needs. `mkdir -p tmp-shots` (git-ignored)
   and pass `filePath: /Users/…/globio/tmp-shots/<name>.jpeg` — paths outside the repo are
   refused. Playwright MCP works too (`browser_resize` → `browser_navigate` →
   `browser_take_screenshot` with `filename`, saved under its own `.playwright-mcp/` output
   dir). The app's Browser pane cannot save files and its screenshots fail at emulated mobile
   sizes — use it only for a live look.
3. Sizes: `resize_page` 1440×900, then `navigate_page` type `reload` (pointer and breakpoint
   logic runs at mount); repeat for 390×844. Width alone triggers the mobile layout (the
   breakpoint is 1024 px; `pointer: coarse` only disables globe dragging), so no device
   emulation is needed.
4. Wait for the globe with `evaluate_script`:
   ```js
   async () => { const t0 = performance.now();
     while (performance.now() - t0 < 15000) {
       if (performance.getEntriesByName('globio:mount-to-ready').length) return 'ready';
       await new Promise((r) => setTimeout(r, 200)); }
     return 'timeout'; }
   ```
   Scroll with `window.scrollTo(0, innerHeight * n)` — chapter n of the planet stage sits at
   n + 1 viewport heights; wait ~2 s for the cross-fade before shooting.
5. Read every screenshot with the Read tool. Check the console (`list_console_messages` with
   types error/warn). HMR noise from mid-edit reloads is not a bug: reload once and re-check.
6. Before claiming done: `pnpm exec tsc --noEmit` in `packages/core` and
   `examples/vanilla-demo`, then `pnpm exec vite build` in the demo.

## Common mistakes

- Screenshot before `mount-to-ready`: a blank canvas while shaders compile.
- Resizing without a reload: the desktop code path at mobile width.
- Reading a stale `dist`: tsc passes, the browser shows yesterday's core.
