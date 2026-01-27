/**
 * @file Editor configuration context
 *
 * Provides theme and configuration to editor components without coupling.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ColorScheme, ColorMap } from "@oxen/pptx/domain/color/context";
import type { FontScheme } from "@oxen/pptx/domain/resolution";
import type { FontCatalog } from "../../fonts/types";

/**
 * Editor configuration
 */
export type EditorConfig = {
  /** Locale for number formatting */
  readonly locale: string;
  /** Color scheme for resolving scheme colors */
  readonly colorScheme?: ColorScheme;
  /** Color map for resolving colors */
  readonly colorMap?: ColorMap;
  /** Font scheme for resolving fonts */
  readonly fontScheme?: FontScheme;
  /** Injectable font catalog for dynamic font selection/loading */
  readonly fontCatalog?: FontCatalog;
  /** Show advanced options */
  readonly showAdvanced?: boolean;
  /** Compact mode for tight layouts */
  readonly compactMode?: boolean;
};

const defaultConfig: EditorConfig = {
  locale: "en-US",
  showAdvanced: false,
  compactMode: false,
};

const EditorConfigContext = createContext<EditorConfig>(defaultConfig);

const prefetchedFontCatalogs = new WeakSet<FontCatalog>();

/**
 * Provider for editor configuration
 */
export function EditorConfigProvider({
  children,
  config,
}: {
  readonly children: ReactNode;
  readonly config?: Partial<EditorConfig>;
}) {
  const mergedConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  useEffect(() => {
    const catalog = mergedConfig.fontCatalog;
    if (!catalog) {
      return;
    }
    if (prefetchedFontCatalogs.has(catalog)) {
      return;
    }
    prefetchedFontCatalogs.add(catalog);
    void Promise.resolve(catalog.listFamilies()).catch(() => undefined);
  }, [mergedConfig.fontCatalog]);

  return (
    <EditorConfigContext.Provider value={mergedConfig}>
      {children}
    </EditorConfigContext.Provider>
  );
}

/**
 * Hook to access editor configuration
 */
export function useEditorConfig(): EditorConfig {
  return useContext(EditorConfigContext);
}
