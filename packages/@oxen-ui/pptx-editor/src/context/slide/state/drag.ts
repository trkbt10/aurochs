/**
 * @file Drag state management
 *
 * State types and utilities for drag operations (move, resize, rotate).
 */

import type { Pixels, Degrees } from "@oxen/ooxml/domain/units";
import type { Bounds, ShapeId } from "@oxen/pptx/domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Resize handle positions
 */
export type ResizeHandlePosition =
  | "nw" // top-left
  | "n" // top-center
  | "ne" // top-right
  | "e" // middle-right
  | "se" // bottom-right
  | "s" // bottom-center
  | "sw" // bottom-left
  | "w"; // middle-left

/**
 * Idle state - no drag operation in progress
 */
export type IdleDragState = {
  readonly type: "idle";
};

/**
 * Preview delta for move/resize operations
 */
export type PreviewDelta = {
  readonly dx: Pixels;
  readonly dy: Pixels;
};

/**
 * Move drag state
 */
export type MoveDragState = {
  readonly type: "move";
  readonly startX: Pixels;
  readonly startY: Pixels;
  readonly shapeIds: readonly ShapeId[];
  readonly initialBounds: ReadonlyMap<ShapeId, Bounds>;
  /** Current preview delta from start position (updated during drag, not committed to history) */
  readonly previewDelta: PreviewDelta;
};

/**
 * Resize drag state
 */
export type ResizeDragState = {
  readonly type: "resize";
  readonly handle: ResizeHandlePosition;
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** All shapes being resized (for multi-selection) */
  readonly shapeIds: readonly ShapeId[];
  /** Initial bounds for each shape */
  readonly initialBoundsMap: ReadonlyMap<ShapeId, Bounds>;
  /** Combined bounding box (for multi-selection) */
  readonly combinedBounds: Bounds;
  readonly aspectLocked: boolean;
  /** Primary shape ID for backwards compatibility */
  readonly shapeId: ShapeId;
  readonly initialBounds: Bounds;
  /** Current preview delta from start position (updated during drag, not committed to history) */
  readonly previewDelta: PreviewDelta;
};

/**
 * Rotate drag state
 */
export type RotateDragState = {
  readonly type: "rotate";
  readonly startAngle: Degrees;
  /** All shapes being rotated (for multi-selection) */
  readonly shapeIds: readonly ShapeId[];
  /** Initial rotation for each shape */
  readonly initialRotationsMap: ReadonlyMap<ShapeId, Degrees>;
  /** Initial bounds for each shape (needed for center calculation) */
  readonly initialBoundsMap: ReadonlyMap<ShapeId, Bounds>;
  /** Combined center point */
  readonly centerX: Pixels;
  readonly centerY: Pixels;
  /** Primary shape ID for backwards compatibility */
  readonly shapeId: ShapeId;
  readonly initialRotation: Degrees;
  /** Current preview angle delta from start angle (updated during drag, not committed to history) */
  readonly previewAngleDelta: Degrees;
};

/**
 * Create drag state - drawing a new shape
 */
export type CreateDragState = {
  readonly type: "create";
  readonly startX: Pixels;
  readonly startY: Pixels;
  readonly currentX: Pixels;
  readonly currentY: Pixels;
};

/**
 * Drag state - idle, moving, resizing, rotating, or creating
 */
export type DragState =
  | IdleDragState
  | MoveDragState
  | ResizeDragState
  | RotateDragState
  | CreateDragState;

// =============================================================================
// Functions
// =============================================================================

/**
 * Create idle drag state
 */
export function createIdleDragState(): IdleDragState {
  return { type: "idle" };
}

/**
 * Check if drag state is idle
 */
export function isDragIdle(drag: DragState): drag is IdleDragState {
  return drag.type === "idle";
}

/**
 * Check if drag state is move
 */
export function isDragMove(drag: DragState): drag is MoveDragState {
  return drag.type === "move";
}

/**
 * Check if drag state is resize
 */
export function isDragResize(drag: DragState): drag is ResizeDragState {
  return drag.type === "resize";
}

/**
 * Check if drag state is rotate
 */
export function isDragRotate(drag: DragState): drag is RotateDragState {
  return drag.type === "rotate";
}

/**
 * Check if drag state is create
 */
export function isDragCreate(drag: DragState): drag is CreateDragState {
  return drag.type === "create";
}
