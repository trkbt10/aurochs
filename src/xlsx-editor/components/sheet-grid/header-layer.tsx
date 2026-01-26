/**
 * @file Sheet grid header layer
 *
 * Renders row/column headers (A,B,C… / 1,2,3…) and handles header-driven interactions such as:
 * - row/column selection
 * - resizing row heights / column widths
 * - header context menus (insert/delete/hide/unhide)
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ContextMenu, type MenuEntry, colorTokens } from "../../../office-editor-components";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import { indexToColumnLetter } from "../../../xlsx/domain/cell/address";
import type { XlsxEditorAction, XlsxDragState } from "../../context/workbook/editor/types";
import {
  type SheetLayout,
  columnWidthCharToPixels,
  pixelsToColumnWidthChar,
  pixelsToPoints,
  pointsToPixels,
} from "../../selectors/sheet-layout";
import type { RangeBounds } from "./selection-geometry";
import { safeReleasePointerCapture, safeSetPointerCapture } from "./pointer-capture";
import { startWindowPointerDrag } from "./window-pointer-drag";

type HeaderMenuState =
  | { readonly kind: "col"; readonly colIndex: number; readonly x: number; readonly y: number }
  | { readonly kind: "row"; readonly rowIndex: number; readonly x: number; readonly y: number };

type ResizeDragRef =
  | { readonly kind: "col"; readonly colIndex: number; readonly startX: number; readonly startWidthPx: number; readonly pointerId: number; readonly captureTarget: HTMLElement }
  | { readonly kind: "row"; readonly rowIndex: number; readonly startY: number; readonly startHeightPx: number; readonly pointerId: number; readonly captureTarget: HTMLElement };

export type XlsxSheetGridHeaderLayerProps = {
  readonly sheet: XlsxWorksheet;
  readonly layout: SheetLayout;
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
    readonly rowHeightPx: number;
    readonly colWidthPx: number;
    readonly headerSizePx: number;
    readonly rowHeaderWidthPx: number;
    readonly colHeaderHeightPx: number;
  };
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly selectionBounds: RangeBounds | null;
  readonly isWholeSheetSelected: boolean;
  readonly activeCell: CellAddress | undefined;
  readonly drag: XlsxDragState;
  readonly dispatch: (action: XlsxEditorAction) => void;
  readonly focusGridRoot: (target: EventTarget) => void;
  /** Display zoom factor (1 = 100%). */
  readonly zoom: number;
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

const headerCellSelectedStyle: CSSProperties = {
  backgroundColor: `color-mix(in srgb, var(--accent, ${colorTokens.accent.primary}) 18%, var(--bg-tertiary, ${colorTokens.background.tertiary}))`,
};

/**
 * Header overlay for the sheet grid (row/column headers and resize handles).
 */
export function XlsxSheetGridHeaderLayer({
  sheet,
  layout,
  metrics,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  selectionBounds,
  isWholeSheetSelected,
  activeCell,
  drag,
  dispatch,
  focusGridRoot,
  zoom,
}: XlsxSheetGridHeaderLayerProps) {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(`XlsxSheetGridHeaderLayer zoom must be a positive finite number: ${String(zoom)}`);
  }
  const [headerMenu, setHeaderMenu] = useState<HeaderMenuState | null>(null);
  const resizeRef = useRef<ResizeDragRef | null>(null);

  const rowHeaderWidthPx = metrics.rowHeaderWidthPx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx;

  const handleHeaderMenuAction = useCallback(
    (actionId: string): void => {
      const menu = headerMenu;
      if (!menu) {
        return;
      }

      if (menu.kind === "col") {
        const col = colIdx(menu.colIndex);
        const colNumber = menu.colIndex;
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
          dispatch({ type: "UNHIDE_COLUMNS", startCol: colIdx(colNumber - 1), count: 1 });
          return;
        }
        if (actionId === "unhide-right") {
          dispatch({ type: "UNHIDE_COLUMNS", startCol: colIdx(colNumber + 1), count: 1 });
          return;
        }
        if (actionId === "set-width") {
          const input = window.prompt("Column width (characters)", String(metrics.colWidthPx));
          if (input === null) {
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

      if (menu.kind === "row") {
        const row = rowIdx(menu.rowIndex);
        const rowNumber = menu.rowIndex;
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
          dispatch({ type: "UNHIDE_ROWS", startRow: rowIdx(rowNumber - 1), count: 1 });
          return;
        }
        if (actionId === "unhide-below") {
          dispatch({ type: "UNHIDE_ROWS", startRow: rowIdx(rowNumber + 1), count: 1 });
          return;
        }
        if (actionId === "set-height") {
          const input = window.prompt("Row height (points)", String(metrics.rowHeightPx));
          if (input === null) {
            return;
          }
          const next = Number.parseFloat(input);
          if (!Number.isFinite(next) || next < 0) {
            throw new Error(`Invalid row height: ${input}`);
          }
          dispatch({ type: "SET_ROW_HEIGHT", rowIndex: row, height: next });
        }
      }
    },
    [dispatch, headerMenu, metrics.colWidthPx, metrics.rowHeightPx],
  );

  const headerMenuItems = useMemo<readonly MenuEntry[]>(() => {
    if (!headerMenu) {
      return [];
    }

    if (headerMenu.kind === "col") {
      const isColumnHidden = (colNumber: number): boolean => {
        const def = sheet.columns?.find((d) => (d.min as number) <= colNumber && colNumber <= (d.max as number));
        return def?.hidden === true;
      };

      const colNumber = headerMenu.colIndex;
      const currentDef = sheet.columns?.find((d) => (d.min as number) <= colNumber && colNumber <= (d.max as number));
      const isHidden = currentDef?.hidden === true;
      const hiddenLeft = colNumber > 1 ? isColumnHidden(colNumber - 1) : false;
      const hiddenRight = colNumber < metrics.colCount ? isColumnHidden(colNumber + 1) : false;

      const items: MenuEntry[] = [
        { id: "insert-left", label: "Insert column left" },
        { id: "insert-right", label: "Insert column right" },
        { id: "delete", label: "Delete column", danger: true },
        { type: "separator" },
        { id: "set-width", label: "Set column width…" },
        isHidden ? { id: "unhide", label: "Unhide column" } : { id: "hide", label: "Hide column" },
      ];
      if (hiddenLeft) {
        items.push({ id: "unhide-left", label: "Unhide column left" });
      }
      if (hiddenRight) {
        items.push({ id: "unhide-right", label: "Unhide column right" });
      }
      return items;
    }

    const rowNumber = headerMenu.rowIndex;
    const currentRow = sheet.rows.find((r) => (r.rowNumber as number) === rowNumber);
    const isHidden = currentRow?.hidden === true;
    const isRowHidden = (row: number): boolean => {
      const r = sheet.rows.find((rr) => (rr.rowNumber as number) === row);
      return r?.hidden === true;
    };
    const hiddenAbove = rowNumber > 1 ? isRowHidden(rowNumber - 1) : false;
    const hiddenBelow = rowNumber < metrics.rowCount ? isRowHidden(rowNumber + 1) : false;

    const items: MenuEntry[] = [
      { id: "insert-above", label: "Insert row above" },
      { id: "insert-below", label: "Insert row below" },
      { id: "delete", label: "Delete row", danger: true },
      { type: "separator" },
      { id: "set-height", label: "Set row height…" },
      isHidden ? { id: "unhide", label: "Unhide row" } : { id: "hide", label: "Hide row" },
    ];
    if (hiddenAbove) {
      items.push({ id: "unhide-above", label: "Unhide row above" });
    }
    if (hiddenBelow) {
      items.push({ id: "unhide-below", label: "Unhide row below" });
    }
    return items;
  }, [headerMenu, metrics.colCount, metrics.rowCount, sheet.columns, sheet.rows]);

  useEffect(() => {
    if (drag.type !== "columnResize") {
      return;
    }
    const current = resizeRef.current;
    if (!current || current.kind !== "col" || current.colIndex !== (drag.colIndex as number)) {
      return;
    }

    const onMove = (e: PointerEvent): void => {
      const deltaPx = (e.clientX - current.startX) / zoom;
      const nextPx = Math.max(0, current.startWidthPx + deltaPx);
      const nextChars = pixelsToColumnWidthChar(nextPx);
      dispatch({ type: "PREVIEW_COLUMN_RESIZE", newWidth: nextChars });
    };

    const onUp = (): void => {
      safeReleasePointerCapture(current.captureTarget, current.pointerId);
      dispatch({ type: "COMMIT_COLUMN_RESIZE" });
      resizeRef.current = null;
    };

    const onCancel = (): void => {
      safeReleasePointerCapture(current.captureTarget, current.pointerId);
      dispatch({ type: "END_DRAG" });
      resizeRef.current = null;
    };

    return startWindowPointerDrag({ pointerId: current.pointerId, onMove, onUp, onCancel });
  }, [dispatch, drag, zoom]);

  useEffect(() => {
    if (drag.type !== "rowResize") {
      return;
    }
    const current = resizeRef.current;
    if (!current || current.kind !== "row" || current.rowIndex !== (drag.rowIndex as number)) {
      return;
    }

    const onMove = (e: PointerEvent): void => {
      const deltaPx = (e.clientY - current.startY) / zoom;
      const nextPx = Math.max(0, current.startHeightPx + deltaPx);
      const nextPoints = pixelsToPoints(nextPx);
      dispatch({ type: "PREVIEW_ROW_RESIZE", newHeight: nextPoints });
    };

    const onUp = (): void => {
      safeReleasePointerCapture(current.captureTarget, current.pointerId);
      dispatch({ type: "COMMIT_ROW_RESIZE" });
      resizeRef.current = null;
    };

    const onCancel = (): void => {
      safeReleasePointerCapture(current.captureTarget, current.pointerId);
      dispatch({ type: "END_DRAG" });
      resizeRef.current = null;
    };

    return startWindowPointerDrag({ pointerId: current.pointerId, onMove, onUp, onCancel });
  }, [dispatch, drag, zoom]);

  const onSelectAll = useCallback(() => {
    dispatch({
      type: "SELECT_RANGE",
      range: {
        start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(metrics.colCount), row: rowIdx(metrics.rowCount), colAbsolute: false, rowAbsolute: false },
      },
    });
  }, [dispatch, metrics.colCount, metrics.rowCount]);

  const selectColumn = useCallback(
    (col1: number, extend: boolean): void => {
      if (!extend) {
        dispatch({
          type: "SELECT_RANGE",
          range: {
            start: { col: colIdx(col1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
            end: { col: colIdx(col1), row: rowIdx(metrics.rowCount), colAbsolute: false, rowAbsolute: false },
          },
        });
        return;
      }

      const anchorCol = activeCell?.col as number | undefined;
      const startCol = Math.min(anchorCol ?? col1, col1);
      const endCol = Math.max(anchorCol ?? col1, col1);
      dispatch({
        type: "SELECT_RANGE",
        range: {
          start: { col: colIdx(startCol), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(endCol), row: rowIdx(metrics.rowCount), colAbsolute: false, rowAbsolute: false },
        },
      });
    },
    [activeCell?.col, dispatch, metrics.rowCount],
  );

  const selectRow = useCallback(
    (row1: number, extend: boolean): void => {
      if (!extend) {
        dispatch({
          type: "SELECT_RANGE",
          range: {
            start: { col: colIdx(1), row: rowIdx(row1), colAbsolute: false, rowAbsolute: false },
            end: { col: colIdx(metrics.colCount), row: rowIdx(row1), colAbsolute: false, rowAbsolute: false },
          },
        });
        return;
      }

      const anchorRow = activeCell?.row as number | undefined;
      const startRow = Math.min(anchorRow ?? row1, row1);
      const endRow = Math.max(anchorRow ?? row1, row1);
      dispatch({
        type: "SELECT_RANGE",
        range: {
          start: { col: colIdx(1), row: rowIdx(startRow), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(metrics.colCount), row: rowIdx(endRow), colAbsolute: false, rowAbsolute: false },
        },
      });
    },
    [activeCell?.row, dispatch, metrics.colCount],
  );

  const resizeGuide = useMemo((): { x?: number; y?: number } => {
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
  }, [colHeaderHeightPx, drag, layout, rowHeaderWidthPx, scrollLeft, scrollTop]);

  const columnHeaders = useMemo(() => {
    const nodes: ReactNode[] = [];
    for (let col0 = colRange.start; col0 <= colRange.end; col0 += 1) {
      const col1 = col0 + 1;
      const label = indexToColumnLetter(colIdx(col1));
      const width = layout.cols.getSizePx(col0);
      if (width <= 0) {
        continue;
      }
      const isColSelected = Boolean(
        selectionBounds &&
          selectionBounds.minRow === 1 &&
          selectionBounds.maxRow === metrics.rowCount &&
          col1 >= selectionBounds.minCol &&
          col1 <= selectionBounds.maxCol,
      );

      nodes.push(
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
          onPointerDown={(e) => {
            if (e.button !== 0) {
              return;
            }
            e.preventDefault();
            focusGridRoot(e.target);
            selectColumn(col1, e.shiftKey);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setHeaderMenu({ kind: "col", colIndex: col1, x: e.clientX, y: e.clientY });
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
            touchAction: "none",
          }}
            onPointerDown={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              focusGridRoot(e.target);
              const currentDef = sheet.columns?.find((d) => (d.min as number) <= col1 && col1 <= (d.max as number));
              const widthChars = currentDef?.width ?? pixelsToColumnWidthChar(width);
              safeSetPointerCapture(e.currentTarget, e.pointerId);
              resizeRef.current = {
                kind: "col",
                colIndex: col1,
                startX: e.clientX,
                startWidthPx: width,
                pointerId: e.pointerId,
                captureTarget: e.currentTarget,
              };
              dispatch({ type: "START_COLUMN_RESIZE", colIndex: colIdx(col1), startX: e.clientX, originalWidth: widthChars });
            }}
          />
        </div>,
      );
    }
    return nodes;
  }, [
    colHeaderHeightPx,
    colRange.end,
    colRange.start,
    dispatch,
    focusGridRoot,
    layout.cols,
    metrics.rowCount,
    selectColumn,
    selectionBounds,
    sheet.columns,
  ]);

  const rowHeaders = useMemo(() => {
    const nodes: ReactNode[] = [];
    for (let row0 = rowRange.start; row0 <= rowRange.end; row0 += 1) {
      const row1 = row0 + 1;
      const height = layout.rows.getSizePx(row0);
      if (height <= 0) {
        continue;
      }
      const isRowSelected = Boolean(
        selectionBounds &&
          selectionBounds.minCol === 1 &&
          selectionBounds.maxCol === metrics.colCount &&
          row1 >= selectionBounds.minRow &&
          row1 <= selectionBounds.maxRow,
      );

      nodes.push(
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
          onPointerDown={(e) => {
            if (e.button !== 0) {
              return;
            }
            e.preventDefault();
            focusGridRoot(e.target);
            selectRow(row1, e.shiftKey);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setHeaderMenu({ kind: "row", rowIndex: row1, x: e.clientX, y: e.clientY });
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
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              focusGridRoot(e.target);
              const rowIndex = rowIdx(row1);
              const currentRow = sheet.rows.find((r) => r.rowNumber === rowIndex);
              const heightPoints = currentRow?.height ?? pixelsToPoints(height);
              safeSetPointerCapture(e.currentTarget, e.pointerId);
              resizeRef.current = {
                kind: "row",
                rowIndex: row1,
                startY: e.clientY,
                startHeightPx: height,
                pointerId: e.pointerId,
                captureTarget: e.currentTarget,
              };
              dispatch({ type: "START_ROW_RESIZE", rowIndex, startY: e.clientY, originalHeight: heightPoints });
            }}
          />
        </div>,
      );
    }
    return nodes;
  }, [
    dispatch,
    focusGridRoot,
    layout.rows,
    metrics.colCount,
    rowHeaderWidthPx,
    rowRange.end,
    rowRange.start,
    selectRow,
    selectionBounds,
    sheet.rows,
  ]);

  return (
    <>
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
        onPointerDown={(e) => {
          if (e.button !== 0) {
            return;
          }
          e.preventDefault();
          focusGridRoot(e.target);
          onSelectAll();
        }}
      />

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
        <div style={{ position: "absolute", transform: `translateX(${-scrollLeft}px)` }}>{columnHeaders}</div>
      </div>

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
        <div style={{ position: "absolute", transform: `translateY(${-scrollTop}px)` }}>{rowHeaders}</div>
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
    </>
  );
}
