/**
 * @file Coordinate conversion utilities
 *
 * Utilities for converting between client (browser) and canvas coordinate systems.
 */

/**
 * Convert client (mouse) coordinates to canvas coordinates.
 *
 * Maps browser mouse event coordinates to the coordinate system of a canvas
 * (e.g., slide, page, or artboard) by applying the appropriate scale factor.
 *
 * @param clientX - Client X coordinate (from mouse/pointer event)
 * @param clientY - Client Y coordinate (from mouse/pointer event)
 * @param containerRect - Container element's bounding rect
 * @param canvasWidth - Canvas width in domain units
 * @param canvasHeight - Canvas height in domain units
 * @returns Canvas coordinates
 */
export function clientToCanvasCoords({
  clientX,
  clientY,
  containerRect,
  canvasWidth,
  canvasHeight,
}: {
  clientX: number;
  clientY: number;
  containerRect: DOMRect;
  canvasWidth: number;
  canvasHeight: number;
}): { x: number; y: number } {
  const scaleX = canvasWidth / containerRect.width;
  const scaleY = canvasHeight / containerRect.height;

  return {
    x: (clientX - containerRect.left) * scaleX,
    y: (clientY - containerRect.top) * scaleY,
  };
}
