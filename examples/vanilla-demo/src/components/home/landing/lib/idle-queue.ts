/**
 * One-at-a-time idle work queue for warming globes.
 *
 * A globe build is synchronous and costs 60–400 ms of main thread, so it
 * must never land in the middle of a scroll. Jobs run only after the page
 * has been scroll-quiet for a moment and the browser reports idle time,
 * and the next job waits for the previous one's promise (a globe is "done"
 * when it reports live, not when the job function returns).
 */
export type IdleJob = () => Promise<unknown> | void;

const SCROLL_QUIET_MS = 350;
const GAP_MS = 250;
const IDLE_TIMEOUT_MS = 2500;

const queue: IdleJob[] = [];
let running = false;
let lastScrollAt = -Infinity;
let listening = false;

const listen = (): void => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener(
    'scroll',
    () => {
      lastScrollAt = performance.now();
    },
    { passive: true },
  );
};

const whenIdle = (callback: () => void): void => {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
  } else {
    window.setTimeout(callback, 120);
  }
};

const pump = (): void => {
  if (running) return;
  const job = queue.shift();
  if (!job) return;
  running = true;
  const attempt = (): void => {
    if (performance.now() - lastScrollAt < SCROLL_QUIET_MS) {
      window.setTimeout(attempt, SCROLL_QUIET_MS);
      return;
    }
    whenIdle(() => {
      let result: Promise<unknown> | void;
      try {
        result = job();
      } catch {
        result = undefined;
      }
      Promise.resolve(result)
        .catch(() => undefined)
        .then(() => {
          running = false;
          window.setTimeout(pump, GAP_MS);
        });
    });
  };
  attempt();
};

/** Queue `job`; returns a function that removes it if it has not started. */
export const enqueueIdle = (job: IdleJob): (() => void) => {
  listen();
  queue.push(job);
  pump();
  return () => {
    const index = queue.indexOf(job);
    if (index >= 0) queue.splice(index, 1);
  };
};
