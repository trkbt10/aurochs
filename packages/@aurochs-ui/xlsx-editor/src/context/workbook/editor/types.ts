/**
 * @file XLSX Workbook Editor Types
 *
 * Types for the workbook-level editor state and actions.
 * Follows the same patterns as pptx-editor for consistency.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxFont } from "@aurochs-office/xlsx/domain/style/font";
import type { XlsxFill } from "@aurochs-office/xlsx/domain/style/fill";
import type { XlsxBorder } from "@aurochs-office/xlsx/domain/style/border";
import type { ColIndex, RowIndex, StyleId } from "@aurochs-office/xlsx/domain/types";
import type { UndoRedoHistory as CoreUndoRedoHistory } from "@aurochs-ui/editor-core/history";
import type { IdleDragState as CoreIdleDragState } from "@aurochs-ui/editor-core/drag-state";
import { createIdleDragState as createCoreIdleDragState } from "@aurochs-ui/editor-core/drag-state";

// =============================================================================
// Undo/Redo History (shared with pptx-editor)
// =============================================================================

export type UndoRedoHistory<T> = CoreUndoRedoHistory<T>;

// =============================================================================
// Cell Selection State
// =============================================================================

/**
 * Cell selection state for the worksheet.
 *
 * Supports single cell, range, and multi-range selection.
 */
export type CellSelectionState = {
  /** Currently selected range (or single cell as range) */
  readonly selectedRange: CellRange | undefined;
  /** Active cell within the selection */
  readonly activeCell: CellAddress | undefined;
  /** Additional selected ranges (for Ctrl+Click) */
  readonly multiRanges?: readonly CellRange[];
};

/**
 * Create empty cell selection
 */
export function createEmptyCellSelection(): CellSelectionState {
  return {
    selectedRange: undefined,
    activeCell: undefined,
    multiRanges: undefined,
  };
}

// =============================================================================
// Drag State
// =============================================================================

/**
 * Idle drag state
 */
type IdleDragState = CoreIdleDragState;

/**
 * Range selection drag (clicking and dragging to select cells)
 */
type RangeSelectDragState = {
  readonly type: "rangeSelect";
  readonly startCell: CellAddress;
  readonly currentCell: CellAddress;
};

/**
 * Fill handle drag (auto-fill cells)
 */
type FillDragState = {
  readonly type: "fill";
  readonly sourceRange: CellRange;
  readonly targetRange: CellRange;
};

/**
 * Row resize drag
 */
type RowResizeDragState = {
  readonly type: "rowResize";
  readonly rowIndex: RowIndex;
  readonly startY: number;
  readonly originalHeight: number;
};

/**
 * Column resize drag
 */
type ColumnResizeDragState = {
  readonly type: "columnResize";
  readonly colIndex: ColIndex;
  readonly startX: number;
  readonly originalWidth: number;
};

/**
 * Union of all drag states
 */
export type XlsxDragState =
  | IdleDragState
  | RangeSelectDragState
  | FillDragState
  | RowResizeDragState
  | ColumnResizeDragState;

/**
 * Create idle drag state
 */
export function createIdleDragState(): XlsxDragState {
  return createCoreIdleDragState();
}

// =============================================================================
// Clipboard Content
// =============================================================================

/**
 * Clipboard content for copy/paste operations
 */
export type XlsxClipboardContent = {
  /** Source range of the copied cells */
  readonly sourceRange: CellRange;
  /** Whether this is a cut operation */
  readonly isCut: boolean;
  /** Copied cell values (row-major order) */
  readonly values: readonly (readonly CellValue[])[];
  /** Copied formulas (row-major order). `undefined` when the source cell has no formula. */
  readonly formulas?: readonly (readonly (string | undefined)[])[];
  /** Copied cell styles (row-major order) */
  readonly styles?: readonly (readonly (StyleId | undefined)[])[];
};

// =============================================================================
// Cell Editing State
// =============================================================================

/**
 * How editing was entered, affecting initial content behavior.
 * - "enter": F2 or double-click — preserves existing content, caret at end
 * - "replace": started typing on selected cell — replaces content with typed char
 * - "formulaBar": clicked into formula bar — preserves content
 */
export type EditEntryMode = "enter" | "replace" | "formulaBar";

/**
 * Which surface is the primary input target.
 * - "cell": editing from the inline cell editor (hidden textarea in the grid)
 * - "formulaBar": editing from the formula bar in the toolbar
 */
export type EditOrigin = "cell" | "formulaBar";

/**
 * IME composition state for cell editing.
 *
 * Tracks whether an IME composition session is active and its interim text.
 * During composition, keyDown events must be suppressed and caret updates skipped
 * to avoid interfering with the IME.
 */
export type CellEditComposition = {
  readonly isComposing: boolean;
  readonly text: string;
  readonly startOffset: number;
};

/**
 * Create idle (non-composing) composition state.
 */
export function createIdleComposition(): CellEditComposition {
  return { isComposing: false, text: "", startOffset: 0 };
}

/**
 * Complete cell editing state — single source of truth for both the formula bar
 * and the inline cell editor. Both surfaces read from and write to this state
 * via reducer actions.
 */
export type CellEditingState = {
  /** Cell being edited */
  readonly address: CellAddress;
  /** How editing was initiated */
  readonly entryMode: EditEntryMode;
  /** Which surface currently has input focus */
  readonly origin: EditOrigin;
  /** Current text in the editor (raw string including "=" if formula) */
  readonly text: string;
  /** Caret position (character offset into text) */
  readonly caretOffset: number;
  /** Selection end offset — if different from caretOffset, text is selected */
  readonly selectionEnd: number;
  /** Whether the text starts with "=" (formula mode) */
  readonly isFormulaMode: boolean;
  /** IME composition state */
  readonly composition: CellEditComposition;
  /** Index of the sheet where editing started (stable across sheet switches) */
  readonly editingSheetIndex: number;
};

// =============================================================================
// XLSX Editor State
// =============================================================================

/**
 * Complete XLSX editor state
 *
 * Uses workbook-level undo/redo history that tracks all changes
 * across sheets for unified undo/redo behavior.
 */
export type XlsxEditorState = {
  /** Workbook with undo/redo history */
  readonly workbookHistory: UndoRedoHistory<XlsxWorkbook>;
  /** Currently active sheet index (0-based) */
  readonly activeSheetIndex: number | undefined;
  /** Cell selection within the active sheet */
  readonly cellSelection: CellSelectionState;
  /** Current drag operation */
  readonly drag: XlsxDragState;
  /** Clipboard content */
  readonly clipboard: XlsxClipboardContent | undefined;
  /** Cell editing state — undefined when not editing */
  readonly editing: CellEditingState | undefined;
};

// =============================================================================
// XLSX Editor Actions
// =============================================================================

/**
 * Cell update for batch operations
 */
export type CellUpdate = {
  readonly address: CellAddress;
  readonly value: CellValue;
};

export type SelectionNumberFormat =
  | { readonly type: "builtin"; readonly numFmtId: number }
  | { readonly type: "custom"; readonly formatCode: string };

export type SelectionFormatUpdate = {
  readonly font?: XlsxFont;
  readonly fill?: XlsxFill;
  readonly border?: XlsxBorder;
  /** `null` clears alignment, `undefined` keeps current alignment */
  readonly alignment?: XlsxAlignment | null;
  readonly numberFormat?: SelectionNumberFormat;
};

/**
 * Actions for XLSX editor reducer
 */
export type XlsxEditorAction =
  // Document mutations
  | { readonly type: "SET_WORKBOOK"; readonly workbook: XlsxWorkbook }

  // Sheet management
  | { readonly type: "ADD_SHEET"; readonly name: string; readonly afterIndex?: number }
  | { readonly type: "DELETE_SHEET"; readonly sheetIndex: number }
  | { readonly type: "RENAME_SHEET"; readonly sheetIndex: number; readonly name: string }
  | { readonly type: "SELECT_SHEET"; readonly sheetIndex: number }
  | { readonly type: "MOVE_SHEET"; readonly fromIndex: number; readonly toIndex: number }
  | { readonly type: "DUPLICATE_SHEET"; readonly sheetIndex: number }

  // Cell operations
  | { readonly type: "UPDATE_CELL"; readonly address: CellAddress; readonly value: CellValue }
  | { readonly type: "UPDATE_CELLS"; readonly updates: readonly CellUpdate[] }
  | { readonly type: "DELETE_CELLS"; readonly range: CellRange }
  | { readonly type: "SET_CELL_FORMULA"; readonly address: CellAddress; readonly formula: string }
  | { readonly type: "CLEAR_CELL_CONTENTS"; readonly range: CellRange }
  | { readonly type: "CLEAR_CELL_FORMATS"; readonly range: CellRange }

  // Cell selection
  | { readonly type: "SELECT_CELL"; readonly address: CellAddress; readonly extend?: boolean }
  | { readonly type: "SELECT_RANGE"; readonly range: CellRange }
  | { readonly type: "EXTEND_SELECTION"; readonly toAddress: CellAddress }
  | { readonly type: "ADD_RANGE_TO_SELECTION"; readonly range: CellRange }
  | { readonly type: "CLEAR_SELECTION" }

  // Drag operations (3-stage pattern: START → PREVIEW → COMMIT)
  | { readonly type: "START_RANGE_SELECT"; readonly startCell: CellAddress }
  | { readonly type: "PREVIEW_RANGE_SELECT"; readonly currentCell: CellAddress }
  | { readonly type: "END_RANGE_SELECT" }
  | { readonly type: "START_FILL_DRAG"; readonly sourceRange: CellRange }
  | { readonly type: "PREVIEW_FILL_DRAG"; readonly targetRange: CellRange }
  | { readonly type: "COMMIT_FILL_DRAG" }
  | {
      readonly type: "START_ROW_RESIZE";
      readonly rowIndex: RowIndex;
      readonly startY: number;
      readonly originalHeight: number;
    }
  | { readonly type: "PREVIEW_ROW_RESIZE"; readonly newHeight: number }
  | { readonly type: "COMMIT_ROW_RESIZE" }
  | {
      readonly type: "START_COLUMN_RESIZE";
      readonly colIndex: ColIndex;
      readonly startX: number;
      readonly originalWidth: number;
    }
  | { readonly type: "PREVIEW_COLUMN_RESIZE"; readonly newWidth: number }
  | { readonly type: "COMMIT_COLUMN_RESIZE" }
  | { readonly type: "END_DRAG" }

  // Row/Column operations
  | { readonly type: "INSERT_ROWS"; readonly startRow: RowIndex; readonly count: number }
  | { readonly type: "DELETE_ROWS"; readonly startRow: RowIndex; readonly count: number }
  | { readonly type: "INSERT_COLUMNS"; readonly startCol: ColIndex; readonly count: number }
  | { readonly type: "DELETE_COLUMNS"; readonly startCol: ColIndex; readonly count: number }
  | { readonly type: "SET_ROW_HEIGHT"; readonly rowIndex: RowIndex; readonly height: number }
  | { readonly type: "SET_COLUMN_WIDTH"; readonly colIndex: ColIndex; readonly width: number }
  | { readonly type: "HIDE_ROWS"; readonly startRow: RowIndex; readonly count: number }
  | { readonly type: "UNHIDE_ROWS"; readonly startRow: RowIndex; readonly count: number }
  | { readonly type: "HIDE_COLUMNS"; readonly startCol: ColIndex; readonly count: number }
  | { readonly type: "UNHIDE_COLUMNS"; readonly startCol: ColIndex; readonly count: number }

  // Formatting
  | { readonly type: "APPLY_STYLE"; readonly range: CellRange; readonly styleId: StyleId }
  | { readonly type: "APPLY_NAMED_STYLE"; readonly range: CellRange; readonly cellStyleIndex: number }
  | { readonly type: "CREATE_NAMED_STYLE"; readonly name: string; readonly baseCellAddress: CellAddress }
  | { readonly type: "DELETE_NAMED_STYLE"; readonly cellStyleIndex: number }
  | { readonly type: "SET_SELECTION_FORMAT"; readonly range: CellRange; readonly format: SelectionFormatUpdate }
  | { readonly type: "MERGE_CELLS"; readonly range: CellRange }
  | { readonly type: "UNMERGE_CELLS"; readonly range: CellRange }

  // Cell editing
  | { readonly type: "ENTER_CELL_EDIT"; readonly address: CellAddress; readonly entryMode: EditEntryMode; readonly initialChar?: string }
  | { readonly type: "EXIT_CELL_EDIT" }
  | { readonly type: "COMMIT_CELL_EDIT" }
  | { readonly type: "UPDATE_EDIT_TEXT"; readonly text: string; readonly caretOffset: number; readonly selectionEnd: number }
  | { readonly type: "SET_EDIT_ORIGIN"; readonly origin: EditOrigin }
  | { readonly type: "SET_COMPOSITION"; readonly composition: CellEditComposition }
  | { readonly type: "INSERT_CELL_REFERENCE"; readonly refText: string }

  // Undo/Redo
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }

  // Clipboard
  | { readonly type: "COPY" }
  | { readonly type: "CUT" }
  | { readonly type: "PASTE" };

// =============================================================================
// Context Value Type
// =============================================================================

/**
 * XLSX editor context value
 */
export type XlsxEditorContextValue = {
  readonly state: XlsxEditorState;
  readonly dispatch: (action: XlsxEditorAction) => void;
  /** Current workbook (from history.present) */
  readonly workbook: XlsxWorkbook;
  /** Active sheet index */
  readonly activeSheetIndex: number | undefined;
  /** Cell selection */
  readonly cellSelection: CellSelectionState;
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
};
