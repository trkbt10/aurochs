/**
 * @file SVG viewport coordinate conversion
 *
 * Functions for converting between screen and slide coordinate systems.
 */

import type { ViewportTransform } from "./types";

/**
 * Converts screen (client) coordinates to slide coordinates.
 *
 * @param clientX - Mouse X in client coordinates
 * @param clientY - Mouse Y in client coordinates
 * @param svgRect - Bounding rect of the SVG element
 * @param viewport - Current viewport transform
 * @param rulerThickness - Thickness of rulers in pixels
 * @returns Coordinates in slide space
 */
export function screenToSlideCoords(
  args: {
    readonly clientX: number;
    readonly clientY: number;
    readonly svgRect: DOMRect;
    readonly viewport: ViewportTransform;
    readonly rulerThickness: number;
  }
): { x: number; y: number } {
  const { clientX, clientY, svgRect, viewport, rulerThickness } = args;
  // Convert from client to SVG-local coordinates
  const svgX = clientX - svgRect.left;
  const svgY = clientY - svgRect.top;

  // Adjust for ruler offset (canvas area starts after rulers)
  const canvasX = svgX - rulerThickness;
  const canvasY = svgY - rulerThickness;

  // Invert the viewport transform: point = (canvasPoint - translate) / scale
  const slideX = (canvasX - viewport.translateX) / viewport.scale;
  const slideY = (canvasY - viewport.translateY) / viewport.scale;

  return { x: slideX, y: slideY };
}

/**
 * Converts slide coordinates to screen (client) coordinates.
 *
 * @param slideX - X in slide coordinates
 * @param slideY - Y in slide coordinates
 * @param svgRect - Bounding rect of the SVG element
 * @param viewport - Current viewport transform
 * @param rulerThickness - Thickness of rulers in pixels
 * @returns Coordinates in client space
 */
export function slideToScreenCoords(
  args: {
    readonly slideX: number;
    readonly slideY: number;
    readonly svgRect: DOMRect;
    readonly viewport: ViewportTransform;
    readonly rulerThickness: number;
  }
): { x: number; y: number } {
  const { slideX, slideY, svgRect, viewport, rulerThickness } = args;
  // Apply viewport transform: canvasPoint = slidePoint * scale + translate
  const canvasX = slideX * viewport.scale + viewport.translateX;
  const canvasY = slideY * viewport.scale + viewport.translateY;

  // Add ruler offset
  const svgX = canvasX + rulerThickness;
  const svgY = canvasY + rulerThickness;

  // Convert to client coordinates
  const clientX = svgX + svgRect.left;
  const clientY = svgY + svgRect.top;

  return { x: clientX, y: clientY };
}

/**
 * Converts screen coordinates to canvas-local coordinates (relative to SVG origin).
 * This is useful for getting cursor position within the SVG for zoom calculations.
 *
 * @param clientX - Mouse X in client coordinates
 * @param clientY - Mouse Y in client coordinates
 * @param svgRect - Bounding rect of the SVG element
 * @param rulerThickness - Thickness of rulers in pixels
 * @returns Coordinates relative to the canvas area origin
 */
export function screenToCanvasCoords(
  args: { readonly clientX: number; readonly clientY: number; readonly svgRect: DOMRect; readonly rulerThickness: number }
): { x: number; y: number } {
  const { clientX, clientY, svgRect, rulerThickness } = args;
  const svgX = clientX - svgRect.left;
  const svgY = clientY - svgRect.top;

  return {
    x: svgX - rulerThickness,
    y: svgY - rulerThickness,
  };
}

/**
 * Checks if a point in screen coordinates is within the canvas area.
 */
export function isPointInCanvasArea(
  args: { readonly clientX: number; readonly clientY: number; readonly svgRect: DOMRect; readonly rulerThickness: number }
): boolean {
  const { clientX, clientY, svgRect, rulerThickness } = args;
  const svgX = clientX - svgRect.left;
  const svgY = clientY - svgRect.top;

  return (
    svgX >= rulerThickness &&
    svgY >= rulerThickness &&
    svgX <= svgRect.width &&
    svgY <= svgRect.height
  );
}

/**
 * Checks if a point in screen coordinates is within the ruler area.
 */
export function isPointInRulerArea(
  args: { readonly clientX: number; readonly clientY: number; readonly svgRect: DOMRect; readonly rulerThickness: number }
): { horizontal: boolean; vertical: boolean; corner: boolean } {
  const { clientX, clientY, svgRect, rulerThickness } = args;
  const svgX = clientX - svgRect.left;
  const svgY = clientY - svgRect.top;

  const inHorizontalRuler = svgY < rulerThickness && svgX >= rulerThickness;
  const inVerticalRuler = svgX < rulerThickness && svgY >= rulerThickness;
  const inCorner = svgX < rulerThickness && svgY < rulerThickness;

  return {
    horizontal: inHorizontalRuler,
    vertical: inVerticalRuler,
    corner: inCorner,
  };
}
