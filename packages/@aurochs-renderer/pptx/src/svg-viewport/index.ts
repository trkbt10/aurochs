/**
 * @file SVG viewport utilities
 *
 * Shared utilities for SVG-based canvas viewport management.
 * Used by both the editor and viewer for consistent coordinate handling.
 *
 * Note: The canonical SoT for viewport logic is @aurochs-ui/editor-core/viewport.
 * This module maintains its own copies for the renderer layer (which cannot depend on editor-core).
 */

export type { ViewportTransform, ViewportSize, SlideSize } from "./types";
export { INITIAL_VIEWPORT } from "./types";

export {
  getTransformString,
  ZOOM_LEVELS,
  getNextZoomValue,
  getCenteredViewport,
  getFitScale,
  zoomTowardCursor,
  panViewport,
  clampViewport,
  createFittedViewport,
} from "./transform";

export {
  screenToSlideCoords,
  slideToScreenCoords,
  screenToCanvasCoords,
  isPointInCanvasArea,
  isPointInRulerArea,
} from "./coords";
