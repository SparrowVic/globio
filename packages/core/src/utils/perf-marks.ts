// Zero-cost-when-absent wrappers around the User Timing API. The globe
// records how long its heavy phases take so a host can read them from
// `performance.getEntriesByType('measure')` or see them in a DevTools trace:
//   globiojs:construct       renderer, controls and shared layers (sync)
//   globiojs:countries-load  country geometry fetch + parse (cached per URL)
//   globiojs:kind-build      the kind module's synchronous build — the long task
//   globiojs:shader-compile  parallel shader compile while frames are held
//   globiojs:mount-to-ready  mount() → 'ready' (everything above)

const hasPerf =
  typeof performance !== 'undefined' &&
  typeof performance.now === 'function' &&
  typeof performance.measure === 'function';

/** Timestamp to pass to `perfMeasure`; 0 when the API is unavailable. */
export const perfMark = (): number => (hasPerf ? performance.now() : 0);

/** Record `name` as a measure from `start` (a `perfMark()` value) to now. */
export const perfMeasure = (name: string, start: number): void => {
  if (!hasPerf) return;
  try {
    performance.measure(name, { start, end: performance.now() });
  } catch {
    // Older engines only accept mark names; the timing is a nicety, not a feature.
  }
};
