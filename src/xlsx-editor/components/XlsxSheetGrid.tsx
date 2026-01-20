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
import { colIdx, rowIdx, type ColIndex, type RowIndex } from "../../xlsx/domain/types";
import { indexToColumnLetter, type CellAddress } from "../../xlsx/domain/cell/address";
import { getCell } from "../cell/query";
import { useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
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
  fontSize: 12,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRight: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderBottom: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
};

const cellBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: `0 ${spacingTokens.xs}`,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  fontSize: 12,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  borderRight: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderBottom: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
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

type HeaderMenuState =
  | { readonly kind: "col"; readonly colIndex: ColIndex; readonly x: number; readonly y: number }
  | { readonly kind: "row"; readonly rowIndex: RowIndex; readonly x: number; readonly y: number };

type ResizeDragRef =
  | { readonly kind: "col"; readonly colIndex: ColIndex; readonly startX: number; readonly startWidthPx: number }
  | { readonly kind: "row"; readonly rowIndex: RowIndex; readonly startY: number; readonly startHeightPx: number };

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

function createAddress(col: ColIndex, row: RowIndex): CellAddress {
  return {
    col,
    row,
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function formatCellValue(value: XlsxWorksheet["rows"][number]["cells"][number]["value"]): string {
  switch (value.type) {
    case "string":
      return value.value;
    case "number":
      return String(value.value);
    case "boolean":
      return value.value ? "TRUE" : "FALSE";
    case "error":
      return value.value;
    case "date":
      return value.value.toISOString();
    case "empty":
      return "";
  }
}

function XlsxSheetGridLayers({
  sheet,
  metrics,
  layout,
}: {
  readonly sheet: XlsxWorksheet;
  readonly metrics: XlsxGridMetrics;
  readonly layout: ReturnType<typeof createSheetLayout>;
}) {
  const { dispatch, selection, state, activeSheetIndex } = useXlsxWorkbookEditor();
  const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = useVirtualScrollContext();
  const [isMouseSelecting, setIsMouseSelecting] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<HeaderMenuState | null>(null);
  const resizeRef = useRef<ResizeDragRef | null>(null);

  const rowHeaderWidthPx = metrics.rowHeaderWidthPx ?? metrics.headerSizePx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx ?? metrics.rowHeightPx;

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

  const selectedRangeRect = getSelectedRangeRect(selection.selectedRange, layout, scrollTop, scrollLeft);

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
    return getActiveCellRect(editingCell, layout, scrollTop, scrollLeft);
  }, [editingCell, layout, metrics, scrollLeft, scrollTop]);

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
        const col0 = colNumber - 1;

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
      const row0 = rowNumber - 1;

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
        style={{
          ...headerCellBaseStyle,
          position: "absolute",
          left: 0,
          top: 0,
          width: rowHeaderWidthPx,
          height: colHeaderHeightPx,
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
            return (
              <div
                key={`col-${col1}`}
                style={{
                  ...headerCellBaseStyle,
                  position: "absolute",
                  left: layout.cols.getOffsetPx(col0),
                  top: 0,
                  width,
                  height: colHeaderHeightPx,
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
            return (
              <div
                key={`row-${row1}`}
                style={{
                  ...headerCellBaseStyle,
                  position: "absolute",
                  left: 0,
                  top: layout.rows.getOffsetPx(row0),
                  width: rowHeaderWidthPx,
                  height,
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
        }}
      >
        <div
          style={{
            position: "absolute",
            transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
          }}
        >
          {Array.from({ length: rowRange.end - rowRange.start + 1 }).map((_, r) => {
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
              const cell = getCell(sheet, address);
              const text = cell ? formatCellValue(cell.value) : "";
              const width = layout.cols.getSizePx(col0);
              if (width <= 0) {
                return null;
              }
              return (
                <div
                  key={`cell-${col1}-${row1}`}
                  style={{
                    ...cellBaseStyle,
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
                    dispatch({ type: "START_RANGE_SELECT", startCell: address });
                    setIsMouseSelecting(true);
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
          })}
        </div>

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
        <XlsxSheetGridLayers sheet={sheet} metrics={metrics} layout={layout} />
      </VirtualScroll>
    </div>
  );
}
