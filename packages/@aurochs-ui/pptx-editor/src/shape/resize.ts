/**
 * @file Resize utilities
 *
 * Local wrappers around @aurochs-ui/editor-core/geometry resize functions.
 */

import type {
  ResizeBounds as CoreResizeBounds,
  ResizeOptions as CoreResizeOptions,
  ResizeHandlePosition as CoreResizeHandlePosition,
} from "@aurochs-ui/editor-core/geometry";
import {
  calculateAspectDelta as coreCalculateAspectDelta,
  applyMinConstraints as coreApplyMinConstraints,
  resizeFromNW as coreResizeFromNW,
  resizeFromN as coreResizeFromN,
  resizeFromNE as coreResizeFromNE,
  resizeFromE as coreResizeFromE,
  resizeFromSE as coreResizeFromSE,
  resizeFromS as coreResizeFromS,
  resizeFromSW as coreResizeFromSW,
  resizeFromW as coreResizeFromW,
  calculateResizeBounds as coreCalculateResizeBounds,
  calculateScaleFactors as coreCalculateScaleFactors,
  calculateRelativePosition as coreCalculateRelativePosition,
  calculateMultiResizeBounds as coreCalculateMultiResizeBounds,
} from "@aurochs-ui/editor-core/geometry";

/** Bounds representation for resize calculations */
export type ResizeBounds = CoreResizeBounds;

/** Options for resize calculation */
export type ResizeOptions = CoreResizeOptions;

/** Calculate aspect-corrected deltas when aspect ratio is locked */
export function calculateAspectDelta(
  args: { readonly dw: number; readonly dh: number; readonly aspectRatio: number; readonly aspectLocked: boolean },
): { dw: number; dh: number } {
  return coreCalculateAspectDelta(args);
}

/** Apply minimum size constraints to dimensions */
export function applyMinConstraints(
  args: { readonly width: number; readonly height: number; readonly minWidth: number; readonly minHeight: number },
): { width: number; height: number } {
  return coreApplyMinConstraints(args);
}

/** Calculate new bounds for northwest (top-left) corner resize */
export function resizeFromNW(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions },
): ResizeBounds {
  return coreResizeFromNW(args);
}

/** Calculate new bounds for north (top) edge resize */
export function resizeFromN(initial: ResizeBounds, dy: number, options: ResizeOptions): ResizeBounds {
  return coreResizeFromN(initial, dy, options);
}

/** Calculate new bounds for northeast (top-right) corner resize */
export function resizeFromNE(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions },
): ResizeBounds {
  return coreResizeFromNE(args);
}

/** Calculate new bounds for east (right) edge resize */
export function resizeFromE(initial: ResizeBounds, dx: number, options: ResizeOptions): ResizeBounds {
  return coreResizeFromE(initial, dx, options);
}

/** Calculate new bounds for southeast (bottom-right) corner resize */
export function resizeFromSE(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions },
): ResizeBounds {
  return coreResizeFromSE(args);
}

/** Calculate new bounds for south (bottom) edge resize */
export function resizeFromS(initial: ResizeBounds, dy: number, options: ResizeOptions): ResizeBounds {
  return coreResizeFromS(initial, dy, options);
}

/** Calculate new bounds for southwest (bottom-left) corner resize */
export function resizeFromSW(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions },
): ResizeBounds {
  return coreResizeFromSW(args);
}

/** Calculate new bounds for west (left) edge resize */
export function resizeFromW(initial: ResizeBounds, dx: number, options: ResizeOptions): ResizeBounds {
  return coreResizeFromW(initial, dx, options);
}

/** Calculate new bounds based on resize handle position and delta */
export function calculateResizeBounds(args: {
  readonly handle: CoreResizeHandlePosition;
  readonly initial: ResizeBounds;
  readonly dx: number;
  readonly dy: number;
  readonly options: ResizeOptions;
}): ResizeBounds {
  return coreCalculateResizeBounds(args);
}

/** Calculate scale factors from old to new combined bounds */
export function calculateScaleFactors(
  oldBounds: ResizeBounds,
  newBounds: ResizeBounds,
): { scaleX: number; scaleY: number } {
  return coreCalculateScaleFactors(oldBounds, newBounds);
}

/** Calculate relative position of a shape within combined bounds (0-1 range) */
export function calculateRelativePosition(
  shapeBounds: ResizeBounds,
  combinedBounds: ResizeBounds,
): { relX: number; relY: number } {
  return coreCalculateRelativePosition(shapeBounds, combinedBounds);
}

/** Calculate new bounds for a shape within a multi-selection resize */
export function calculateMultiResizeBounds(
  shapeBounds: ResizeBounds,
  combinedOld: ResizeBounds,
  combinedNew: ResizeBounds,
): ResizeBounds {
  return coreCalculateMultiResizeBounds(shapeBounds, combinedOld, combinedNew);
}
