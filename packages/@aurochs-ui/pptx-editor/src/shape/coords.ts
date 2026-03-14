/**
 * @file Coordinate conversion
 *
 * Re-exports from @aurochs-ui/editor-core/geometry for backwards compatibility.
 */

// =============================================================================
// Viewport-aware coordinate functions - DO NOT RE-EXPORT
// =============================================================================
// Import directly from "@aurochs-renderer/pptx/svg-viewport" for:
// screenToSlideCoords, slideToScreenCoords, screenToCanvasCoords,
// isPointInCanvasArea, isPointInRulerArea, ViewportTransform
// =============================================================================

import { clientToCanvasCoords } from "@aurochs-ui/editor-core/geometry";

/**
 * Convert client (mouse) coordinates to slide coordinates.
 *
 * @deprecated Use `screenToSlideCoords` from svg-viewport for viewport-aware conversion.
 * This function does not account for pan/zoom transforms.
 */
export function clientToSlideCoords({
  clientX,
  clientY,
  containerRect,
  slideWidth,
  slideHeight,
}: {
  clientX: number;
  clientY: number;
  containerRect: DOMRect;
  slideWidth: number;
  slideHeight: number;
}): { x: number; y: number } {
  return clientToCanvasCoords({
    clientX,
    clientY,
    containerRect,
    canvasWidth: slideWidth,
    canvasHeight: slideHeight,
  });
}
