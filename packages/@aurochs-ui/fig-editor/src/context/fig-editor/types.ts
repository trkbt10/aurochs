/**
 * @file Fig editor types
 *
 * State, action, and context value types for the fig editor.
 * Follows the same pattern as PresentationEditorState in pptx-editor.
 */

import type { FigDesignDocument, FigDesignNode, FigPage, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import type { NodeSpec } from "@aurochs-builder/fig/types";
import type { UndoRedoHistory } from "@aurochs-ui/editor-core/history";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";
import type { DragState, ResizeHandlePosition } from "@aurochs-ui/editor-core/drag-state";

// =============================================================================
// Creation Mode
// =============================================================================

/**
 * Fig editor creation modes.
 */
export type FigCreationMode =
  | { readonly type: "select" }
  | { readonly type: "frame" }
  | { readonly type: "rectangle" }
  | { readonly type: "ellipse" }
  | { readonly type: "line" }
  | { readonly type: "star" }
  | { readonly type: "polygon" }
  | { readonly type: "text" }
  | { readonly type: "pen" };

export function createSelectMode(): FigCreationMode {
  return { type: "select" };
}

export function isSelectMode(mode: FigCreationMode): mode is { type: "select" } {
  return mode.type === "select";
}

// =============================================================================
// Text Edit State
// =============================================================================

export type FigTextEditState =
  | { readonly type: "inactive" }
  | { readonly type: "active"; readonly nodeId: FigNodeId };

export function createInactiveTextEditState(): FigTextEditState {
  return { type: "inactive" };
}

// =============================================================================
// Clipboard
// =============================================================================

export type FigClipboardContent = {
  readonly type: "copy" | "cut";
  readonly nodes: readonly FigDesignNode[];
  readonly pasteCount: number;
};

// =============================================================================
// Editor State
// =============================================================================

/**
 * Complete fig editor state.
 */
export type FigEditorState = {
  readonly documentHistory: UndoRedoHistory<FigDesignDocument>;
  readonly activePageId: FigPageId | undefined;
  readonly nodeSelection: SelectionState<FigNodeId>;
  readonly drag: DragState<FigNodeId>;
  readonly clipboard: FigClipboardContent | undefined;
  readonly creationMode: FigCreationMode;
  readonly textEdit: FigTextEditState;
};

// =============================================================================
// Editor Actions
// =============================================================================

export type FigEditorAction =
  // Document
  | { readonly type: "SET_DOCUMENT"; readonly document: FigDesignDocument }

  // Page management
  | { readonly type: "SELECT_PAGE"; readonly pageId: FigPageId }
  | { readonly type: "ADD_PAGE"; readonly name?: string }
  | { readonly type: "DELETE_PAGE"; readonly pageId: FigPageId }
  | { readonly type: "MOVE_PAGE"; readonly pageId: FigPageId; readonly toIndex: number }
  | { readonly type: "RENAME_PAGE"; readonly pageId: FigPageId; readonly name: string }

  // Node mutations
  | { readonly type: "ADD_NODE"; readonly spec: NodeSpec; readonly parentId?: FigNodeId }
  | { readonly type: "DELETE_NODES"; readonly nodeIds: readonly FigNodeId[] }
  | { readonly type: "DUPLICATE_NODES"; readonly nodeIds: readonly FigNodeId[] }
  | {
      readonly type: "UPDATE_NODE";
      readonly nodeId: FigNodeId;
      readonly updater: (node: FigDesignNode) => FigDesignNode;
    }
  | {
      readonly type: "REORDER_NODE";
      readonly nodeId: FigNodeId;
      readonly direction: "front" | "back" | "forward" | "backward";
    }

  // Selection
  | {
      readonly type: "SELECT_NODE";
      readonly nodeId: FigNodeId;
      readonly addToSelection: boolean;
      readonly toggle?: boolean;
    }
  | {
      readonly type: "SELECT_MULTIPLE_NODES";
      readonly nodeIds: readonly FigNodeId[];
      readonly primaryId?: FigNodeId;
    }
  | { readonly type: "CLEAR_NODE_SELECTION" }

  // Drag pending
  | {
      readonly type: "START_PENDING_MOVE";
      readonly startX: number;
      readonly startY: number;
      readonly startClientX: number;
      readonly startClientY: number;
    }
  | {
      readonly type: "START_PENDING_RESIZE";
      readonly handle: ResizeHandlePosition;
      readonly startX: number;
      readonly startY: number;
      readonly startClientX: number;
      readonly startClientY: number;
      readonly aspectLocked: boolean;
    }
  | {
      readonly type: "START_PENDING_ROTATE";
      readonly startX: number;
      readonly startY: number;
      readonly startClientX: number;
      readonly startClientY: number;
    }

  // Drag confirm
  | { readonly type: "CONFIRM_MOVE" }
  | { readonly type: "CONFIRM_RESIZE" }
  | { readonly type: "CONFIRM_ROTATE" }

  // Drag direct
  | { readonly type: "START_MOVE"; readonly startX: number; readonly startY: number }
  | {
      readonly type: "START_RESIZE";
      readonly handle: ResizeHandlePosition;
      readonly startX: number;
      readonly startY: number;
      readonly aspectLocked: boolean;
    }
  | { readonly type: "START_ROTATE"; readonly startX: number; readonly startY: number }
  | { readonly type: "END_DRAG" }

  // Drag preview
  | { readonly type: "PREVIEW_MOVE"; readonly dx: number; readonly dy: number }
  | { readonly type: "PREVIEW_RESIZE"; readonly dx: number; readonly dy: number }
  | { readonly type: "PREVIEW_ROTATE"; readonly currentAngle: number }
  | { readonly type: "COMMIT_DRAG" }

  // Marquee
  | { readonly type: "START_MARQUEE"; readonly startX: number; readonly startY: number; readonly additive: boolean }
  | { readonly type: "UPDATE_MARQUEE"; readonly currentX: number; readonly currentY: number }
  | { readonly type: "END_MARQUEE" }

  // Creation drag
  | { readonly type: "START_CREATE_DRAG"; readonly startX: number; readonly startY: number }
  | { readonly type: "UPDATE_CREATE_DRAG"; readonly currentX: number; readonly currentY: number }
  | { readonly type: "END_CREATE_DRAG" }
  | {
      readonly type: "COMMIT_CREATION";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }

  // Creation mode
  | { readonly type: "SET_CREATION_MODE"; readonly mode: FigCreationMode }

  // Text edit
  | { readonly type: "ENTER_TEXT_EDIT"; readonly nodeId: FigNodeId }
  | { readonly type: "EXIT_TEXT_EDIT" }

  // Undo/Redo
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }

  // Clipboard
  | { readonly type: "COPY" }
  | { readonly type: "PASTE" };

// =============================================================================
// Context Value
// =============================================================================

/**
 * Fig editor context value (exposed to React consumers).
 *
 * Note: `drag` state is intentionally excluded from this context.
 * Drag state updates at mouse-move frequency (40-60Hz) and is provided
 * via a separate FigDragContext to prevent cascade re-renders.
 * Use `useFigDrag()` to access drag state where needed.
 */
export type FigEditorContextValue = {
  readonly dispatch: (action: FigEditorAction) => void;
  readonly document: FigDesignDocument;
  readonly activePage: FigPage | undefined;
  readonly activePageId: FigPageId | undefined;
  readonly selectedNodes: readonly FigDesignNode[];
  readonly primaryNode: FigDesignNode | undefined;
  readonly nodeSelection: SelectionState<FigNodeId>;
  readonly clipboard: FigClipboardContent | undefined;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly creationMode: FigCreationMode;
  readonly textEdit: FigTextEditState;
};
