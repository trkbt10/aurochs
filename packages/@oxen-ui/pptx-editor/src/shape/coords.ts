/**
 * @file Coordinate conversion
 *
 * Utilities for converting between client and slide coordinate systems.
 */

// =============================================================================
// Viewport-aware coordinate functions - DO NOT RE-EXPORT
// =============================================================================
// Import directly from "@oxen/pptx-render/svg-viewport" for:
// screenToSlideCoords, slideToScreenCoords, screenToCanvasCoords,
// isPointInCanvasArea, isPointInRulerArea, ViewportTransform
// =============================================================================

/**
 * Convert client (mouse) coordinates to slide coordinates.
 *
 * @deprecated Use `screenToSlideCoords` from svg-viewport for viewport-aware conversion.
 * This function does not account for pan/zoom transforms.
 *
 * @param clientX - Client X coordinate
 * @param clientY - Client Y coordinate
 * @param containerRect - Container element's bounding rect
 * @param slideWidth - Slide width in domain units
 * @param slideHeight - Slide height in domain units
 * @returns Slide coordinates
 */
export function clientToSlideCoords(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  slideWidth: number,
  slideHeight: number
): { x: number; y: number } {
  const scaleX = slideWidth / containerRect.width;
  const scaleY = slideHeight / containerRect.height;

  return {
    x: (clientX - containerRect.left) * scaleX,
    y: (clientY - containerRect.top) * scaleY,
  };
}
