// Shared frame scheduler — one requestAnimationFrame loop for every globe
// on the page.
//
// Each `SceneManager` used to own its own RAF loop, so a landing page with
// eight decorative globes ran eight loops, each rendering every display
// frame whether or not the globe was on screen. The scheduler owns the
// single loop and gives every client two levers:
//
//   * `paused` — the client is skipped entirely (off-screen, hidden tab,
//     waiting for shaders to compile). When every client is paused the RAF
//     loop stops and restarts on the next `wake()`.
//   * `targetFps` — decorative globes can run at 30 fps while the hero
//     stays at 60; the client's `onFrame` is simply not called on frames
//     that would exceed its rate. Time-based animation stays correct
//     because clients measure their own delta between calls.
//
// Clients never see a frame while paused, so a client's first frame after a
// pause carries a large delta — `SceneManager` clamps it.

export interface FrameClient {
  /** Called at most `targetFps` times per second while the client is active. */
  onFrame(now: number): void;
  /** Frames are skipped while this returns true. */
  isPaused(): boolean;
  /** Desired frame rate; the display refresh rate is the ceiling. */
  targetFps(): number;
}

interface ClientState {
  readonly client: FrameClient;
  lastFrame: number;
}

// A little slack so a 60 fps target on a 60 Hz display renders every frame
// instead of every other one when the RAF timestamp jitters by a fraction
// of a millisecond.
const RATE_SLACK_MS = 1.5;

class FrameScheduler {
  private readonly clients = new Map<FrameClient, ClientState>();
  private rafId = 0;

  public register(client: FrameClient): void {
    if (this.clients.has(client)) return;
    this.clients.set(client, { client, lastFrame: -Infinity });
    this.wake();
  }

  public unregister(client: FrameClient): void {
    this.clients.delete(client);
    if (this.clients.size === 0) this.stopLoop();
  }

  /** Restart the loop after every client was paused. Safe to call any time. */
  public wake(): void {
    if (this.rafId !== 0 || this.clients.size === 0) return;
    if (typeof requestAnimationFrame !== 'function') return;
    this.rafId = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (this.rafId === 0) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private readonly loop = (now: number): void => {
    this.rafId = 0;
    let anyActive = false;
    for (const state of this.clients.values()) {
      const { client } = state;
      if (client.isPaused()) continue;
      anyActive = true;
      const target = Math.max(1, client.targetFps());
      const interval = 1000 / target - RATE_SLACK_MS;
      if (now - state.lastFrame < interval) continue;
      state.lastFrame = now;
      client.onFrame(now);
    }
    // Keep ticking while anything is active; a fully paused page costs
    // nothing until some client wakes us again.
    if (anyActive && this.clients.size > 0) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };
}

let shared: FrameScheduler | null = null;

/** Process-wide scheduler shared by every globe instance. */
export const getFrameScheduler = (): FrameScheduler => {
  if (shared === null) shared = new FrameScheduler();
  return shared;
};
