/**
 * @file XlsxSheetGrid
 *
 * Spreadsheet grid renderer (view-only + basic cell selection for now).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  VirtualScroll,
  useVirtualScrollContext,
  colorTokens,
  spacingTokens,
  clampRange,
  ContextMenu,
  type MenuEntry,
} from "../../office-editor-components";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import type { Cell } from "../../xlsx/domain/cell/types";
import { colIdx, rowIdx, type ColIndex, type RowIndex } from "../../xlsx/domain/types";
import { indexToColumnLetter, type CellAddress } from "../../xlsx/domain/cell/address";
import type { XlsxStyleSheet } from "../../xlsx/domain/style/types";
import { getCell } from "../cell/query";
import { useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { createFormulaEvaluator } from "../../xlsx/formula/evaluator";
import { resolveCellFormatCode, formatCellValueForDisplay, formatFormulaScalarForDisplay } from "../selectors/cell-display-text";
import { resolveCellRenderStyle } from "../selectors/cell-render-style";
import { buildBorderOverlayLines } from "../selectors/border-overlay";
import {
  columnWidthCharToPixels,
  createSheetLayout,
  pixelsToColumnWidthChar,
  pixelsToPoints,
  pointsToPixels,
  toColIndex0,
  toRowIndex0,
} from "../selectors/sheet-layout";
import { XlsxCellEditorOverlay } from "./cell-input/XlsxCellEditorOverlay";
import type { ParseCellUserInputResult } from "./cell-input/parse-cell-user-input";

export type XlsxGridMetrics = {
  readonly rowCount: number;
  readonly colCount: number;
  readonly rowHeightPx: number;
  readonly colWidthPx: number;
  /** Legacy: square header size. Prefer rowHeaderWidthPx/colHeaderHeightPx. */
  readonly headerSizePx: number;
  /** Width of the row header gutter (row numbers). */
  readonly rowHeaderWidthPx?: number;
  /** Height of the column header gutter (A,B,C...). */
  readonly colHeaderHeightPx?: number;
  readonly overscanRows: number;
  readonly overscanCols: number;
};

const rootStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
};

const layerRootStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  userSelect: "none",
};

const headerCellBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  fontSize: 12,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRight: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderBottom: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
};

const cellBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box",
  padding: `0 ${spacingTokens.xs}`,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  fontSize: 12,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const selectionOutlineStyle: CSSProperties = {
  position: "absolute",
  border: `2px solid var(--accent, ${colorTokens.accent.primary})`,
  pointerEvents: "none",
  boxSizing: "border-box",
};

const selectionFillStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: `color-mix(in srgb, var(--accent, ${colorTokens.accent.primary}) 18%, transparent)`,
  pointerEvents: "none",
};

const headerCellSelectedStyle: CSSProperties = {
  backgroundColor: `color-mix(in srgb, var(--accent, ${colorTokens.accent.primary}) 18%, var(--bg-tertiary, ${colorTokens.background.tertiary}))`,
};

type HeaderMenuState =
  | { readonly kind: "col"; readonly colIndex: ColIndex; readonly x: number; readonly y: number }
  | { readonly kind: "row"; readonly rowIndex: RowIndex; readonly x: number; readonly y: number };

type ResizeDragRef =
  | { readonly kind: "col"; readonly colIndex: ColIndex; readonly startX: number; readonly startWidthPx: number }
  | { readonly kind: "row"; readonly rowIndex: RowIndex; readonly startY: number; readonly startHeightPx: number };

type NormalizedMergeRange = {
  readonly key: string;
  readonly range: { readonly start: CellAddress; readonly end: CellAddress };
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
  readonly origin: CellAddress;
};

function normalizeMergeRange(range: { readonly start: CellAddress; readonly end: CellAddress }): NormalizedMergeRange {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;

  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const origin: CellAddress = { col: colIdx(minCol), row: rowIdx(minRow), colAbsolute: false, rowAbsolute: false };
  const normalizedRange = {
    start: origin,
    end: { col: colIdx(maxCol), row: rowIdx(maxRow), colAbsolute: false, rowAbsolute: false },
  };

  return {
    key: `${minCol},${minRow}-${maxCol},${maxRow}`,
    range: normalizedRange,
    minRow,
    maxRow,
    minCol,
    maxCol,
    origin,
  };
}

function findMergeForCell(merges: readonly NormalizedMergeRange[], address: CellAddress): NormalizedMergeRange | undefined {
  const col = address.col as number;
  const row = address.row as number;
  return merges.find((m) => col >= m.minCol && col <= m.maxCol && row >= m.minRow && row <= m.maxRow);
}

function getRangeBounds(range: { readonly start: CellAddress; readonly end: CellAddress }): {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
} {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;

  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

function getActiveCellRect(
  cell: CellAddress | undefined,
  layout: ReturnType<typeof createSheetLayout>,
  scrollTop: number,
  scrollLeft: number,
): { left: number; top: number; width: number; height: number } | null {
  if (!cell) {
    return null;
  }
  const col0 = toColIndex0(cell.col);
  const row0 = toRowIndex0(cell.row);
  const width = layout.cols.getSizePx(col0);
  const height = layout.rows.getSizePx(row0);
  if (width <= 0 || height <= 0) {
    return null;
  }
  return {
    // NOTE: Coordinates are relative to the "cells" viewport (top-left excludes headers).
    left: layout.cols.getOffsetPx(col0) - scrollLeft,
    top: layout.rows.getOffsetPx(row0) - scrollTop,
    width,
    height,
  };
}

function getSelectedRangeRect(
  range: { readonly start: CellAddress; readonly end: CellAddress } | undefined,
  layout: ReturnType<typeof createSheetLayout>,
  scrollTop: number,
  scrollLeft: number,
): { left: number; top: number; width: number; height: number } | null {
  if (!range) {
    return null;
  }
  const minCol1 = Math.min(range.start.col as number, range.end.col as number);
  const maxCol1 = Math.max(range.start.col as number, range.end.col as number);
  const minRow1 = Math.min(range.start.row as number, range.end.row as number);
  const maxRow1 = Math.max(range.start.row as number, range.end.row as number);

  const minCol0 = minCol1 - 1;
  const maxCol0 = maxCol1 - 1;
  const minRow0 = minRow1 - 1;
  const maxRow0 = maxRow1 - 1;

  const leftPx = layout.cols.getBoundaryOffsetPx(minCol0);
  const rightPx = layout.cols.getBoundaryOffsetPx(maxCol0 + 1);
  const topPx = layout.rows.getBoundaryOffsetPx(minRow0);
  const bottomPx = layout.rows.getBoundaryOffsetPx(maxRow0 + 1);

  const width = Math.max(0, rightPx - leftPx);
  const height = Math.max(0, bottomPx - topPx);
  if (width === 0 || height === 0) {
    return null;
  }

  return {
    // NOTE: Coordinates are relative to the "cells" viewport (top-left excludes headers).
    left: leftPx - scrollLeft,
    top: topPx - scrollTop,
    width,
    height,
  };
}

function clipRectToViewport(
  rect: { left: number; top: number; width: number; height: number } | null,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number; width: number; height: number } | null {
  if (!rect) {
    return null;
  }

  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.left + rect.width);
  const bottom = Math.min(viewportHeight, rect.top + rect.height);

  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width === 0 || height === 0) {
    return null;
  }

  return { left, top, width, height };
}

function createAddress(col: ColIndex, row: RowIndex): CellAddress {
  return {
    col,
    row,
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function getCellDisplayText(
  cell: Cell | undefined,
  sheetIndex: number,
  address: CellAddress,
  formulaEvaluator: ReturnType<typeof createFormulaEvaluator>,
  sheet: XlsxWorksheet,
  styles: XlsxStyleSheet,
): string {
  if (!cell) {
    return "";
  }
  const formatCode = resolveCellFormatCode({ styles, sheet, address, cell });
  if (cell.formula) {
    return formatFormulaScalarForDisplay(formulaEvaluator.evaluateCell(sheetIndex, address), formatCode);
  }
  return formatCellValueForDisplay(cell.value, formatCode);
}

type GridLine = { readonly pos: number; readonly key: string };

function getVisibleGridLines(params: {
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}): { readonly vertical: readonly GridLine[]; readonly horizontal: readonly GridLine[] } {
  const { rowRange, colRange, layout, scrollTop, scrollLeft, viewportWidth, viewportHeight } = params;

  const vertical: GridLine[] = [];
  const horizontal: GridLine[] = [];

  const maxColBoundary = colRange.end + 1;
  for (let col0 = colRange.start; col0 <= maxColBoundary; col0 += 1) {
    const x = layout.cols.getBoundaryOffsetPx(col0) - scrollLeft;
    if (x < -1 || x > viewportWidth + 1) {
      continue;
    }
    vertical.push({ pos: x, key: `v-${col0}` });
  }

  const maxRowBoundary = rowRange.end + 1;
  for (let row0 = rowRange.start; row0 <= maxRowBoundary; row0 += 1) {
    const y = layout.rows.getBoundaryOffsetPx(row0) - scrollTop;
    if (y < -1 || y > viewportHeight + 1) {
      continue;
    }
    horizontal.push({ pos: y, key: `h-${row0}` });
  }

  return { vertical, horizontal };
}

function XlsxSheetGridLayers({
  sheetIndex,
  sheet,
  metrics,
  layout,
  formulaEvaluator,
}: {
  readonly sheetIndex: number;
  readonly sheet: XlsxWorksheet;
  readonly metrics: XlsxGridMetrics;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly formulaEvaluator: ReturnType<typeof createFormulaEvaluator>;
}) {
  const { dispatch, selection, state, activeSheetIndex, workbook } = useXlsxWorkbookEditor();
  const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = useVirtualScrollContext();
  const [isMouseSelecting, setIsMouseSelecting] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<HeaderMenuState | null>(null);
  const resizeRef = useRef<ResizeDragRef | null>(null);

  const normalizedMerges = useMemo(() => {
    const merges = sheet.mergeCells ?? [];
    if (merges.length === 0) {
      return [];
    }
    return merges.map((m) => normalizeMergeRange(m));
  }, [sheet.mergeCells]);

  const rowHeaderWidthPx = metrics.rowHeaderWidthPx ?? metrics.headerSizePx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx ?? metrics.rowHeightPx;

  const selectionBounds = useMemo(() => {
    const range = selection.selectedRange;
    return range ? getRangeBounds(range) : null;
  }, [selection.selectedRange]);

  const isWholeSheetSelected = Boolean(
    selectionBounds &&
      selectionBounds.minRow === 1 &&
      selectionBounds.maxRow === metrics.rowCount &&
      selectionBounds.minCol === 1 &&
      selectionBounds.maxCol === metrics.colCount,
  );

  const gridViewportWidth = Math.max(0, viewportWidth - rowHeaderWidthPx);
  const gridViewportHeight = Math.max(0, viewportHeight - colHeaderHeightPx);

  const firstRow0 = layout.rows.findIndexAtOffset(scrollTop);
  const lastRow0 = layout.rows.findIndexAtOffset(scrollTop + gridViewportHeight);
  const firstCol0 = layout.cols.findIndexAtOffset(scrollLeft);
  const lastCol0 = layout.cols.findIndexAtOffset(scrollLeft + gridViewportWidth);

  const rowRange = clampRange(
    firstRow0 - metrics.overscanRows,
    lastRow0 + metrics.overscanRows,
    0,
    metrics.rowCount - 1,
  );
  const colRange = clampRange(
    firstCol0 - metrics.overscanCols,
    lastCol0 + metrics.overscanCols,
    0,
    metrics.colCount - 1,
  );

  const selectedRangeRect = useMemo(() => {
    const rect = getSelectedRangeRect(selection.selectedRange, layout, scrollTop, scrollLeft);
    return clipRectToViewport(rect, gridViewportWidth, gridViewportHeight);
  }, [gridViewportHeight, gridViewportWidth, layout, scrollLeft, scrollTop, selection.selectedRange]);

  const gridLines = useMemo(() => {
    if (sheet.sheetView?.showGridLines === false) {
      return { vertical: [], horizontal: [] } as const;
    }
    return getVisibleGridLines({
      rowRange,
      colRange,
      layout,
      scrollTop,
      scrollLeft,
      viewportWidth: gridViewportWidth,
      viewportHeight: gridViewportHeight,
    });
  }, [colRange, gridViewportHeight, gridViewportWidth, layout, rowRange, scrollLeft, scrollTop, sheet.sheetView?.showGridLines]);

  const borderLines = useMemo(() => {
    return buildBorderOverlayLines({
      sheet,
      styles: workbook.styles,
      layout,
      rowRange,
      colRange,
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
      scrollTop,
      scrollLeft,
      defaultBorderColor: `var(--border-primary, ${colorTokens.border.primary})`,
    });
  }, [colRange, layout, metrics.colCount, metrics.rowCount, rowRange, scrollLeft, scrollTop, sheet, workbook.styles]);

  const startRangeSelectFromCell = useCallback((address: CellAddress): void => {
    const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;
    const startCell = merge ? merge.origin : address;
    const currentCell = merge ? merge.range.end : address;

    dispatch({ type: "START_RANGE_SELECT", startCell });
    dispatch({ type: "PREVIEW_RANGE_SELECT", currentCell });
    setIsMouseSelecting(true);
  }, [dispatch, normalizedMerges]);

  useEffect(() => {
    if (!isMouseSelecting) {
      return;
    }
    const onMouseUp = (): void => {
      setIsMouseSelecting(false);
      dispatch({ type: "END_RANGE_SELECT" });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [dispatch, isMouseSelecting]);

  const focusGridRoot = useCallback((target: EventTarget): void => {
    const el = target instanceof HTMLElement ? target : null;
    const root = el?.closest('[data-virtual-scroll-root="true"]') as HTMLElement | null;
    root?.focus();
  }, []);

  useEffect(() => {
    const drag = state.drag;
    if (drag.type !== "columnResize") {
      return;
    }
    const current = resizeRef.current;
    if (!current || current.kind !== "col" || current.colIndex !== drag.colIndex) {
      return;
    }

    const onMouseMove = (e: MouseEvent): void => {
      const deltaPx = e.clientX - current.startX;
      const nextPx = Math.max(0, current.startWidthPx + deltaPx);
      const nextChars = pixelsToColumnWidthChar(nextPx);
      dispatch({ type: "PREVIEW_COLUMN_RESIZE", newWidth: nextChars });
    };
    const onMouseUp = (): void => {
      dispatch({ type: "COMMIT_COLUMN_RESIZE" });
      resizeRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dispatch, state.drag.type, state.drag.type === "columnResize" ? state.drag.colIndex : undefined]);

  useEffect(() => {
    const drag = state.drag;
    if (drag.type !== "rowResize") {
      return;
    }
    const current = resizeRef.current;
    if (!current || current.kind !== "row" || current.rowIndex !== drag.rowIndex) {
      return;
    }

    const onMouseMove = (e: MouseEvent): void => {
      const deltaPx = e.clientY - current.startY;
      const nextPx = Math.max(0, current.startHeightPx + deltaPx);
      const nextPoints = pixelsToPoints(nextPx);
      dispatch({ type: "PREVIEW_ROW_RESIZE", newHeight: nextPoints });
    };
    const onMouseUp = (): void => {
      dispatch({ type: "COMMIT_ROW_RESIZE" });
      resizeRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dispatch, state.drag.type, state.drag.type === "rowResize" ? state.drag.rowIndex : undefined]);

  const editingCell = state.editingCell;
  const editingRect = useMemo(() => {
    if (!editingCell) {
      return null;
    }
    const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, editingCell) : undefined;
    if (merge && (editingCell.col as number) === merge.minCol && (editingCell.row as number) === merge.minRow) {
      const leftPx = layout.cols.getBoundaryOffsetPx(merge.minCol - 1);
      const rightPx = layout.cols.getBoundaryOffsetPx(merge.maxCol);
      const topPx = layout.rows.getBoundaryOffsetPx(merge.minRow - 1);
      const bottomPx = layout.rows.getBoundaryOffsetPx(merge.maxRow);
      const width = Math.max(0, rightPx - leftPx);
      const height = Math.max(0, bottomPx - topPx);
      if (width === 0 || height === 0) {
        return null;
      }
      return {
        left: leftPx - scrollLeft,
        top: topPx - scrollTop,
        width,
        height,
      };
    }

    return getActiveCellRect(editingCell, layout, scrollTop, scrollLeft);
  }, [editingCell, layout, normalizedMerges, scrollLeft, scrollTop]);

  const handleCommitEdit = useCallback(
    (result: ParseCellUserInputResult): void => {
      if (activeSheetIndex === undefined) {
        throw new Error("activeSheetIndex is required to commit cell edit");
      }
      if (!editingCell) {
        throw new Error("editingCell is required to commit cell edit");
      }
      if (result.type === "formula") {
        dispatch({ type: "SET_CELL_FORMULA", address: editingCell, formula: result.formula });
        dispatch({ type: "EXIT_CELL_EDIT" });
        return;
      }
      dispatch({ type: "COMMIT_CELL_EDIT", value: result.value });
    },
    [activeSheetIndex, dispatch, editingCell],
  );

  const headerMenuItems = useMemo<readonly MenuEntry[]>(() => {
    if (!headerMenu) {
      return [];
    }

    if (headerMenu.kind === "col") {
      const isColumnHidden = (colNumber: number): boolean => {
        const def = sheet.columns?.find(
          (d) => (d.min as number) <= colNumber && colNumber <= (d.max as number),
        );
        return def?.hidden === true;
      };

      const colNumber = headerMenu.colIndex as number;
      const currentDef = sheet.columns?.find(
        (d) => (d.min as number) <= colNumber && colNumber <= (d.max as number),
      );
      const isHidden = currentDef?.hidden === true;
      const hiddenLeft = colNumber > 1 ? isColumnHidden(colNumber - 1) : false;
      const hiddenRight = colNumber < metrics.colCount ? isColumnHidden(colNumber + 1) : false;

      return [
        { id: "insert-left", label: "Insert column left" },
        { id: "insert-right", label: "Insert column right" },
        { id: "delete", label: "Delete column", danger: true },
        { type: "separator" },
        { id: "set-width", label: "Set column width…" },
        isHidden ? { id: "unhide", label: "Unhide column" } : { id: "hide", label: "Hide column" },
        ...(hiddenLeft ? [{ id: "unhide-left", label: "Unhide column left" } as const] : []),
        ...(hiddenRight ? [{ id: "unhide-right", label: "Unhide column right" } as const] : []),
      ];
    }

    const rowNumber = headerMenu.rowIndex as number;
    const currentRow = sheet.rows.find((r) => (r.rowNumber as number) === rowNumber);
    const isHidden = currentRow?.hidden === true;
    const isRowHidden = (row: number): boolean => {
      const r = sheet.rows.find((rr) => (rr.rowNumber as number) === row);
      return r?.hidden === true;
    };
    const hiddenAbove = rowNumber > 1 ? isRowHidden(rowNumber - 1) : false;
    const hiddenBelow = rowNumber < metrics.rowCount ? isRowHidden(rowNumber + 1) : false;

    return [
      { id: "insert-above", label: "Insert row above" },
      { id: "insert-below", label: "Insert row below" },
      { id: "delete", label: "Delete row", danger: true },
      { type: "separator" },
      { id: "set-height", label: "Set row height…" },
      isHidden ? { id: "unhide", label: "Unhide row" } : { id: "hide", label: "Hide row" },
      ...(hiddenAbove ? [{ id: "unhide-above", label: "Unhide row above" } as const] : []),
      ...(hiddenBelow ? [{ id: "unhide-below", label: "Unhide row below" } as const] : []),
    ];
  }, [headerMenu, metrics.colCount, metrics.rowCount, sheet.columns, sheet.rows]);

  const handleHeaderMenuAction = useCallback(
    (actionId: string): void => {
      if (!headerMenu) {
        return;
      }

      if (headerMenu.kind === "col") {
        const col = headerMenu.colIndex;
        const colNumber = col as number;

        if (actionId === "insert-left") {
          dispatch({ type: "INSERT_COLUMNS", startCol: col, count: 1 });
          return;
        }
        if (actionId === "insert-right") {
          dispatch({ type: "INSERT_COLUMNS", startCol: colIdx(colNumber + 1), count: 1 });
          return;
        }
        if (actionId === "delete") {
          dispatch({ type: "DELETE_COLUMNS", startCol: col, count: 1 });
          return;
        }
        if (actionId === "hide") {
          dispatch({ type: "HIDE_COLUMNS", startCol: col, count: 1 });
          return;
        }
        if (actionId === "unhide") {
          dispatch({ type: "UNHIDE_COLUMNS", startCol: col, count: 1 });
          return;
        }
        if (actionId === "unhide-left") {
          if (colNumber > 1) {
            dispatch({ type: "UNHIDE_COLUMNS", startCol: colIdx(colNumber - 1), count: 1 });
          }
          return;
        }
        if (actionId === "unhide-right") {
          if (colNumber < metrics.colCount) {
            dispatch({ type: "UNHIDE_COLUMNS", startCol: colIdx(colNumber + 1), count: 1 });
          }
          return;
        }
        if (actionId === "set-width") {
          const currentDef = sheet.columns?.find(
            (d) => (d.min as number) <= colNumber && colNumber <= (d.max as number),
          );
          const currentWidthChars = currentDef?.width ?? pixelsToColumnWidthChar(metrics.colWidthPx);
          const input = window.prompt("Column width (character units)", String(currentWidthChars));
          if (!input) {
            return;
          }
          const next = Number.parseFloat(input);
          if (!Number.isFinite(next) || next < 0) {
            throw new Error(`Invalid column width: ${input}`);
          }
          dispatch({ type: "SET_COLUMN_WIDTH", colIndex: col, width: next });
        }
        return;
      }

      const row = headerMenu.rowIndex;
      const rowNumber = row as number;

      if (actionId === "insert-above") {
        dispatch({ type: "INSERT_ROWS", startRow: row, count: 1 });
        return;
      }
      if (actionId === "insert-below") {
        dispatch({ type: "INSERT_ROWS", startRow: rowIdx(rowNumber + 1), count: 1 });
        return;
      }
      if (actionId === "delete") {
        dispatch({ type: "DELETE_ROWS", startRow: row, count: 1 });
        return;
      }
      if (actionId === "hide") {
        dispatch({ type: "HIDE_ROWS", startRow: row, count: 1 });
        return;
      }
      if (actionId === "unhide") {
        dispatch({ type: "UNHIDE_ROWS", startRow: row, count: 1 });
        return;
      }
      if (actionId === "unhide-above") {
        if (rowNumber > 1) {
          dispatch({ type: "UNHIDE_ROWS", startRow: rowIdx(rowNumber - 1), count: 1 });
        }
        return;
      }
      if (actionId === "unhide-below") {
        if (rowNumber < metrics.rowCount) {
          dispatch({ type: "UNHIDE_ROWS", startRow: rowIdx(rowNumber + 1), count: 1 });
        }
        return;
      }
      if (actionId === "set-height") {
        const currentRow = sheet.rows.find((r) => r.rowNumber === row);
        const currentHeightPoints = currentRow?.height ?? pixelsToPoints(metrics.rowHeightPx);
        const input = window.prompt("Row height (points)", String(currentHeightPoints));
        if (!input) {
          return;
        }
        const next = Number.parseFloat(input);
        if (!Number.isFinite(next) || next < 0) {
          throw new Error(`Invalid row height: ${input}`);
        }
        dispatch({ type: "SET_ROW_HEIGHT", rowIndex: row, height: next });
      }
    },
    [
      dispatch,
      headerMenu,
      metrics.colCount,
      metrics.rowCount,
      metrics.colWidthPx,
      metrics.rowHeightPx,
      sheet.columns,
      sheet.rows,
    ],
  );

  const resizeGuide = useMemo((): { x?: number; y?: number } => {
    const drag = state.drag;
    if (drag.type === "columnResize") {
      const col0 = (drag.colIndex as number) - 1;
      const widthPx = columnWidthCharToPixels(drag.originalWidth);
      const x = rowHeaderWidthPx + layout.cols.getOffsetPx(col0) + widthPx - scrollLeft;
      return { x };
    }
    if (drag.type === "rowResize") {
      const row0 = (drag.rowIndex as number) - 1;
      const heightPx = pointsToPixels(drag.originalHeight);
      const y = colHeaderHeightPx + layout.rows.getOffsetPx(row0) + heightPx - scrollTop;
      return { y };
    }
    return {};
  }, [colHeaderHeightPx, layout, rowHeaderWidthPx, scrollLeft, scrollTop, state.drag]);

  return (
    <div style={layerRootStyle}>
      {/* Corner */}
      <div
        data-testid="xlsx-select-all"
        style={{
          ...headerCellBaseStyle,
          ...(isWholeSheetSelected ? headerCellSelectedStyle : {}),
          position: "absolute",
          left: 0,
          top: 0,
          width: rowHeaderWidthPx,
          height: colHeaderHeightPx,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          focusGridRoot(e.target);
          dispatch({
            type: "SELECT_RANGE",
            range: {
              start: createAddress(colIdx(1), rowIdx(1)),
              end: createAddress(colIdx(metrics.colCount), rowIdx(metrics.rowCount)),
            },
          });
        }}
      />

      {/* Column headers (scroll X only) */}
      <div
        style={{
          position: "absolute",
          left: rowHeaderWidthPx,
          top: 0,
          right: 0,
          height: colHeaderHeightPx,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", transform: `translateX(${-scrollLeft}px)` }}>
          {Array.from({ length: colRange.end - colRange.start + 1 }).map((_, i) => {
            const col0 = colRange.start + i;
            const col1 = col0 + 1;
            const label = indexToColumnLetter(colIdx(col1));
            const width = layout.cols.getSizePx(col0);
            if (width <= 0) {
              return null;
            }
            const isColSelected = Boolean(
              selectionBounds &&
                selectionBounds.minRow === 1 &&
                selectionBounds.maxRow === metrics.rowCount &&
                col1 >= selectionBounds.minCol &&
                col1 <= selectionBounds.maxCol,
            );
            return (
              <div
                key={`col-${col1}`}
                data-testid={`xlsx-col-header-${col1}`}
                style={{
                  ...headerCellBaseStyle,
                  ...(isColSelected ? headerCellSelectedStyle : {}),
                  position: "absolute",
                  left: layout.cols.getOffsetPx(col0),
                  top: 0,
                  width,
                  height: colHeaderHeightPx,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  focusGridRoot(e.target);
                  if (e.shiftKey) {
                    const anchorCol = selection.activeCell?.col as number | undefined;
                    const startCol = Math.min(anchorCol ?? col1, col1);
                    const endCol = Math.max(anchorCol ?? col1, col1);
                    dispatch({
                      type: "SELECT_RANGE",
                      range: {
                        start: createAddress(colIdx(startCol), rowIdx(1)),
                        end: createAddress(colIdx(endCol), rowIdx(metrics.rowCount)),
                      },
                    });
                    return;
                  }
                  dispatch({
                    type: "SELECT_RANGE",
                    range: {
                      start: createAddress(colIdx(col1), rowIdx(1)),
                      end: createAddress(colIdx(col1), rowIdx(metrics.rowCount)),
                    },
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setHeaderMenu({ kind: "col", colIndex: colIdx(col1), x: e.clientX, y: e.clientY });
                }}
              >
                {label}
                <div
                  style={{
                    position: "absolute",
                    right: -3,
                    top: 0,
                    width: 6,
                    height: "100%",
                    cursor: "col-resize",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    focusGridRoot(e.target);
                    const colIndex = colIdx(col1);
                    const currentDef = sheet.columns?.find(
                      (d) => (d.min as number) <= col1 && col1 <= (d.max as number),
                    );
                    const widthChars = currentDef?.width ?? pixelsToColumnWidthChar(width);
                    resizeRef.current = {
                      kind: "col",
                      colIndex,
                      startX: e.clientX,
                      startWidthPx: width,
                    };
                    dispatch({ type: "START_COLUMN_RESIZE", colIndex, startX: e.clientX, originalWidth: widthChars });
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Row headers (scroll Y only) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: colHeaderHeightPx,
          width: rowHeaderWidthPx,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", transform: `translateY(${-scrollTop}px)` }}>
          {Array.from({ length: rowRange.end - rowRange.start + 1 }).map((_, i) => {
            const row0 = rowRange.start + i;
            const row1 = row0 + 1;
            const height = layout.rows.getSizePx(row0);
            if (height <= 0) {
              return null;
            }
            const isRowSelected = Boolean(
              selectionBounds &&
                selectionBounds.minCol === 1 &&
                selectionBounds.maxCol === metrics.colCount &&
                row1 >= selectionBounds.minRow &&
                row1 <= selectionBounds.maxRow,
            );
            return (
              <div
                key={`row-${row1}`}
                data-testid={`xlsx-row-header-${row1}`}
                style={{
                  ...headerCellBaseStyle,
                  ...(isRowSelected ? headerCellSelectedStyle : {}),
                  position: "absolute",
                  left: 0,
                  top: layout.rows.getOffsetPx(row0),
                  width: rowHeaderWidthPx,
                  height,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  focusGridRoot(e.target);
                  if (e.shiftKey) {
                    const anchorRow = selection.activeCell?.row as number | undefined;
                    const startRow = Math.min(anchorRow ?? row1, row1);
                    const endRow = Math.max(anchorRow ?? row1, row1);
                    dispatch({
                      type: "SELECT_RANGE",
                      range: {
                        start: createAddress(colIdx(1), rowIdx(startRow)),
                        end: createAddress(colIdx(metrics.colCount), rowIdx(endRow)),
                      },
                    });
                    return;
                  }
                  dispatch({
                    type: "SELECT_RANGE",
                    range: {
                      start: createAddress(colIdx(1), rowIdx(row1)),
                      end: createAddress(colIdx(metrics.colCount), rowIdx(row1)),
                    },
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setHeaderMenu({ kind: "row", rowIndex: rowIdx(row1), x: e.clientX, y: e.clientY });
                }}
              >
                {row1}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -3,
                    height: 6,
                    cursor: "row-resize",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    focusGridRoot(e.target);
                    const rowIndex = rowIdx(row1);
                    const currentRow = sheet.rows.find((r) => r.rowNumber === rowIndex);
                    const heightPoints = currentRow?.height ?? pixelsToPoints(height);
                    resizeRef.current = {
                      kind: "row",
                      rowIndex,
                      startY: e.clientY,
                      startHeightPx: height,
                    };
                    dispatch({ type: "START_ROW_RESIZE", rowIndex, startY: e.clientY, originalHeight: heightPoints });
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Cells */}
      <div
        style={{
          position: "absolute",
          left: rowHeaderWidthPx,
          top: colHeaderHeightPx,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
        }}
      >
        {sheet.sheetView?.showGridLines !== false && gridViewportWidth > 0 && gridViewportHeight > 0 && (
          <svg
            data-testid="xlsx-gridlines"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            width={gridViewportWidth}
            height={gridViewportHeight}
            viewBox={`0 0 ${gridViewportWidth} ${gridViewportHeight}`}
          >
            {gridLines.vertical.map((line) => (
              <line
                key={line.key}
                x1={line.pos}
                y1={0}
                x2={line.pos}
                y2={gridViewportHeight}
                stroke={`var(--border-subtle, ${colorTokens.border.subtle})`}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ))}
            {gridLines.horizontal.map((line) => (
              <line
                key={line.key}
                x1={0}
                y1={line.pos}
                x2={gridViewportWidth}
                y2={line.pos}
                stroke={`var(--border-subtle, ${colorTokens.border.subtle})`}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ))}
          </svg>
        )}

        <div style={{ position: "absolute", transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }}>
          {(() => {
            const renderedMerges = new Set<string>();
            return Array.from({ length: rowRange.end - rowRange.start + 1 }).map((_, r) => {
              const row0 = rowRange.start + r;
              const row1 = row0 + 1;
              const rowIndex = rowIdx(row1);
              const height = layout.rows.getSizePx(row0);
              if (height <= 0) {
                return null;
              }
              return Array.from({ length: colRange.end - colRange.start + 1 }).map((__, c) => {
                const col0 = colRange.start + c;
                const col1 = col0 + 1;
                const colIndex = colIdx(col1);
                const address = createAddress(colIndex, rowIndex);

                const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;
                if (merge) {
                  if (renderedMerges.has(merge.key)) {
                    return null;
                  }
                  renderedMerges.add(merge.key);

                  const originAddress = merge.origin;
                  const originCell = getCell(sheet, originAddress);
                  const text = getCellDisplayText(originCell, sheetIndex, originAddress, formulaEvaluator, sheet, workbook.styles);
                  const cellRenderStyle = resolveCellRenderStyle({
                    styles: workbook.styles,
                    sheet,
                    address: originAddress,
                    cell: originCell,
                  });

                  const leftPx = layout.cols.getBoundaryOffsetPx(merge.minCol - 1);
                  const rightPx = layout.cols.getBoundaryOffsetPx(merge.maxCol);
                  const topPx = layout.rows.getBoundaryOffsetPx(merge.minRow - 1);
                  const bottomPx = layout.rows.getBoundaryOffsetPx(merge.maxRow);
                  const width = Math.max(0, rightPx - leftPx);
                  const mergedHeight = Math.max(0, bottomPx - topPx);
                  if (width === 0 || mergedHeight === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={`merge-${merge.key}`}
                      style={{
                        ...cellBaseStyle,
                        ...cellRenderStyle,
                        position: "absolute",
                        left: leftPx,
                        top: topPx,
                        width,
                        height: mergedHeight,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        focusGridRoot(e.target);
                        if (e.shiftKey) {
                          dispatch({ type: "SELECT_CELL", address: originAddress, extend: true });
                          return;
                        }
                        startRangeSelectFromCell(originAddress);
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        focusGridRoot(e.target);
                        dispatch({ type: "SELECT_RANGE", range: merge.range });
                        dispatch({ type: "ENTER_CELL_EDIT", address: originAddress });
                      }}
                    >
                      {text}
                    </div>
                  );
                }

                const cell = getCell(sheet, address);
                const text = getCellDisplayText(cell, sheetIndex, address, formulaEvaluator, sheet, workbook.styles);
                const cellRenderStyle = resolveCellRenderStyle({
                  styles: workbook.styles,
                  sheet,
                  address,
                  cell,
                });
                const width = layout.cols.getSizePx(col0);
                if (width <= 0) {
                  return null;
                }
                return (
                    <div
                      key={`cell-${col1}-${row1}`}
                      style={{
                        ...cellBaseStyle,
                        ...cellRenderStyle,
                      position: "absolute",
                      left: layout.cols.getOffsetPx(col0),
                      top: layout.rows.getOffsetPx(row0),
                      width,
                      height,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        focusGridRoot(e.target);
                        if (e.shiftKey) {
                          dispatch({ type: "SELECT_CELL", address, extend: true });
                          return;
                        }
                        startRangeSelectFromCell(address);
                      }}
                      onMouseEnter={() => {
                        if (!isMouseSelecting) {
                          return;
                        }
                        dispatch({ type: "PREVIEW_RANGE_SELECT", currentCell: address });
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      focusGridRoot(e.target);
                      dispatch({ type: "SELECT_CELL", address });
                      dispatch({ type: "ENTER_CELL_EDIT", address });
                    }}
                  >
                    {text}
                  </div>
                );
              });
            });
          })()}
        </div>

        {borderLines.length > 0 && gridViewportWidth > 0 && gridViewportHeight > 0 && (
          <svg
            data-testid="xlsx-borders"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            width={gridViewportWidth}
            height={gridViewportHeight}
            viewBox={`0 0 ${gridViewportWidth} ${gridViewportHeight}`}
          >
            {borderLines.map((line) => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth}
                strokeDasharray={line.strokeDasharray}
                shapeRendering="crispEdges"
                strokeLinecap="square"
              />
            ))}
          </svg>
        )}

        {selectedRangeRect && (
          <div
            style={{
              ...selectionFillStyle,
              left: selectedRangeRect.left,
              top: selectedRangeRect.top,
              width: selectedRangeRect.width,
              height: selectedRangeRect.height,
            }}
          />
        )}
        {selectedRangeRect && (
          <div
            style={{
              ...selectionOutlineStyle,
              left: selectedRangeRect.left,
              top: selectedRangeRect.top,
              width: selectedRangeRect.width,
              height: selectedRangeRect.height,
            }}
          />
        )}

        {editingCell && editingRect && (
          <XlsxCellEditorOverlay
            sheet={sheet}
            address={editingCell}
            rect={editingRect}
            onCommitValue={handleCommitEdit}
            onCancel={() => dispatch({ type: "EXIT_CELL_EDIT" })}
          />
        )}
      </div>

      {resizeGuide.x !== undefined && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: resizeGuide.x,
            width: 0,
            borderLeft: `2px solid var(--accent, ${colorTokens.accent.primary})`,
            pointerEvents: "none",
          }}
        />
      )}
      {resizeGuide.y !== undefined && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: resizeGuide.y,
            height: 0,
            borderTop: `2px solid var(--accent, ${colorTokens.accent.primary})`,
            pointerEvents: "none",
          }}
        />
      )}

      {headerMenu && (
        <ContextMenu
          x={headerMenu.x}
          y={headerMenu.y}
          items={headerMenuItems}
          onAction={(actionId) => {
            handleHeaderMenuAction(actionId);
            setHeaderMenu(null);
          }}
          onClose={() => setHeaderMenu(null)}
        />
      )}
    </div>
  );
}

export function XlsxSheetGrid({
  sheetIndex,
  metrics,
}: {
  readonly sheetIndex: number;
  readonly metrics: XlsxGridMetrics;
}) {
  const { dispatch, selection, state, workbook } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  if (metrics.rowCount <= 0 || metrics.colCount <= 0) {
    throw new Error("XlsxSheetGrid requires rowCount/colCount > 0");
  }
  const rowHeaderWidthPx = metrics.rowHeaderWidthPx ?? metrics.headerSizePx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx ?? metrics.rowHeightPx;

  if (metrics.rowHeightPx <= 0 || metrics.colWidthPx <= 0 || rowHeaderWidthPx <= 0 || colHeaderHeightPx <= 0) {
    throw new Error("XlsxSheetGrid requires positive grid metrics");
  }

  const layout = useMemo(() => {
    return createSheetLayout(sheet, {
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
      defaultRowHeightPx: metrics.rowHeightPx,
      defaultColWidthPx: metrics.colWidthPx,
    });
  }, [metrics.colCount, metrics.colWidthPx, metrics.rowCount, metrics.rowHeightPx, sheet]);

  const formulaEvaluator = useMemo(() => createFormulaEvaluator(workbook), [workbook]);

  const contentWidth = rowHeaderWidthPx + layout.totalColsWidthPx;
  const contentHeight = colHeaderHeightPx + layout.totalRowsHeightPx;

  const getCursorCell = (active: CellAddress, isExtend: boolean): CellAddress => {
    if (!isExtend) {
      return active;
    }
    const range = selection.selectedRange;
    return range?.end ?? active;
  };

  return (
    <div style={rootStyle}>
      <VirtualScroll
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        onKeyDown={(event) => {
          if (state.editingCell) {
            return;
          }

          const isMeta = event.metaKey || event.ctrlKey;
          if (isMeta && (event.key === "z" || event.key === "Z")) {
            event.preventDefault();
            if (event.shiftKey) {
              dispatch({ type: "REDO" });
            } else {
              dispatch({ type: "UNDO" });
            }
            return;
          }

          if (isMeta && (event.key === "c" || event.key === "C")) {
            event.preventDefault();
            dispatch({ type: "COPY" });
            return;
          }
          if (isMeta && (event.key === "x" || event.key === "X")) {
            event.preventDefault();
            dispatch({ type: "CUT" });
            return;
          }
          if (isMeta && (event.key === "v" || event.key === "V")) {
            event.preventDefault();
            dispatch({ type: "PASTE" });
            return;
          }

          const active = selection.activeCell ?? {
            col: colIdx(1),
            row: rowIdx(1),
            colAbsolute: false,
            rowAbsolute: false,
          };

          const cursor = getCursorCell(active, event.shiftKey);

          const moveTo = (col: number, row: number): void => {
            const clampedCol = Math.max(1, Math.min(metrics.colCount, col));
            const clampedRow = Math.max(1, Math.min(metrics.rowCount, row));
            const address: CellAddress = {
              col: colIdx(clampedCol),
              row: rowIdx(clampedRow),
              colAbsolute: false,
              rowAbsolute: false,
            };

            if (event.shiftKey) {
              dispatch({ type: "EXTEND_SELECTION", toAddress: address });
              return;
            }
            dispatch({ type: "SELECT_CELL", address });
          };

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveTo((cursor.col as number) - 1, cursor.row as number);
            return;
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveTo((cursor.col as number) + 1, cursor.row as number);
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            moveTo(cursor.col as number, (cursor.row as number) - 1);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            moveTo(cursor.col as number, (cursor.row as number) + 1);
            return;
          }

          if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault();
            dispatch({ type: "SELECT_CELL", address: active });
            dispatch({ type: "ENTER_CELL_EDIT", address: active });
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            dispatch({ type: "CLEAR_SELECTION" });
            return;
          }

          if (event.key === "Backspace" || event.key === "Delete") {
            const range = selection.selectedRange;
            if (!range) {
              return;
            }
            event.preventDefault();
            dispatch({ type: "CLEAR_CELL_CONTENTS", range });
          }
        }}
      >
        <XlsxSheetGridLayers
          sheetIndex={sheetIndex}
          sheet={sheet}
          metrics={metrics}
          layout={layout}
          formulaEvaluator={formulaEvaluator}
        />
      </VirtualScroll>
    </div>
  );
}
