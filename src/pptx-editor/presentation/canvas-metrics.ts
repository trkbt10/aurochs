/**
 * @file Canvas layout metrics
 *
 * Helpers for centering the canvas in the scroll viewport.
 */

import type { CanvasViewport } from "./use-canvas-viewport";

export type CanvasStageMetrics = {
  readonly stageWidth: number;
  readonly stageHeight: number;
  readonly canvasOffsetX: number;
  readonly canvasOffsetY: number;
};

export type CanvasScrollTarget = {
  readonly scrollLeft: number;
  readonly scrollTop: number;
};

/**
 * Calculate stage size and canvas offsets for centering.
 */
export function getCanvasStageMetrics(
  viewport: CanvasViewport,
  canvasWidth: number,
  canvasHeight: number
): CanvasStageMetrics {
  const stageWidth = Math.max(canvasWidth, viewport.width);
  const stageHeight = Math.max(canvasHeight, viewport.height);
  const canvasOffsetX = (stageWidth - canvasWidth) / 2;
  const canvasOffsetY = (stageHeight - canvasHeight) / 2;

  return {
    stageWidth,
    stageHeight,
    canvasOffsetX,
    canvasOffsetY,
  };
}

/**
 * Scroll offsets to keep the stage centered in the viewport.
 */
export function getCenteredScrollTarget(
  viewport: CanvasViewport,
  stageMetrics: CanvasStageMetrics
): CanvasScrollTarget {
  const scrollLeft = Math.max(0, (stageMetrics.stageWidth - viewport.width) / 2);
  const scrollTop = Math.max(0, (stageMetrics.stageHeight - viewport.height) / 2);

  return { scrollLeft, scrollTop };
}
