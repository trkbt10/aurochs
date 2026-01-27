/**
 * @file Slide editor types
 *
 * Slide-specific editor types only.
 * For shared state types, import directly from ../state/
 */

import type { Slide, Shape } from "@oxen/pptx/domain";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type {
  UndoRedoHistory,
  SelectionState,
  DragState,
  ClipboardContent,
  ResizeHandlePosition,
} from "../state";
import {
  createHistory,
  createEmptySelection,
  createIdleDragState,
} from "../state";

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
