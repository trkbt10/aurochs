/**
 * @file FontCatalogContext - Dedicated context for injecting a FontCatalog into the tree.
 *
 * Provides `FontCatalogProvider` and `useFontCatalog` for components
 * that need access to a dynamically loaded font catalog (e.g. Google Fonts).
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { FontCatalog } from "./types";

type FontCatalogContextValue = {
  readonly fontCatalog: FontCatalog | undefined;
};

const FontCatalogCtx = createContext<FontCatalogContextValue>({ fontCatalog: undefined });

const prefetchedCatalogs = new WeakSet<FontCatalog>();

export type FontCatalogProviderProps = {
  readonly children: ReactNode;
  readonly fontCatalog: FontCatalog | undefined;
};

/**
 * Provider that makes a `FontCatalog` available to descendant components
 * via `useFontCatalog()`.
 *
 * On mount, eagerly prefetches the catalog's family list (once per instance)
 * so the dropdown is ready when the user opens it.
 */
export function FontCatalogProvider({ children, fontCatalog }: FontCatalogProviderProps) {
  useEffect(() => {
    if (!fontCatalog) {
      return;
    }
    if (prefetchedCatalogs.has(fontCatalog)) {
      return;
    }
    prefetchedCatalogs.add(fontCatalog);
    void Promise.resolve(fontCatalog.listFamilies()).catch(() => undefined);
  }, [fontCatalog]);

  const value = useMemo(() => ({ fontCatalog }), [fontCatalog]);
  return <FontCatalogCtx.Provider value={value}>{children}</FontCatalogCtx.Provider>;
}

/**
 * Hook to access the injected FontCatalog.
 *
 * Returns `undefined` when no `FontCatalogProvider` is present
 * or when the provider was given `undefined`.
 */
export function useFontCatalog(): FontCatalog | undefined {
  return useContext(FontCatalogCtx).fontCatalog;
}
