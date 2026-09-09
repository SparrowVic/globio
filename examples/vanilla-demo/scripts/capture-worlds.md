# Homepage world captures

The six `public/home/world-*.webp` images are real core-engine renders, exported at
1200 × 1200 and encoded as WebP at 92% quality. Their scene definitions live in
`capture-worlds.mjs` so that future visual changes can be recaptured consistently.

## Regenerate

1. Build the core with `pnpm --filter @your-globe/core build`.
2. Start the demo with `pnpm --filter vanilla-demo dev`.
3. Open `http://localhost:5173/scripts/capture-worlds.html` in a WebGL-capable
   browser. This Vite development entry is outside `public` and is not included
   in the production build.
4. In the browser console, run the following for each of `cinematic`, `dotted`,
   `hologram`, `paper`, `outline` and `wireframe`:

   ```js
   await window.renderWorld('cinematic');
   await window.downloadWorld();
   ```

5. Replace the matching file in `public/home/` with the downloaded WebP.

The renderer container has a fixed size; browser zoom and viewport size do not
change the exported dimensions. Each capture waits for readiness, freezes the
scene and exports through the engine's public `toImage()` API. Mounting the next
world releases the previous WebGL context. Animated materials and procedural
particles can produce small differences between captures.

For browser automation, await `renderWorld(kind)`, register the browser's
`download` event, call `downloadWorld()` and save the download to its matching
`public/home/world-${kind}.webp` path. Inspect all six images after capture,
especially thin grid lines and dot contrast at the size used on the page.
