/**
 * @file Core sheet viewport context
 *
 * Provides viewport dimensions to children of CoreSheetViewport.
 * This ensures that any component inside CoreSheetViewport can access
 * the viewport size without receiving it as a separate prop — eliminating
 * the risk of the same value being passed through two independent prop paths.
 */

import { createContext, useContext } from "react";

/**
 * Viewport dimensions provided by CoreSheetViewport to its children.
 */
export type CoreSheetViewportContextValue = {
  /** Grid viewport width in pixels (excluding headers, unscaled) */
  readonly viewportWidth: number;
  /** Grid viewport height in pixels (excluding headers, unscaled) */
  readonly viewportHeight: number;
};

const CoreSheetViewportContext = createContext<CoreSheetViewportContextValue | null>(null);

/**
 * Provider for CoreSheetViewport context.
 */
export const CoreSheetViewportProvider = CoreSheetViewportContext.Provider;

/**
 * Access viewport dimensions from within a CoreSheetViewport.
 *
 * Throws if called outside a CoreSheetViewport.
 */
export function useCoreSheetViewport(): CoreSheetViewportContextValue {
  const ctx = useContext(CoreSheetViewportContext);
  if (!ctx) {
    throw new Error("useCoreSheetViewport must be used inside a CoreSheetViewport");
  }
  return ctx;
}
