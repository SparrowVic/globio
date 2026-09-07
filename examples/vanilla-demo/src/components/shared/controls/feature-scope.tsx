import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface FeatureScope {
  /** Registry id every control inside inherits unless it names its own. */
  readonly feature: string;
  /** Optional config path the whole group edits, e.g. `atmosphere`. */
  readonly configPath?: string;
}

const FeatureScopeContext = createContext<FeatureScope | null>(null);

/**
 * Wrap a group of controls so each one's help tip knows which feature it
 * belongs to. A control can still name a more specific `feature` or a
 * `configPath`; the scope is the fallback that keeps coverage complete.
 */
export function FeatureScopeProvider({ feature, configPath, children }: FeatureScope & { readonly children: ReactNode }) {
  const value = useMemo<FeatureScope>(() => (configPath ? { feature, configPath } : { feature }), [feature, configPath]);
  return <FeatureScopeContext.Provider value={value}>{children}</FeatureScopeContext.Provider>;
}

export const useFeatureScope = (): FeatureScope | null => useContext(FeatureScopeContext);
