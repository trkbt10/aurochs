/**
 * @file SVG viewport transform utilities
 *
 * Functions for generating SVG transform strings and composing transforms.
 */

import type { ViewportTransform, ViewportSize, SlideSize } from "./types";
import { INITIAL_VIEWPORT } from "./types";

/**
 * Generates an SVG transform string from a ViewportTransform.
 * The order is: translate first, then scale.
 */
export function getTransformString(vp: ViewportTransform): string {
  return `translate(${vp.translateX}, ${vp.translateY}) scale(${vp.scale})`;
}

/**
 * Predefined zoom levels.
 */
export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

/**
 * Gets the next zoom value based on direction.
 */
export function getNextZoomValue(currentZoom: number, direction: "in" | "out"): number {
  const levels = ZOOM_LEVELS;
  if (direction === "in") {
    for (const level of levels) {
      if (level > currentZoom + 0.01) {
        return level;
      }
    }
    return levels[levels.length - 1];
  } else {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (levels[i] < currentZoom - 0.01) {
        return levels[i];
      }
    }
    return levels[0];
  }
}

/**
 * Calculates the viewport transform to center the slide in the viewport.
 */
export function getCenteredViewport(
  viewportSize: ViewportSize,
  slideSize: SlideSize,
  scale: number,
  rulerThickness: number
): ViewportTransform {
  const availableWidth = viewportSize.width - rulerThickness;
  const availableHeight = viewportSize.height - rulerThickness;

  const scaledSlideWidth = slideSize.width * scale;
  const scaledSlideHeight = slideSize.height * scale;

  const translateX = (availableWidth - scaledSlideWidth) / 2;
  const translateY = (availableHeight - scaledSlideHeight) / 2;

  return {
    translateX,
    translateY,
    scale,
  };
}

/**
 * Calculates the fit-to-view scale for a slide.
 */
export function getFitScale(
  viewportSize: ViewportSize,
  slideSize: SlideSize,
  rulerThickness: number,
  padding: number = 40
): number {
  const availableWidth = viewportSize.width - rulerThickness - padding * 2;
  const availableHeight = viewportSize.height - rulerThickness - padding * 2;

  const scaleX = availableWidth / slideSize.width;
  const scaleY = availableHeight / slideSize.height;

  return Math.min(scaleX, scaleY, 1);
}

/**
 * Applies zoom toward a cursor position.
 * Returns the new viewport transform.
 */
export function zoomTowardCursor(
  viewport: ViewportTransform,
  cursorX: number,
  cursorY: number,
  newScale: number
): ViewportTransform {
  const scaleRatio = newScale / viewport.scale;

  // Adjust translation to keep cursor position fixed
  const newTranslateX = cursorX - scaleRatio * (cursorX - viewport.translateX);
  const newTranslateY = cursorY - scaleRatio * (cursorY - viewport.translateY);

  return {
    translateX: newTranslateX,
    translateY: newTranslateY,
    scale: newScale,
  };
}

/**
 * Applies pan delta to viewport.
 */
export function panViewport(viewport: ViewportTransform, dx: number, dy: number): ViewportTransform {
  return {
    ...viewport,
    translateX: viewport.translateX + dx,
    translateY: viewport.translateY + dy,
  };
}

/**
 * Clamps viewport to prevent slide from going too far off-screen.
 */
export function clampViewport(
  viewport: ViewportTransform,
  viewportSize: ViewportSize,
  slideSize: SlideSize,
  rulerThickness: number,
  margin: number = 100
): ViewportTransform {
  const scaledWidth = slideSize.width * viewport.scale;
  const scaledHeight = slideSize.height * viewport.scale;

  const availableWidth = viewportSize.width - rulerThickness;
  const availableHeight = viewportSize.height - rulerThickness;

  // Calculate min/max translation bounds
  const minX = margin - scaledWidth;
  const maxX = availableWidth - margin;
  const minY = margin - scaledHeight;
  const maxY = availableHeight - margin;

  return {
    ...viewport,
    translateX: Math.max(minX, Math.min(maxX, viewport.translateX)),
    translateY: Math.max(minY, Math.min(maxY, viewport.translateY)),
  };
}

/**
 * Creates a viewport transform with auto-fit scale and centered position.
 */
export function createFittedViewport(
  viewportSize: ViewportSize,
  slideSize: SlideSize,
  rulerThickness: number
): ViewportTransform {
  const scale = getFitScale(viewportSize, slideSize, rulerThickness);
  return getCenteredViewport(viewportSize, slideSize, scale, rulerThickness);
}
