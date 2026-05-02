import { useCallback, useEffect, useState } from 'react';

/**
 * Boolean state for a UI affordance (panel collapsed / section open / etc.)
 * persisted in localStorage so panel layout survives reloads. The key is
 * always namespaced with `globio-` so it doesn't collide with anything
 * else the demo might cache.
 *
 * SSR-safe: the initial render returns `defaultValue` regardless of what
 * localStorage holds, then a `useEffect` reconciles after mount. The
 * one-frame flicker is acceptable in a configurator (no FOUC visible to
 * the eye on a 60fps repaint).
 */
export const usePanelState = (
  key: string,
  defaultValue: boolean
): readonly [boolean, (next: boolean) => void, () => void] => {
  const storageKey = `globio-${key}`;
  const [value, setValue] = useState(defaultValue);

  // Hydrate from localStorage after first paint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === 'true') setValue(true);
      else if (raw === 'false') setValue(false);
    } catch {
      /* localStorage may throw in private mode — fall through to default. */
    }
  }, [storageKey]);

  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, next ? 'true' : 'false');
      } catch {
        /* swallow — persistence is best-effort. */
      }
    },
    [storageKey]
  );

  const reset = useCallback(() => {
    setValue(defaultValue);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* same swallow. */
    }
  }, [storageKey, defaultValue]);

  return [value, set, reset] as const;
};

/**
 * Wipe every persisted panel/section state at once. Hooked into the
 * configurator's "Reset" button so a fresh slate is truly fresh.
 */
export const resetAllPanelState = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('globio-')) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {
    /* swallow. */
  }
};
