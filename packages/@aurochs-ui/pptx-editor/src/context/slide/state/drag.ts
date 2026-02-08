/**
 * @file Drag state management
 *
 * State types and utilities for drag operations (move, resize, rotate).
 */

import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import type { Bounds, ShapeId } from "@aurochs-office/pptx/domain/types";
import type { IdleDragState as CoreIdleDragState } from "@aurochs-ui/editor-core/drag-state";
import {
  createIdleDragState as createCoreIdleDragState,
  isDragIdle as isCoreDragIdle,
} from "@aurochs-ui/editor-core/drag-state";

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
export type IdleDragState = CoreIdleDragState;

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
  /** Whether the drag has exceeded the threshold (confirmed as intentional drag) */
  readonly confirmed: boolean;
};

/**
 * Marquee selection drag state - selecting shapes by drawing a rectangle
 */
export type MarqueeDragState = {
  readonly type: "marquee";
  readonly startX: Pixels;
  readonly startY: Pixels;
  readonly currentX: Pixels;
  readonly currentY: Pixels;
  /** Whether to add to existing selection (shift/ctrl held) */
  readonly additive: boolean;
  /** Whether the drag has exceeded the threshold (confirmed as intentional drag) */
  readonly confirmed: boolean;
};

/**
 * Pending move drag state - waiting for threshold before confirming move
 */
export type PendingMoveDragState = {
  readonly type: "pending-move";
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** Client coordinates for threshold checking */
  readonly startClientX: number;
  readonly startClientY: number;
  readonly shapeIds: readonly ShapeId[];
  readonly initialBounds: ReadonlyMap<ShapeId, Bounds>;
};

/**
 * Pending resize drag state - waiting for threshold before confirming resize
 */
export type PendingResizeDragState = {
  readonly type: "pending-resize";
  readonly handle: ResizeHandlePosition;
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** Client coordinates for threshold checking */
  readonly startClientX: number;
  readonly startClientY: number;
  readonly shapeIds: readonly ShapeId[];
  readonly initialBoundsMap: ReadonlyMap<ShapeId, Bounds>;
  readonly combinedBounds: Bounds;
  readonly aspectLocked: boolean;
  readonly shapeId: ShapeId;
  readonly initialBounds: Bounds;
};

/**
 * Pending rotate drag state - waiting for threshold before confirming rotate
 */
export type PendingRotateDragState = {
  readonly type: "pending-rotate";
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** Client coordinates for threshold checking */
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startAngle: Degrees;
  readonly shapeIds: readonly ShapeId[];
  readonly initialRotationsMap: ReadonlyMap<ShapeId, Degrees>;
  readonly initialBoundsMap: ReadonlyMap<ShapeId, Bounds>;
  readonly centerX: Pixels;
  readonly centerY: Pixels;
  readonly shapeId: ShapeId;
  readonly initialRotation: Degrees;
};

/**
 * Drag state - idle, pending, active, or creating
 */
export type DragState =
  | IdleDragState
  | PendingMoveDragState
  | PendingResizeDragState
  | PendingRotateDragState
  | MoveDragState
  | ResizeDragState
  | RotateDragState
  | MarqueeDragState
  | CreateDragState;

// =============================================================================
// Functions
// =============================================================================

/**
 * Create idle drag state
 */
export function createIdleDragState(): IdleDragState {
  return createCoreIdleDragState();
}

/**
 * Check if drag state is idle
 */
export function isDragIdle(drag: DragState): drag is IdleDragState {
  return isCoreDragIdle(drag);
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

/**
 * Check if drag state is marquee selection
 */
export function isDragMarquee(drag: DragState): drag is MarqueeDragState {
  return drag.type === "marquee";
}

/**
 * Check if drag state is pending move
 */
export function isDragPendingMove(drag: DragState): drag is PendingMoveDragState {
  return drag.type === "pending-move";
}

/**
 * Check if drag state is pending resize
 */
export function isDragPendingResize(drag: DragState): drag is PendingResizeDragState {
  return drag.type === "pending-resize";
}

/**
 * Check if drag state is pending rotate
 */
export function isDragPendingRotate(drag: DragState): drag is PendingRotateDragState {
  return drag.type === "pending-rotate";
}

/**
 * Check if drag state is any pending state
 */
export function isDragPending(
  drag: DragState,
): drag is PendingMoveDragState | PendingResizeDragState | PendingRotateDragState {
  return drag.type === "pending-move" || drag.type === "pending-resize" || drag.type === "pending-rotate";
}
