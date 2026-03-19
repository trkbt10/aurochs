/**
 * @file Shape editor module entry point
 *
 * Generic shape operation utilities shared across format-specific editors.
 * These operate on abstract ShapeNode interfaces rather than PPTX-specific types.
 */

// =============================================================================
// Types
// =============================================================================
export type {
  ShapeNode,
  IdentifiableShape,
  GroupShapeNode,
  ShapeArray,
} from "./types";
export {
  isIdentifiable,
  getShapeId as getShapeNodeId,
  isGroupShape,
  getShapeName as getShapeNodeName,
} from "./types";

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
export type {
  ShapeTransform,
  GroupShapeTransform,
  AbsoluteBounds,
  TransformResolver,
} from "./transform";
export { getAbsoluteBounds } from "./transform";

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
// Traverse
// =============================================================================
export type { ShapeRenderData, RenderDataResolver } from "./traverse";
export { collectShapeRenderData } from "./traverse";

// =============================================================================
// Canvas Controls
// =============================================================================
export { SNAP_STEPS, getSnapOptions, snapValue } from "./canvas-controls";
export { CanvasControls, type CanvasControlsProps } from "./CanvasControls";
