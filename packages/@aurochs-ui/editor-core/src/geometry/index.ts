/**
 * @file Geometry module entry point
 *
 * Pure math utilities for shape geometry: rotation, resize, bounds, and coordinates.
 */

// Types
export type {
  Point,
  SimpleBounds,
  RotatedBoundsInput,
  RotationResult,
  ResizeHandlePosition,
  ResizeBounds,
  ResizeOptions,
} from "./types";

// Rotation
export {
  normalizeAngle,
  degreesToRadians,
  radiansToDegrees,
  calculateAngleFromCenter,
  DEFAULT_SNAP_ANGLES,
  DEFAULT_SNAP_THRESHOLD,
  snapAngle,
  rotatePointAroundCenter,
  calculateShapeCenter,
  getRotatedCorners,
  getSvgRotationTransform,
  getSvgRotationTransformForBounds,
  rotateShapeAroundCenter,
  calculateRotationDelta,
} from "./rotate";

// Resize
export {
  calculateAspectDelta,
  applyMinConstraints,
  resizeFromNW,
  resizeFromN,
  resizeFromNE,
  resizeFromE,
  resizeFromSE,
  resizeFromS,
  resizeFromSW,
  resizeFromW,
  calculateResizeBounds,
  calculateScaleFactors,
  calculateRelativePosition,
  calculateMultiResizeBounds,
} from "./resize";

// Bounds
export {
  getCombinedBoundsWithRotation,
  isPointInBounds,
} from "./bounds";

// Coordinates
export {
  clientToCanvasCoords,
} from "./coords";

// Drag preview
export type {
  MoveDragPreviewInput,
  ResizeDragPreviewInput,
  RotateDragPreviewInput,
} from "./drag-preview";
export {
  calculateResizedDimensions,
  applyMovePreview,
  applyResizePreview,
  applyRotatePreview,
  applyDragPreview,
} from "./drag-preview";
