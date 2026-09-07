import { createContext, useContext, type ReactNode } from 'react';

export interface DocPageSource {
  readonly slug: string;
  /** Path of the page component under src/docs/pages, for the edit link. */
  readonly source?: string;
}

const DocPageContext = createContext<DocPageSource | null>(null);

export function DocPageProvider({ value, children }: { readonly value: DocPageSource; readonly children: ReactNode }) {
  return <DocPageContext.Provider value={value}>{children}</DocPageContext.Provider>;
}

export const useDocPageSource = (): DocPageSource | null => useContext(DocPageContext);
