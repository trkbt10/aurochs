/**
 * @file DOCX Editor Drag State
 *
 * Manages drag interactions in the DOCX editor.
 * Uses discriminated union pattern for type-safe drag state handling.
 */

import type { ElementId, TextPosition } from "./selection";

// =============================================================================
// Types
// =============================================================================

/**
 * 2D point coordinates.
 */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * Idle drag state (no drag in progress).
 */
export type IdleDragState = {
  readonly type: "idle";
};

/**
 * Text selection drag state.
 *
 * Used when user is selecting text by dragging.
 */
export type TextSelectDragState = {
  readonly type: "textSelect";
  /** Anchor position (where drag started) */
  readonly anchor: TextPosition;
  /** Current position (where drag is now) */
  readonly current: TextPosition;
};

/**
 * Element move drag state.
 *
 * Used when user is moving paragraphs or other elements.
 */
export type ElementMoveDragState = {
  readonly type: "elementMove";
  /** IDs of elements being moved */
  readonly elementIds: readonly ElementId[];
  /** Starting mouse position */
  readonly startPosition: Point;
  /** Current mouse position */
  readonly currentPosition: Point;
  /** Target drop index (where elements will be inserted) */
  readonly dropIndex: number | undefined;
};

/**
 * Table resize drag state.
 *
 * Used when resizing table columns or rows.
 */
export type TableResizeDragState = {
  readonly type: "tableResize";
  /** Table element ID */
  readonly tableId: ElementId;
  /** Resize direction */
  readonly direction: "column" | "row";
  /** Index of column/row being resized */
  readonly index: number;
  /** Starting size in pixels */
  readonly startSize: number;
  /** Current size in pixels */
  readonly currentSize: number;
};

/**
 * Image resize drag state.
 *
 * Used when resizing inline images.
 */
export type ImageResizeDragState = {
  readonly type: "imageResize";
  /** Image element ID */
  readonly imageId: ElementId;
  /** Resize handle position */
  readonly handle: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "top" | "bottom" | "left" | "right";
  /** Starting dimensions */
  readonly startWidth: number;
  readonly startHeight: number;
  /** Current dimensions */
  readonly currentWidth: number;
  readonly currentHeight: number;
  /** Whether to preserve aspect ratio */
  readonly preserveAspectRatio: boolean;
};

/**
 * Combined drag state (discriminated union).
 */
export type DocxDragState =
  | IdleDragState
  | TextSelectDragState
  | ElementMoveDragState
  | TableResizeDragState
  | ImageResizeDragState;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create idle drag state.
 */
export function createIdleDragState(): IdleDragState {
  return { type: "idle" };
}

/**
 * Create text selection drag state.
 */
export function createTextSelectDragState(anchor: TextPosition): TextSelectDragState {
  return {
    type: "textSelect",
    anchor,
    current: anchor,
  };
}

/**
 * Create element move drag state.
 */
export function createElementMoveDragState(
  elementIds: readonly ElementId[],
  startPosition: Point,
): ElementMoveDragState {
  return {
    type: "elementMove",
    elementIds,
    startPosition,
    currentPosition: startPosition,
    dropIndex: undefined,
  };
}

/**
 * Create table resize drag state.
 */
export function createTableResizeDragState(
  tableId: ElementId,
  direction: "column" | "row",
  index: number,
  startSize: number,
): TableResizeDragState {
  return {
    type: "tableResize",
    tableId,
    direction,
    index,
    startSize,
    currentSize: startSize,
  };
}

/**
 * Create image resize drag state.
 */
export function createImageResizeDragState(
  imageId: ElementId,
  handle: ImageResizeDragState["handle"],
  startWidth: number,
  startHeight: number,
  preserveAspectRatio: boolean = true,
): ImageResizeDragState {
  return {
    type: "imageResize",
    imageId,
    handle,
    startWidth,
    startHeight,
    currentWidth: startWidth,
    currentHeight: startHeight,
    preserveAspectRatio,
  };
}

// =============================================================================
// Update Functions
// =============================================================================

/**
 * Update text selection drag current position.
 */
export function updateTextSelectDrag(
  state: TextSelectDragState,
  current: TextPosition,
): TextSelectDragState {
  return {
    ...state,
    current,
  };
}

/**
 * Update element move drag position.
 */
export function updateElementMoveDrag(
  state: ElementMoveDragState,
  currentPosition: Point,
  dropIndex?: number,
): ElementMoveDragState {
  return {
    ...state,
    currentPosition,
    dropIndex: dropIndex ?? state.dropIndex,
  };
}

/**
 * Update table resize drag size.
 */
export function updateTableResizeDrag(
  state: TableResizeDragState,
  currentSize: number,
): TableResizeDragState {
  return {
    ...state,
    currentSize,
  };
}

/**
 * Update image resize drag dimensions.
 */
export function updateImageResizeDrag(
  state: ImageResizeDragState,
  currentWidth: number,
  currentHeight: number,
): ImageResizeDragState {
  return {
    ...state,
    currentWidth,
    currentHeight,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if drag state is idle.
 */
export function isDragIdle(state: DocxDragState): state is IdleDragState {
  return state.type === "idle";
}

/**
 * Check if drag state is text selection.
 */
export function isDragTextSelect(state: DocxDragState): state is TextSelectDragState {
  return state.type === "textSelect";
}

/**
 * Check if drag state is element move.
 */
export function isDragElementMove(state: DocxDragState): state is ElementMoveDragState {
  return state.type === "elementMove";
}

/**
 * Check if drag state is table resize.
 */
export function isDragTableResize(state: DocxDragState): state is TableResizeDragState {
  return state.type === "tableResize";
}

/**
 * Check if drag state is image resize.
 */
export function isDragImageResize(state: DocxDragState): state is ImageResizeDragState {
  return state.type === "imageResize";
}

/**
 * Check if any drag is in progress.
 */
export function isDragging(state: DocxDragState): boolean {
  return state.type !== "idle";
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate drag delta from start position.
 */
export function getDragDelta(state: ElementMoveDragState): Point {
  return {
    x: state.currentPosition.x - state.startPosition.x,
    y: state.currentPosition.y - state.startPosition.y,
  };
}

/**
 * Calculate size change for table resize.
 */
export function getResizeDelta(state: TableResizeDragState): number {
  return state.currentSize - state.startSize;
}
