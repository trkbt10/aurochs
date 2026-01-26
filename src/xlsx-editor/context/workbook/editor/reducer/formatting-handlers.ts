/**
 * @file Formatting mutation handlers
 *
 * Handlers for formatting operations like applying styles and merge/unmerge.
 */

import type { XlsxEditorAction, XlsxEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory } from "../../state/history";
import { updateWorksheetInWorkbook } from "../../utils/worksheet-updater";
import { applyStyleToRange } from "../../../../cell/style-mutation";
import { mergeCells, unmergeCells } from "../../../../sheet/merge-mutation";
import { getCell } from "../../../../cell/query";
import { resolveCellStyleDetails } from "../../../../selectors/cell-style-details";
import type { XlsxCellXf } from "../../../../../xlsx/domain/style/types";
import {
  upsertBorder,
  upsertCellXf,
  upsertCustomNumberFormat,
  upsertFill,
  upsertFont,
  useBuiltinNumberFormat,
} from "../../../../../xlsx/domain/style/mutation";
import type { StyleId } from "../../../../../xlsx/domain/types";
import { isEqualCellXf } from "../../../../../xlsx/domain/style/mutation/equality";
import type { XlsxCellStyle, XlsxStyleSheet } from "../../../../../xlsx/domain/style/types";

type ApplyStyleAction = Extract<XlsxEditorAction, { type: "APPLY_STYLE" }>;
type ApplyNamedStyleAction = Extract<XlsxEditorAction, { type: "APPLY_NAMED_STYLE" }>;
type CreateNamedStyleAction = Extract<XlsxEditorAction, { type: "CREATE_NAMED_STYLE" }>;
type DeleteNamedStyleAction = Extract<XlsxEditorAction, { type: "DELETE_NAMED_STYLE" }>;
type SetSelectionFormatAction = Extract<XlsxEditorAction, { type: "SET_SELECTION_FORMAT" }>;
type MergeCellsAction = Extract<XlsxEditorAction, { type: "MERGE_CELLS" }>;
type UnmergeCellsAction = Extract<XlsxEditorAction, { type: "UNMERGE_CELLS" }>;

/**
 * Upsert a cellStyleXf entry (for named style base formats).
 * Returns the xfId (index into cellStyleXfs).
 */
function upsertCellStyleXf(
  styles: XlsxStyleSheet,
  xf: XlsxCellXf,
): { readonly styles: XlsxStyleSheet; readonly xfId: number } {
  const existingIndex = styles.cellStyleXfs.findIndex((candidate) => isEqualCellXf(candidate, xf));
  if (existingIndex >= 0) {
    return { styles, xfId: existingIndex };
  }
  return {
    styles: { ...styles, cellStyleXfs: [...styles.cellStyleXfs, xf] },
    xfId: styles.cellStyleXfs.length,
  };
}

/**
 * Add a new cellStyle entry.
 */
function addCellStyle(
  styles: XlsxStyleSheet,
  cellStyle: XlsxCellStyle,
): XlsxStyleSheet {
  return { ...styles, cellStyles: [...styles.cellStyles, cellStyle] };
}

/**
 * Remove a cellStyle entry by index.
 */
function removeCellStyleAtIndex(
  styles: XlsxStyleSheet,
  index: number,
): XlsxStyleSheet {
  const newCellStyles = styles.cellStyles.filter((_, i) => i !== index);
  return { ...styles, cellStyles: newCellStyles };
}

function resolveNextAlignment(params: {
  readonly baseAlignment: XlsxCellXf["alignment"];
  readonly requested: SetSelectionFormatAction["format"]["alignment"];
}): XlsxCellXf["alignment"] {
  const { baseAlignment, requested } = params;
  if (requested === undefined) {
    return baseAlignment;
  }
  if (requested === null) {
    return undefined;
  }
  return requested;
}

function resolveNumberFormatMutation(params: {
  readonly styles: ReturnType<typeof upsertFont>["styles"];
  readonly baseNumFmtId: XlsxCellXf["numFmtId"];
  readonly numberFormat: SetSelectionFormatAction["format"]["numberFormat"];
}): { readonly styles: ReturnType<typeof upsertFont>["styles"]; readonly numFmtId: XlsxCellXf["numFmtId"] } {
  const { styles, baseNumFmtId, numberFormat } = params;
  if (!numberFormat) {
    return { styles, numFmtId: baseNumFmtId };
  }
  if (numberFormat.type === "builtin") {
    return useBuiltinNumberFormat(styles, numberFormat.numFmtId);
  }
  const formatCode = numberFormat.formatCode.trim();
  if (formatCode.length === 0) {
    throw new Error("Custom number format code must not be empty");
  }
  return upsertCustomNumberFormat(styles, formatCode);
}

function handleApplyStyle(
  state: XlsxEditorState,
  action: ApplyStyleAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const updatedWorkbook = updateWorksheetInWorkbook(
    state.workbookHistory.present,
    sheetIndex,
    (worksheet) => applyStyleToRange(worksheet, action.range, action.styleId),
  );

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

/**
 * Apply a named style (cellStyle) to a range.
 *
 * Resolves the cellStyle → cellStyleXfs → creates appropriate cellXfs entry.
 */
function handleApplyNamedStyle(
  state: XlsxEditorState,
  action: ApplyNamedStyleAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const currentWorkbook = state.workbookHistory.present;
  const { styles } = currentWorkbook;

  // Get the named style from cellStyles
  const cellStyle = styles.cellStyles[action.cellStyleIndex];
  if (!cellStyle) {
    return state;
  }

  // Get the base format from cellStyleXfs via xfId reference
  const baseXfId = cellStyle.xfId;
  const cellStyleXf = styles.cellStyleXfs[baseXfId];
  if (!cellStyleXf) {
    return state;
  }

  // Create a cellXf that references this base style (xfId)
  const xf: XlsxCellXf = {
    numFmtId: cellStyleXf.numFmtId,
    fontId: cellStyleXf.fontId,
    fillId: cellStyleXf.fillId,
    borderId: cellStyleXf.borderId,
    xfId: baseXfId,
    alignment: cellStyleXf.alignment,
    protection: cellStyleXf.protection,
    applyNumberFormat: cellStyleXf.applyNumberFormat,
    applyFont: cellStyleXf.applyFont,
    applyFill: cellStyleXf.applyFill,
    applyBorder: cellStyleXf.applyBorder,
    applyAlignment: cellStyleXf.applyAlignment,
    applyProtection: cellStyleXf.applyProtection,
  };

  // Upsert the cellXf entry (reuses existing if identical)
  const xfResult = upsertCellXf(styles, xf);
  const updatedStyles = xfResult.styles;
  const nextStyleId = xfResult.styleId;

  // Apply the style to the range
  const workbookWithSheetUpdated = updateWorksheetInWorkbook(
    currentWorkbook,
    sheetIndex,
    (worksheet) => applyStyleToRange(worksheet, action.range, nextStyleId),
  );

  // Update styles if changed
  function mergeStylesIfChanged() {
    if (workbookWithSheetUpdated.styles === updatedStyles) {
      return workbookWithSheetUpdated;
    }
    return { ...workbookWithSheetUpdated, styles: updatedStyles };
  }
  const updatedWorkbook = mergeStylesIfChanged();

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

function handleSetSelectionFormat(
  state: XlsxEditorState,
  action: SetSelectionFormatAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const currentWorkbook = state.workbookHistory.present;
  const sheet = currentWorkbook.sheets[sheetIndex];
  if (!sheet) {
    return state;
  }

  const anchorCell = state.cellSelection.activeCell ?? action.range.start;
  const anchorCellData = getCell(sheet, anchorCell);
  const base = resolveCellStyleDetails({
    styles: currentWorkbook.styles,
    sheet,
    address: anchorCell,
    cell: anchorCellData,
  });

  const baseXf = base.xf;
  const nextFont = action.format.font ?? base.font;
  const nextFill = action.format.fill ?? base.fill;
  const nextBorder = action.format.border ?? base.border;
  const nextAlignment = resolveNextAlignment({ baseAlignment: baseXf.alignment, requested: action.format.alignment });

  const fontResult = upsertFont(currentWorkbook.styles, nextFont);
  const fillResult = upsertFill(fontResult.styles, nextFill);
  const borderResult = upsertBorder(fillResult.styles, nextBorder);

  const numFmtResult = resolveNumberFormatMutation({
    styles: borderResult.styles,
    baseNumFmtId: baseXf.numFmtId,
    numberFormat: action.format.numberFormat,
  });

  const xf: XlsxCellXf = {
    numFmtId: numFmtResult.numFmtId,
    fontId: fontResult.fontId,
    fillId: fillResult.fillId,
    borderId: borderResult.borderId,
    alignment: nextAlignment,
  };

  const xfResult = upsertCellXf(numFmtResult.styles, xf);
  const styles = xfResult.styles;
  const nextStyleId: StyleId = xfResult.styleId;

  const workbookWithSheetUpdated = updateWorksheetInWorkbook(
    currentWorkbook,
    sheetIndex,
    (worksheet) => applyStyleToRange(worksheet, action.range, nextStyleId),
  );

  const updatedWorkbook = workbookWithSheetUpdated.styles === styles ? workbookWithSheetUpdated : { ...workbookWithSheetUpdated, styles };

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

/**
 * Create a named style from the current cell's formatting.
 *
 * 1. Get the current cell's styleId
 * 2. Look up the cellXf from cellXfs
 * 3. Create a new cellStyleXf entry (upsert for deduplication)
 * 4. Create a new cellStyle entry with the given name
 */
function handleCreateNamedStyle(
  state: XlsxEditorState,
  action: CreateNamedStyleAction,
): XlsxEditorState {
  const sheetIndex = state.activeSheetIndex;
  if (sheetIndex === undefined) {
    return state;
  }

  const currentWorkbook = state.workbookHistory.present;
  const sheet = currentWorkbook.sheets[sheetIndex];
  if (!sheet) {
    return state;
  }

  // Get the cell and its style
  const cell = getCell(sheet, action.baseCellAddress);
  const cellStyleId = cell?.styleId ?? 0;
  const cellXf = currentWorkbook.styles.cellXfs[cellStyleId as number];
  if (!cellXf) {
    return state;
  }

  // Create the base format for the named style (cellStyleXf)
  // We strip the xfId since this will be a base style itself
  const baseXf: XlsxCellXf = {
    numFmtId: cellXf.numFmtId,
    fontId: cellXf.fontId,
    fillId: cellXf.fillId,
    borderId: cellXf.borderId,
    alignment: cellXf.alignment,
    protection: cellXf.protection,
    applyNumberFormat: cellXf.applyNumberFormat,
    applyFont: cellXf.applyFont,
    applyFill: cellXf.applyFill,
    applyBorder: cellXf.applyBorder,
    applyAlignment: cellXf.applyAlignment,
    applyProtection: cellXf.applyProtection,
  };

  // Upsert the cellStyleXf
  const xfResult = upsertCellStyleXf(currentWorkbook.styles, baseXf);

  // Create the cellStyle entry
  const newCellStyle: XlsxCellStyle = {
    name: action.name,
    xfId: xfResult.xfId,
  };

  const updatedStyles = addCellStyle(xfResult.styles, newCellStyle);
  const updatedWorkbook = { ...currentWorkbook, styles: updatedStyles };

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

/**
 * Delete a named style.
 *
 * Note: Built-in styles (builtinId !== undefined) should not be deleted.
 */
function handleDeleteNamedStyle(
  state: XlsxEditorState,
  action: DeleteNamedStyleAction,
): XlsxEditorState {
  const currentWorkbook = state.workbookHistory.present;
  const { styles } = currentWorkbook;

  // Validate the index
  const cellStyle = styles.cellStyles[action.cellStyleIndex];
  if (!cellStyle) {
    return state;
  }

  // Don't delete built-in styles
  if (cellStyle.builtinId !== undefined) {
    return state;
  }

  const updatedStyles = removeCellStyleAtIndex(styles, action.cellStyleIndex);
  const updatedWorkbook = { ...currentWorkbook, styles: updatedStyles };

  return {
    ...state,
    workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
  };
}

export const formattingHandlers: HandlerMap = {
  APPLY_STYLE: handleApplyStyle,
  APPLY_NAMED_STYLE: handleApplyNamedStyle,
  CREATE_NAMED_STYLE: handleCreateNamedStyle,
  DELETE_NAMED_STYLE: handleDeleteNamedStyle,
  SET_SELECTION_FORMAT: handleSetSelectionFormat,
  MERGE_CELLS: (state: XlsxEditorState, action: MergeCellsAction) => {
    const sheetIndex = state.activeSheetIndex;
    if (sheetIndex === undefined) {
      return state;
    }

    const updatedWorkbook = updateWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      (worksheet) => mergeCells(worksheet, action.range),
    );

    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
  UNMERGE_CELLS: (state: XlsxEditorState, action: UnmergeCellsAction) => {
    const sheetIndex = state.activeSheetIndex;
    if (sheetIndex === undefined) {
      return state;
    }

    const updatedWorkbook = updateWorksheetInWorkbook(
      state.workbookHistory.present,
      sheetIndex,
      (worksheet) => unmergeCells(worksheet, action.range),
    );

    return {
      ...state,
      workbookHistory: pushHistory(state.workbookHistory, updatedWorkbook),
    };
  },
};
