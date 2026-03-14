/**
 * @file Generic drag state helpers
 *
 * Provides shared types and helpers for drag-state unions.
 * All types use plain `number` (not branded types) for format independence.
 * Format-specific packages can specialize via type aliases.
 */

import type { ResizeHandlePosition, SimpleBounds } from "./geometry/types";

// Re-export for convenience
export type { ResizeHandlePosition } from "./geometry/types";

// =============================================================================
// Base States
// =============================================================================

export type IdleDragState = {
  readonly type: "idle";
};

// =============================================================================
// Preview Delta
// =============================================================================

/**
 * Preview delta for move/resize operations (in canvas coordinates)
 */
export type PreviewDelta = {
  readonly dx: number;
  readonly dy: number;
};

// =============================================================================
// Active Drag States
// =============================================================================

/**
 * Move drag state - moving one or more shapes
 */
export type MoveDragState<TId = string> = {
  readonly type: "move";
  readonly startX: number;
  readonly startY: number;
  readonly shapeIds: readonly TId[];
  readonly initialBounds: ReadonlyMap<TId, SimpleBounds>;
  /** Current preview delta from start position (updated during drag, not committed to history) */
  readonly previewDelta: PreviewDelta;
};

/**
 * Resize drag state - resizing one or more shapes
 */
export type ResizeDragState<TId = string> = {
  readonly type: "resize";
  readonly handle: ResizeHandlePosition;
  readonly startX: number;
  readonly startY: number;
  /** All shapes being resized (for multi-selection) */
  readonly shapeIds: readonly TId[];
  /** Initial bounds for each shape */
  readonly initialBoundsMap: ReadonlyMap<TId, SimpleBounds>;
  /** Combined bounding box (for multi-selection) */
  readonly combinedBounds: SimpleBounds;
  readonly aspectLocked: boolean;
  /** Primary shape ID for backwards compatibility */
  readonly shapeId: TId;
  readonly initialBounds: SimpleBounds;
  /** Current preview delta from start position (updated during drag, not committed to history) */
  readonly previewDelta: PreviewDelta;
};

/**
 * Rotate drag state - rotating one or more shapes
 */
export type RotateDragState<TId = string> = {
  readonly type: "rotate";
  readonly startAngle: number;
  /** All shapes being rotated (for multi-selection) */
  readonly shapeIds: readonly TId[];
  /** Initial rotation for each shape */
  readonly initialRotationsMap: ReadonlyMap<TId, number>;
  /** Initial bounds for each shape (needed for center calculation) */
  readonly initialBoundsMap: ReadonlyMap<TId, SimpleBounds>;
  /** Combined center point */
  readonly centerX: number;
  readonly centerY: number;
  /** Primary shape ID for backwards compatibility */
  readonly shapeId: TId;
  readonly initialRotation: number;
  /** Current preview angle delta from start angle (updated during drag, not committed to history) */
  readonly previewAngleDelta: number;
};

/**
 * Create drag state - drawing a new shape
 */
export type CreateDragState = {
  readonly type: "create";
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  /** Whether the drag has exceeded the threshold (confirmed as intentional drag) */
  readonly confirmed: boolean;
};

/**
 * Marquee selection drag state - selecting shapes by drawing a rectangle
 */
export type MarqueeDragState = {
  readonly type: "marquee";
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  /** Whether to add to existing selection (shift/ctrl held) */
  readonly additive: boolean;
  /** Whether the drag has exceeded the threshold (confirmed as intentional drag) */
  readonly confirmed: boolean;
};

// =============================================================================
// Pending States (threshold-based)
// =============================================================================

/**
 * Pending move drag state - waiting for threshold before confirming move
 */
export type PendingMoveDragState<TId = string> = {
  readonly type: "pending-move";
  readonly startX: number;
  readonly startY: number;
  /** Client coordinates for threshold checking */
  readonly startClientX: number;
  readonly startClientY: number;
  readonly shapeIds: readonly TId[];
  readonly initialBounds: ReadonlyMap<TId, SimpleBounds>;
};

/**
 * Pending resize drag state - waiting for threshold before confirming resize
 */
export type PendingResizeDragState<TId = string> = {
  readonly type: "pending-resize";
  readonly handle: ResizeHandlePosition;
  readonly startX: number;
  readonly startY: number;
  /** Client coordinates for threshold checking */
  readonly startClientX: number;
  readonly startClientY: number;
  readonly shapeIds: readonly TId[];
  readonly initialBoundsMap: ReadonlyMap<TId, SimpleBounds>;
  readonly combinedBounds: SimpleBounds;
  readonly aspectLocked: boolean;
  readonly shapeId: TId;
  readonly initialBounds: SimpleBounds;
};

/**
 * Pending rotate drag state - waiting for threshold before confirming rotate
 */
export type PendingRotateDragState<TId = string> = {
  readonly type: "pending-rotate";
  readonly startX: number;
  readonly startY: number;
  /** Client coordinates for threshold checking */
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startAngle: number;
  readonly shapeIds: readonly TId[];
  readonly initialRotationsMap: ReadonlyMap<TId, number>;
  readonly initialBoundsMap: ReadonlyMap<TId, SimpleBounds>;
  readonly centerX: number;
  readonly centerY: number;
  readonly shapeId: TId;
  readonly initialRotation: number;
};

// =============================================================================
// Union Type
// =============================================================================

/**
 * Generic drag state union - idle, pending, active, or creating.
 * TId defaults to string for format-independent use.
 */
export type DragState<TId = string> =
  | IdleDragState
  | PendingMoveDragState<TId>
  | PendingResizeDragState<TId>
  | PendingRotateDragState<TId>
  | MoveDragState<TId>
  | ResizeDragState<TId>
  | RotateDragState<TId>
  | MarqueeDragState
  | CreateDragState;

// =============================================================================
// Factory & Type Guards
// =============================================================================

/**
 * Create an idle drag state.
 */
export function createIdleDragState(): IdleDragState {
  return { type: "idle" };
}

/**
 * Check if a drag state is idle.
 */
export function isDragIdle<TDrag extends { readonly type: string }>(
  drag: TDrag,
): drag is Extract<TDrag, IdleDragState> {
  return drag.type === "idle";
}

/**
 * Check if drag state is move.
 */
export function isDragMove<TId>(drag: DragState<TId>): drag is MoveDragState<TId> {
  return drag.type === "move";
}

/**
 * Check if drag state is resize.
 */
export function isDragResize<TId>(drag: DragState<TId>): drag is ResizeDragState<TId> {
  return drag.type === "resize";
}

/**
 * Check if drag state is rotate.
 */
export function isDragRotate<TId>(drag: DragState<TId>): drag is RotateDragState<TId> {
  return drag.type === "rotate";
}

/**
 * Check if drag state is create.
 */
export function isDragCreate<TId>(drag: DragState<TId>): drag is CreateDragState {
  return drag.type === "create";
}

/**
 * Check if drag state is marquee selection.
 */
export function isDragMarquee<TId>(drag: DragState<TId>): drag is MarqueeDragState {
  return drag.type === "marquee";
}

/**
 * Check if drag state is pending move.
 */
export function isDragPendingMove<TId>(drag: DragState<TId>): drag is PendingMoveDragState<TId> {
  return drag.type === "pending-move";
}

/**
 * Check if drag state is pending resize.
 */
export function isDragPendingResize<TId>(drag: DragState<TId>): drag is PendingResizeDragState<TId> {
  return drag.type === "pending-resize";
}

/**
 * Check if drag state is pending rotate.
 */
export function isDragPendingRotate<TId>(drag: DragState<TId>): drag is PendingRotateDragState<TId> {
  return drag.type === "pending-rotate";
}

/**
 * Check if drag state is any pending state.
 */
export function isDragPending<TId>(
  drag: DragState<TId>,
): drag is PendingMoveDragState<TId> | PendingResizeDragState<TId> | PendingRotateDragState<TId> {
  return drag.type === "pending-move" || drag.type === "pending-resize" || drag.type === "pending-rotate";
}
