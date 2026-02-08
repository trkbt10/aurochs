/**
 * @file DrawingML Context Hook
 *
 * Hook for accessing DrawingML render context from child components.
 */

import { useContext } from "react";
import type { DrawingMLRenderContext } from "./types";
import { DrawingMLContext } from "./DrawingMLProvider";

// =============================================================================
// Hook
// =============================================================================

/**
 * Access DrawingML render context from child components.
 * Must be used within a DrawingMLProvider.
 *
 * @returns DrawingML render context
 * @throws Error if used outside of DrawingMLProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { colorContext, getNextId } = useDrawingMLContext();
 *   // ...
 * }
 * ```
 */
export function useDrawingMLContext(): DrawingMLRenderContext {
  const ctx = useContext(DrawingMLContext);
  if (ctx === null) {
    throw new Error("useDrawingMLContext must be used within a DrawingMLProvider");
  }
  return ctx;
}

/**
 * Access DrawingML render context, returning null if not available.
 * Use this for components that may be rendered outside DrawingMLProvider.
 *
 * @returns DrawingML render context or null
 */
export function useOptionalDrawingMLContext(): DrawingMLRenderContext | null {
  return useContext(DrawingMLContext);
}
