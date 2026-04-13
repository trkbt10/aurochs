/**
 * @file Canvas viewport context
 *
 * Provides viewport coordinate conversion to EditorCanvas's children
 * and viewportOverlay components via React Context.
 *
 * Previously, coordinate conversion was only available via the imperative
 * EditorCanvasHandle (ref). This context makes the same functionality
 * available declaratively, so children don't need ref access to convert
 * screen coordinates to page coordinates.
 *
 * The context is provided by EditorCanvas internally — consumers never
 * create this provider directly.
 */

import { createContext, useContext } from "react";
import type { ViewportTransform, ViewportSize } from "@aurochs-ui/editor-core/viewport";

// =============================================================================
// Types
// =============================================================================

export type CanvasViewportContextValue = {
  /** Convert screen (client) coordinates to page (canvas content) coordinates. */
  readonly screenToPage: (clientX: number, clientY: number) => { pageX: number; pageY: number } | undefined;
  /** Current viewport transform (pan + zoom). */
  readonly viewport: ViewportTransform;
  /** Current viewport size in screen pixels. */
  readonly viewportSize: ViewportSize;
};

// =============================================================================
// Context
// =============================================================================

const CanvasViewportContext = createContext<CanvasViewportContextValue | null>(null);

/**
 * Access the canvas viewport context.
 *
 * Must be used within an EditorCanvas. Returns null if not within a canvas
 * (e.g., during SSR or when rendered outside EditorCanvas).
 */
export function useCanvasViewport(): CanvasViewportContextValue | null {
  return useContext(CanvasViewportContext);
}

/**
 * Access the canvas viewport context (required).
 *
 * Throws if not within an EditorCanvas. Use this when the component is
 * guaranteed to be a child of EditorCanvas.
 */
export function useCanvasViewportRequired(): CanvasViewportContextValue {
  const ctx = useContext(CanvasViewportContext);
  if (!ctx) {
    throw new Error("useCanvasViewportRequired must be used within an EditorCanvas");
  }
  return ctx;
}

export { CanvasViewportContext };
