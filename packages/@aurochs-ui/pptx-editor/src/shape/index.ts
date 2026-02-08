/**
 * @file Shape module entry point
 *
 * Shape operation utilities for the PPTX editor.
 * This module provides pure functions for shape manipulation,
 * independent of editor state management.
 */

// =============================================================================
// Identity
// =============================================================================
export { getShapeId, hasShapeId } from "./identity";

// =============================================================================
// Query
// =============================================================================
export {
  findShapeById,
  findShapeByIdWithParents,
  getTopLevelShapeIds,
  isTopLevelShape,
} from "./query";

// =============================================================================
// Mutation
// =============================================================================
export {
  updateShapeById,
  deleteShapesById,
  reorderShape,
  moveShapeToIndex,
  generateShapeId,
} from "./mutation";

// =============================================================================
// Transform
// =============================================================================
export {
  getAbsoluteBounds,
  withUpdatedTransform,
  hasEditableTransform,
} from "./transform";
export type { AbsoluteBounds } from "./transform";

// =============================================================================
// Bounds
// =============================================================================
export {
  getShapeBounds,
  getCombinedBounds,
  getCombinedBoundsWithRotation,
  collectBoundsForIds,
  getCombinedCenter,
} from "./bounds";
export type { RotatedBoundsInput, SimpleBounds } from "./bounds";

// =============================================================================
// Capabilities
// =============================================================================
export { getShapeCapabilities } from "./capabilities";
export type { ShapeCapabilities } from "./capabilities";

// =============================================================================
// Group
// =============================================================================
export {
  getScaleFactor,
  transformChildToSlideCoords,
  transformSlideToChildCoords,
  transformGroupToSlideCoords,
  transformGroupToChildCoords,
  findGroupById,
  getTransformedChildren,
  extractChildIds,
  ungroupShape,
  collectShapesToGroup,
  createGroupTransform,
  createGroupShape,
  groupShapes,
} from "./group";

// =============================================================================
// Hierarchy
// =============================================================================
export { moveShapeInHierarchy } from "./hierarchy";
export type { ShapeHierarchyTarget } from "./hierarchy";

// =============================================================================
// Traverse
// =============================================================================
export { getShapeName, collectShapeRenderData } from "./traverse";
export type { ShapeRenderData } from "./traverse";

// =============================================================================
// Coordinates
// =============================================================================
export { clientToSlideCoords } from "./coords";

// =============================================================================
// Alignment
// =============================================================================
export {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  nudgeShapes,
} from "./alignment";
export type {
  ShapeBoundsWithId,
  AlignmentUpdate,
  HorizontalAlignment,
  VerticalAlignment,
} from "./alignment";

// =============================================================================
// Resize
// =============================================================================
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
export type { ResizeBounds, ResizeOptions } from "./resize";

// =============================================================================
// Rotate
// =============================================================================
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
export type { Point, RotationResult } from "./rotate";

// =============================================================================
// Render
// =============================================================================
export { getFillColor, getStrokeColor, getStrokeWidth } from "./render";
