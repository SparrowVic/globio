import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_FRAMEWORK, isFrameworkId, type FrameworkId } from '@/docs/frameworks';

const STORAGE_KEY = 'globio.docs.framework';

interface FrameworkContextValue {
  readonly framework: FrameworkId;
  readonly setFramework: (id: FrameworkId) => void;
}

const FrameworkContext = createContext<FrameworkContextValue | null>(null);

const readStored = (): FrameworkId => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isFrameworkId(raw) ? raw : DEFAULT_FRAMEWORK;
  } catch {
    return DEFAULT_FRAMEWORK;
  }
};

/**
 * One framework choice for the whole documentation: every code panel on
 * every page follows it, and it survives reloads. Pick React once, read
 * React everywhere.
 */
export function FrameworkProvider({ children }: { readonly children: ReactNode }) {
  const [framework, setState] = useState<FrameworkId>(readStored);
  const setFramework = useCallback((id: FrameworkId) => {
    setState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private mode — the choice just does not persist */
    }
  }, []);
  const value = useMemo(() => ({ framework, setFramework }), [framework, setFramework]);
  return <FrameworkContext.Provider value={value}>{children}</FrameworkContext.Provider>;
}

export function useFramework(): FrameworkContextValue {
  const ctx = useContext(FrameworkContext);
  if (!ctx) throw new Error('useFramework must be used inside <FrameworkProvider>');
  return ctx;
}
