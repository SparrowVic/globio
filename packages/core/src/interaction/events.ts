import type { GlobeEventName, GlobeEvents, GlobeEventUnsubscribe } from '../types';

type HandlerSet<K extends GlobeEventName> = Set<GlobeEvents[K]>;

type HandlerMap = {
  [K in GlobeEventName]: HandlerSet<K>;
};

export class GlobeEventEmitter {
  private readonly handlers: HandlerMap = {
    countryClick: new Set(),
    countryHover: new Set(),
    markerClick: new Set(),
    markerHover: new Set(),
    ready: new Set(),
    error: new Set(),
    sceneEnter: new Set(),
    sceneExit: new Set(),
    storyComplete: new Set(),
  };

  public on<K extends GlobeEventName>(
    event: K,
    handler: GlobeEvents[K]
  ): GlobeEventUnsubscribe {
    const set = this.handlers[event] as HandlerSet<K>;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  public off<K extends GlobeEventName>(event: K, handler: GlobeEvents[K]): void {
    const set = this.handlers[event] as HandlerSet<K>;
    set.delete(handler);
  }

  public emit<K extends GlobeEventName>(
    event: K,
    ...args: Parameters<GlobeEvents[K]>
  ): void {
    const set = this.handlers[event] as HandlerSet<K>;
    set.forEach((handler) => {
      try {
        (handler as (...a: Parameters<GlobeEvents[K]>) => void)(...args);
      } catch (error) {
        if (event !== 'error') {
          this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }

  public clear(): void {
    (Object.keys(this.handlers) as ReadonlyArray<GlobeEventName>).forEach((key) => {
      this.handlers[key].clear();
    });
  }
}
