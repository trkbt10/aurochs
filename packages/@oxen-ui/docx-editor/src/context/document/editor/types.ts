/**
 * @file DOCX Editor Types
 *
 * Main state and action type definitions for the DOCX editor.
 */

import type { DocxDocument } from "@oxen/docx/domain/document";
import type { DocxParagraph, DocxParagraphProperties } from "@oxen/docx/domain/paragraph";
import type { DocxRunProperties } from "@oxen/docx/domain/run";
import type { DocxTableCellProperties, DocxTableProperties } from "@oxen/docx/domain/table";
import type {
  UndoRedoHistory,
  DocxSelectionState,
  DocxDragState,
  DocxClipboardContent,
  ElementId,
  TextPosition,
  Point,
} from "../state";

// =============================================================================
// Editor Mode
// =============================================================================

/**
 * Editor mode determines available operations.
 */
export type EditorMode =
  | "editing"     // Normal editing mode
  | "readonly"    // View only
  | "commenting"; // Can add comments but not edit

// =============================================================================
// Text Edit State
// =============================================================================

/**
 * State for inline text editing.
 */
export type TextEditState = {
  /** Whether text editing is active */
  readonly isEditing: boolean;
  /** ID of the element being edited (paragraph/table cell) */
  readonly editingElementId: ElementId | undefined;
  /** Cursor position within the element */
  readonly cursorPosition: TextPosition | undefined;
};

// =============================================================================
// Main Editor State
// =============================================================================

/**
 * Complete DOCX editor state.
 */
export type DocxEditorState = {
  /** Document with undo/redo history */
  readonly documentHistory: UndoRedoHistory<DocxDocument>;
  /** Selection state (element and text level) */
  readonly selection: DocxSelectionState;
  /** Drag interaction state */
  readonly drag: DocxDragState;
  /** Clipboard content */
  readonly clipboard: DocxClipboardContent | undefined;
  /** Text editing state */
  readonly textEdit: TextEditState;
  /** Editor mode */
  readonly mode: EditorMode;
  /** Active section index (for section-specific operations) */
  readonly activeSectionIndex: number;
};

// =============================================================================
// Action Types
// =============================================================================

/**
 * All editor actions (discriminated union).
 */
export type DocxEditorAction =
  // Document Actions
  | { readonly type: "SET_DOCUMENT"; readonly document: DocxDocument }
  | { readonly type: "REPLACE_DOCUMENT"; readonly document: DocxDocument }

  // History Actions
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "CLEAR_HISTORY" }

  // Mode Actions
  | { readonly type: "SET_MODE"; readonly mode: EditorMode }

  // Section Actions
  | { readonly type: "SET_ACTIVE_SECTION"; readonly index: number }

  // Element Selection Actions
  | { readonly type: "SELECT_ELEMENT"; readonly elementId: ElementId; readonly addToSelection?: boolean; readonly toggle?: boolean }
  | { readonly type: "SELECT_ELEMENTS"; readonly elementIds: readonly ElementId[] }
  | { readonly type: "CLEAR_ELEMENT_SELECTION" }

  // Text Selection Actions
  | { readonly type: "SET_CURSOR"; readonly position: TextPosition }
  | { readonly type: "SET_TEXT_SELECTION"; readonly start: TextPosition; readonly end: TextPosition }
  | { readonly type: "EXTEND_TEXT_SELECTION"; readonly position: TextPosition }
  | { readonly type: "COLLAPSE_TEXT_SELECTION"; readonly toEnd?: boolean }
  | { readonly type: "CLEAR_TEXT_SELECTION" }

  // Text Edit Actions
  | { readonly type: "START_TEXT_EDIT"; readonly elementId: ElementId; readonly position?: TextPosition }
  | { readonly type: "END_TEXT_EDIT" }
  | { readonly type: "INSERT_TEXT"; readonly text: string }
  | { readonly type: "DELETE_TEXT"; readonly direction: "forward" | "backward" }
  | { readonly type: "DELETE_SELECTION" }

  // Text Drag Actions (3-phase)
  | { readonly type: "START_TEXT_SELECT_DRAG"; readonly anchor: TextPosition }
  | { readonly type: "UPDATE_TEXT_SELECT_DRAG"; readonly current: TextPosition }
  | { readonly type: "END_TEXT_SELECT_DRAG" }

  // Element Drag Actions (3-phase)
  | { readonly type: "START_ELEMENT_MOVE"; readonly elementIds: readonly ElementId[]; readonly position: Point }
  | { readonly type: "UPDATE_ELEMENT_MOVE"; readonly position: Point; readonly dropIndex?: number }
  | { readonly type: "COMMIT_ELEMENT_MOVE" }
  | { readonly type: "CANCEL_ELEMENT_MOVE" }

  // Clipboard Actions
  | { readonly type: "COPY" }
  | { readonly type: "CUT" }
  | { readonly type: "PASTE" }
  | { readonly type: "PASTE_PLAIN_TEXT" }
  | { readonly type: "SET_CLIPBOARD"; readonly content: DocxClipboardContent }
  | { readonly type: "CLEAR_CLIPBOARD" }

  // Formatting Actions
  | { readonly type: "APPLY_RUN_FORMAT"; readonly format: Partial<DocxRunProperties> }
  | { readonly type: "TOGGLE_BOLD" }
  | { readonly type: "TOGGLE_ITALIC" }
  | { readonly type: "TOGGLE_UNDERLINE" }
  | { readonly type: "TOGGLE_STRIKETHROUGH" }
  | { readonly type: "SET_FONT_SIZE"; readonly size: number }
  | { readonly type: "SET_FONT_FAMILY"; readonly family: string }
  | { readonly type: "SET_TEXT_COLOR"; readonly color: string }
  | { readonly type: "SET_HIGHLIGHT_COLOR"; readonly color: string | undefined }
  | { readonly type: "CLEAR_FORMATTING" }

  // Paragraph Formatting Actions
  | { readonly type: "APPLY_PARAGRAPH_FORMAT"; readonly format: Partial<DocxParagraphProperties> }
  | { readonly type: "SET_PARAGRAPH_ALIGNMENT"; readonly alignment: "left" | "center" | "right" | "both" }
  | { readonly type: "SET_LINE_SPACING"; readonly spacing: number; readonly rule?: "auto" | "exact" | "atLeast" }
  | { readonly type: "SET_PARAGRAPH_INDENT"; readonly left?: number; readonly right?: number; readonly firstLine?: number }

  // Table Formatting Actions
  | { readonly type: "APPLY_TABLE_FORMAT"; readonly format: Partial<DocxTableProperties> }
  | { readonly type: "APPLY_TABLE_CELL_FORMAT"; readonly format: Partial<DocxTableCellProperties> }

  // List Actions
  | { readonly type: "TOGGLE_BULLET_LIST" }
  | { readonly type: "TOGGLE_NUMBERED_LIST" }
  | { readonly type: "INCREASE_INDENT" }
  | { readonly type: "DECREASE_INDENT" }

  // Paragraph Actions
  | { readonly type: "INSERT_PARAGRAPH"; readonly index: number; readonly paragraph?: DocxParagraph }
  | { readonly type: "DELETE_PARAGRAPH"; readonly index: number }
  | { readonly type: "MERGE_PARAGRAPHS"; readonly firstIndex: number; readonly secondIndex: number }
  | { readonly type: "SPLIT_PARAGRAPH"; readonly paragraphIndex: number; readonly splitPosition: number }

  // Table Actions
  | { readonly type: "INSERT_TABLE"; readonly index: number; readonly rows: number; readonly cols: number }
  | { readonly type: "DELETE_TABLE"; readonly index: number }
  | { readonly type: "INSERT_TABLE_ROW"; readonly tableIndex: number; readonly rowIndex: number; readonly above?: boolean }
  | { readonly type: "DELETE_TABLE_ROW"; readonly tableIndex: number; readonly rowIndex: number }
  | { readonly type: "INSERT_TABLE_COLUMN"; readonly tableIndex: number; readonly colIndex: number; readonly before?: boolean }
  | { readonly type: "DELETE_TABLE_COLUMN"; readonly tableIndex: number; readonly colIndex: number }
  | { readonly type: "MERGE_TABLE_CELLS"; readonly tableIndex: number; readonly startRow: number; readonly startCol: number; readonly endRow: number; readonly endCol: number }
  | { readonly type: "SPLIT_TABLE_CELL"; readonly tableIndex: number; readonly rowIndex: number; readonly colIndex: number; readonly rows: number; readonly cols: number }

  // Cancel/Reset Actions
  | { readonly type: "CANCEL_DRAG" }
  | { readonly type: "RESET_STATE" };

// =============================================================================
// Action Type Extraction Helper
// =============================================================================

/**
 * Extract action type names as a type.
 */
export type DocxEditorActionType = DocxEditorAction["type"];

// =============================================================================
// Initial State Factory
// =============================================================================

/**
 * Create initial text edit state.
 */
export function createInitialTextEditState(): TextEditState {
  return {
    isEditing: false,
    editingElementId: undefined,
    cursorPosition: undefined,
  };
}
