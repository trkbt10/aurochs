/**
 * @file Slide editor types for Phase 2
 */

import type { Slide, Shape } from "../../pptx/domain";
import type { Bounds, Pixels, Degrees, ShapeId } from "../../pptx/domain/types";

// Re-export ShapeId for convenience
export type { ShapeId } from "../../pptx/domain/types";

/**
 * Selection state for slide editor
 */
export type SelectionState = {
  /** Currently selected shape IDs */
  readonly selectedIds: readonly ShapeId[];
  /** Primary selection (first selected or last clicked in multi-select) */
  readonly primaryId: ShapeId | undefined;
};

/**
 * Create empty selection state
 */
export function createEmptySelection(): SelectionState {
  return {
    selectedIds: [],
    primaryId: undefined,
  };
}

// =============================================================================
// Drag Types
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
 * Drag state - idle, moving, resizing, or rotating
 */
export type DragState =
  | { readonly type: "idle" }
  | {
      readonly type: "move";
      readonly startX: Pixels;
      readonly startY: Pixels;
      readonly shapeIds: readonly ShapeId[];
      readonly initialBounds: ReadonlyMap<ShapeId, Bounds>;
    }
  | {
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
    }
  | {
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
    };

/**
 * Create idle drag state
 */
export function createIdleDragState(): DragState {
  return { type: "idle" };
}

// =============================================================================
// Undo/Redo Types
// =============================================================================

/**
 * Undo/Redo history for any type T
 */
export type UndoRedoHistory<T> = {
  /** Past states (most recent at end) */
  readonly past: readonly T[];
  /** Current state */
  readonly present: T;
  /** Future states (for redo, most recent at start) */
  readonly future: readonly T[];
};

/**
 * Create initial history with given present value
 */
export function createHistory<T>(initial: T): UndoRedoHistory<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

/**
 * Push new state to history (clears future)
 */
export function pushHistory<T>(
  history: UndoRedoHistory<T>,
  newPresent: T
): UndoRedoHistory<T> {
  return {
    past: [...history.past, history.present],
    present: newPresent,
    future: [],
  };
}

/**
 * Undo - move to previous state
 */
export function undoHistory<T>(
  history: UndoRedoHistory<T>
): UndoRedoHistory<T> {
  if (history.past.length === 0) {
    return history;
  }
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

/**
 * Redo - move to next state
 */
export function redoHistory<T>(
  history: UndoRedoHistory<T>
): UndoRedoHistory<T> {
  if (history.future.length === 0) {
    return history;
  }
  const next = history.future[0];
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

// =============================================================================
// Clipboard Types
// =============================================================================

/**
 * Clipboard content for copy/paste
 */
export type ClipboardContent = {
  /** Copied shapes */
  readonly shapes: readonly Shape[];
  /** Paste offset counter (increases with each paste) */
  readonly pasteCount: number;
};

// =============================================================================
// Slide Editor State
// =============================================================================

/**
 * Complete slide editor state
 */
export type SlideEditorState = {
  /** Slide with undo/redo history */
  readonly slideHistory: UndoRedoHistory<Slide>;
  /** Current selection */
  readonly selection: SelectionState;
  /** Current drag operation */
  readonly drag: DragState;
  /** Clipboard content */
  readonly clipboard: ClipboardContent | undefined;
};

/**
 * Create initial slide editor state
 */
export function createSlideEditorState(slide: Slide): SlideEditorState {
  return {
    slideHistory: createHistory(slide),
    selection: createEmptySelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
  };
}

// =============================================================================
// Slide Editor Actions
// =============================================================================

/**
 * Actions for slide editor reducer
 */
export type SlideEditorAction =
  // Slide mutations
  | { readonly type: "SET_SLIDE"; readonly slide: Slide }
  | { readonly type: "UPDATE_SLIDE"; readonly updater: (slide: Slide) => Slide }
  | {
      readonly type: "UPDATE_SHAPE";
      readonly shapeId: ShapeId;
      readonly updater: (shape: Shape) => Shape;
    }
  | { readonly type: "DELETE_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "ADD_SHAPE"; readonly shape: Shape }
  | {
      readonly type: "REORDER_SHAPE";
      readonly shapeId: ShapeId;
      readonly direction: "front" | "back" | "forward" | "backward";
    }
  | { readonly type: "UNGROUP_SHAPE"; readonly shapeId: ShapeId }
  | { readonly type: "GROUP_SHAPES"; readonly shapeIds: readonly ShapeId[] }
  | {
      readonly type: "MOVE_SHAPE_TO_INDEX";
      readonly shapeId: ShapeId;
      readonly newIndex: number;
    }
  // Selection
  | {
      readonly type: "SELECT";
      readonly shapeId: ShapeId;
      readonly addToSelection: boolean;
    }
  | { readonly type: "SELECT_MULTIPLE"; readonly shapeIds: readonly ShapeId[] }
  | { readonly type: "CLEAR_SELECTION" }
  // Drag
  | { readonly type: "START_MOVE"; readonly startX: Pixels; readonly startY: Pixels }
  | {
      readonly type: "START_RESIZE";
      readonly handle: ResizeHandlePosition;
      readonly startX: Pixels;
      readonly startY: Pixels;
      readonly aspectLocked: boolean;
    }
  | { readonly type: "START_ROTATE"; readonly startX: Pixels; readonly startY: Pixels }
  | { readonly type: "END_DRAG" }
  // Undo/Redo
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  // Clipboard
  | { readonly type: "COPY" }
  | { readonly type: "PASTE" };

// =============================================================================
// Context Value Types
// =============================================================================

/**
 * Slide editor context value
 */
export type SlideEditorContextValue = {
  readonly state: SlideEditorState;
  readonly dispatch: (action: SlideEditorAction) => void;
  /** Helper: current slide (from history.present) */
  readonly slide: Slide;
  /** Helper: selected shapes */
  readonly selectedShapes: readonly Shape[];
  /** Helper: primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Helper: can undo */
  readonly canUndo: boolean;
  /** Helper: can redo */
  readonly canRedo: boolean;
};
