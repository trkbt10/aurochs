/**
 * @file Resize calculation utilities
 *
 * Pure functions for calculating shape resize transformations.
 */

import type { ResizeHandlePosition } from "../context/slide/state";

// =============================================================================
// Types
// =============================================================================

/**
 * Bounds representation for resize calculations
 */
export type ResizeBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Options for resize calculation
 */
export type ResizeOptions = {
  /** Whether aspect ratio should be locked */
  readonly aspectLocked: boolean;
  /** Minimum width constraint */
  readonly minWidth: number;
  /** Minimum height constraint */
  readonly minHeight: number;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate aspect-corrected deltas when aspect ratio is locked.
 *
 * Uses the larger delta magnitude to maintain aspect ratio.
 */
export function calculateAspectDelta(
  args: { readonly dw: number; readonly dh: number; readonly aspectRatio: number; readonly aspectLocked: boolean }
): { dw: number; dh: number } {
  const { dw, dh, aspectRatio, aspectLocked } = args;
  if (!aspectLocked) {return { dw, dh };}

  const aspectDw = dh * aspectRatio;

  if (Math.abs(dw) > Math.abs(aspectDw)) {
    return { dw, dh: dw / aspectRatio };
  }
  return { dw: dh * aspectRatio, dh };
}

/**
 * Apply minimum size constraints to dimensions.
 */
export function applyMinConstraints(
  args: { readonly width: number; readonly height: number; readonly minWidth: number; readonly minHeight: number }
): { width: number; height: number } {
  const { width, height, minWidth, minHeight } = args;
  return {
    width: Math.max(minWidth, width),
    height: Math.max(minHeight, height),
  };
}

// =============================================================================
// Single Shape Resize
// =============================================================================

/**
 * Calculate new bounds for northwest (top-left) corner resize.
 */
export function resizeFromNW(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions }
): ResizeBounds {
  const { initial, dx, dy, options } = args;
  const aspectRatio = initial.width / initial.height;
  const { dw, dh } = calculateAspectDelta({ dw: -dx, dh: -dy, aspectRatio, aspectLocked: options.aspectLocked });

  const newWidth = Math.max(options.minWidth, initial.width + dw);
  const newHeight = Math.max(options.minHeight, initial.height + dh);

  return {
    x: initial.x + initial.width - newWidth,
    y: initial.y + initial.height - newHeight,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Calculate new bounds for north (top) edge resize.
 */
export function resizeFromN(
  initial: ResizeBounds,
  dy: number,
  options: ResizeOptions
): ResizeBounds {
  const aspectRatio = initial.width / initial.height;
  const newHeight = Math.max(options.minHeight, initial.height - dy);

  if (options.aspectLocked) {
    const newWidth = newHeight * aspectRatio;
    return {
      x: initial.x + (initial.width - newWidth) / 2,
      y: initial.y + initial.height - newHeight,
      width: newWidth,
      height: newHeight,
    };
  }

  return {
    x: initial.x,
    y: initial.y + initial.height - newHeight,
    width: initial.width,
    height: newHeight,
  };
}

/**
 * Calculate new bounds for northeast (top-right) corner resize.
 */
export function resizeFromNE(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions }
): ResizeBounds {
  const { initial, dx, dy, options } = args;
  const aspectRatio = initial.width / initial.height;
  const { dw, dh } = calculateAspectDelta({ dw: dx, dh: -dy, aspectRatio, aspectLocked: options.aspectLocked });

  const newWidth = Math.max(options.minWidth, initial.width + dw);
  const newHeight = Math.max(options.minHeight, initial.height + dh);

  return {
    x: initial.x,
    y: initial.y + initial.height - newHeight,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Calculate new bounds for east (right) edge resize.
 */
export function resizeFromE(
  initial: ResizeBounds,
  dx: number,
  options: ResizeOptions
): ResizeBounds {
  const aspectRatio = initial.width / initial.height;
  const newWidth = Math.max(options.minWidth, initial.width + dx);

  if (options.aspectLocked) {
    const newHeight = newWidth / aspectRatio;
    return {
      x: initial.x,
      y: initial.y + (initial.height - newHeight) / 2,
      width: newWidth,
      height: newHeight,
    };
  }

  return {
    x: initial.x,
    y: initial.y,
    width: newWidth,
    height: initial.height,
  };
}

/**
 * Calculate new bounds for southeast (bottom-right) corner resize.
 */
export function resizeFromSE(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions }
): ResizeBounds {
  const { initial, dx, dy, options } = args;
  const aspectRatio = initial.width / initial.height;
  const { dw, dh } = calculateAspectDelta({ dw: dx, dh: dy, aspectRatio, aspectLocked: options.aspectLocked });

  return {
    x: initial.x,
    y: initial.y,
    width: Math.max(options.minWidth, initial.width + dw),
    height: Math.max(options.minHeight, initial.height + dh),
  };
}

/**
 * Calculate new bounds for south (bottom) edge resize.
 */
export function resizeFromS(
  initial: ResizeBounds,
  dy: number,
  options: ResizeOptions
): ResizeBounds {
  const aspectRatio = initial.width / initial.height;
  const newHeight = Math.max(options.minHeight, initial.height + dy);

  if (options.aspectLocked) {
    const newWidth = newHeight * aspectRatio;
    return {
      x: initial.x + (initial.width - newWidth) / 2,
      y: initial.y,
      width: newWidth,
      height: newHeight,
    };
  }

  return {
    x: initial.x,
    y: initial.y,
    width: initial.width,
    height: newHeight,
  };
}

/**
 * Calculate new bounds for southwest (bottom-left) corner resize.
 */
export function resizeFromSW(
  args: { readonly initial: ResizeBounds; readonly dx: number; readonly dy: number; readonly options: ResizeOptions }
): ResizeBounds {
  const { initial, dx, dy, options } = args;
  const aspectRatio = initial.width / initial.height;
  const { dw, dh } = calculateAspectDelta({ dw: -dx, dh: dy, aspectRatio, aspectLocked: options.aspectLocked });

  const newWidth = Math.max(options.minWidth, initial.width + dw);
  const newHeight = Math.max(options.minHeight, initial.height + dh);

  return {
    x: initial.x + initial.width - newWidth,
    y: initial.y,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Calculate new bounds for west (left) edge resize.
 */
export function resizeFromW(
  initial: ResizeBounds,
  dx: number,
  options: ResizeOptions
): ResizeBounds {
  const aspectRatio = initial.width / initial.height;
  const newWidth = Math.max(options.minWidth, initial.width - dx);

  if (options.aspectLocked) {
    const newHeight = newWidth / aspectRatio;
    return {
      x: initial.x + initial.width - newWidth,
      y: initial.y + (initial.height - newHeight) / 2,
      width: newWidth,
      height: newHeight,
    };
  }

  return {
    x: initial.x + initial.width - newWidth,
    y: initial.y,
    width: newWidth,
    height: initial.height,
  };
}

/**
 * Calculate new bounds based on resize handle position and delta.
 *
 * Dispatches to the appropriate resize function based on handle position.
 */
export function calculateResizeBounds(
  args: {
    readonly handle: ResizeHandlePosition;
    readonly initial: ResizeBounds;
    readonly dx: number;
    readonly dy: number;
    readonly options: ResizeOptions;
  }
): ResizeBounds {
  const { handle, initial, dx, dy, options } = args;
  switch (handle) {
    case "nw":
      return resizeFromNW({ initial, dx, dy, options });
    case "n":
      return resizeFromN(initial, dy, options);
    case "ne":
      return resizeFromNE({ initial, dx, dy, options });
    case "e":
      return resizeFromE(initial, dx, options);
    case "se":
      return resizeFromSE({ initial, dx, dy, options });
    case "s":
      return resizeFromS(initial, dy, options);
    case "sw":
      return resizeFromSW({ initial, dx, dy, options });
    case "w":
      return resizeFromW(initial, dx, options);
  }
}

// =============================================================================
// Multi-Selection Resize
// =============================================================================

/**
 * Calculate scale factors from old to new combined bounds.
 */
export function calculateScaleFactors(
  oldBounds: ResizeBounds,
  newBounds: ResizeBounds
): { scaleX: number; scaleY: number } {
  return {
    scaleX: oldBounds.width > 0 ? newBounds.width / oldBounds.width : 1,
    scaleY: oldBounds.height > 0 ? newBounds.height / oldBounds.height : 1,
  };
}

/**
 * Calculate relative position of a shape within combined bounds (0-1 range).
 */
export function calculateRelativePosition(
  shapeBounds: ResizeBounds,
  combinedBounds: ResizeBounds
): { relX: number; relY: number } {
  return {
    relX: combinedBounds.width > 0 ? (shapeBounds.x - combinedBounds.x) / combinedBounds.width : 0,
    relY: combinedBounds.height > 0 ? (shapeBounds.y - combinedBounds.y) / combinedBounds.height : 0,
  };
}

/**
 * Calculate new bounds for a shape within a multi-selection resize.
 *
 * Applies proportional scaling based on the shape's position within the combined bounds.
 */
export function calculateMultiResizeBounds(
  shapeBounds: ResizeBounds,
  combinedOld: ResizeBounds,
  combinedNew: ResizeBounds
): ResizeBounds {
  const { scaleX, scaleY } = calculateScaleFactors(combinedOld, combinedNew);
  const { relX, relY } = calculateRelativePosition(shapeBounds, combinedOld);

  return {
    x: combinedNew.x + relX * combinedNew.width,
    y: combinedNew.y + relY * combinedNew.height,
    width: shapeBounds.width * scaleX,
    height: shapeBounds.height * scaleY,
  };
}
