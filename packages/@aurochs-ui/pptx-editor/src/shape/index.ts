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
export { getShapeId } from "./identity";

// =============================================================================
// Query
// =============================================================================
export {
  findShapeById,
  findShapeByIdWithParents,
  getTopLevelShapeIds,
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
// Bounds
// =============================================================================
export {
  getShapeBounds,
  getCombinedBounds,
  collectBoundsForIds,
  getCombinedCenter,
} from "./bounds";

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
export { collectShapeRenderData } from "./traverse";
export type { ShapeRenderData } from "./traverse";

// =============================================================================
// Alignment
// =============================================================================
export { calculateAlignedBounds } from "./alignment";
export type {
  ShapeBoundsWithId,
  AlignmentUpdate,
  HorizontalAlignment,
  VerticalAlignment,
} from "./alignment";

