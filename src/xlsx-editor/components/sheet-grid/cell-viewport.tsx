/**
 * @file Sheet grid viewport (overlay layer)
 *
 * Renders selection overlays, gridlines/borders, and the inline cell editor within the visible viewport.
 */

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import type { XlsxStyleSheet } from "../../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { colorTokens } from "../../../office-editor-components";
import { XlsxCellEditorOverlay } from "../cell-input/XlsxCellEditorOverlay";
import type { ParseCellUserInputResult } from "../cell-input/parse-cell-user-input";
import { buildBorderOverlayLines } from "../../selectors/border-overlay";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";
import { getVisibleGridLineSegments } from "./gridline-geometry";
import { clipRectToViewport, getActiveCellRect, getSelectedRangeRect } from "./selection-geometry";
import { createSheetLayout } from "../../selectors/sheet-layout";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import { startFillHandlePointerDrag } from "./fill-handle-drag";
import { startRangeSelectPointerDrag } from "./range-select-drag";
import { hitTestCellFromPointerEvent } from "./cell-hit-test";

const selectionOutlineStyle: CSSProperties = {
  position: "absolute",
  border: `2px solid var(--accent, ${colorTokens.accent.primary})`,
  pointerEvents: "none",
  boxSizing: "border-box",
};

const multiSelectionOutlineStyle: CSSProperties = {
  position: "absolute",
  border: `1px solid var(--accent, ${colorTokens.accent.primary})`,
  pointerEvents: "none",
  boxSizing: "border-box",
  opacity: 0.7,
};

const selectionFillStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: `color-mix(in srgb, var(--accent, ${colorTokens.accent.primary}) 18%, transparent)`,
  pointerEvents: "none",
};

const multiSelectionFillStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: `color-mix(in srgb, var(--accent, ${colorTokens.accent.primary}) 8%, transparent)`,
  pointerEvents: "none",
};

const FILL_HANDLE_SIZE_PX = 8;

const fillHandleStyle: CSSProperties = {
  position: "absolute",
  width: FILL_HANDLE_SIZE_PX,
  height: FILL_HANDLE_SIZE_PX,
  backgroundColor: `var(--accent, ${colorTokens.accent.primary})`,
  border: `1px solid var(--bg-primary, ${colorTokens.background.primary})`,
  boxSizing: "border-box",
  cursor: "crosshair",
  pointerEvents: "auto",
  touchAction: "none",
};

export type XlsxSheetGridCellViewportProps = {
  readonly sheet: XlsxWorksheet;
  readonly workbookStyles: XlsxStyleSheet;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
    readonly rowHeaderWidthPx: number;
    readonly colHeaderHeightPx: number;
  };
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  /** Display zoom factor (1 = 100%). */
  readonly zoom: number;
  readonly focusGridRoot: (target: EventTarget) => void;
  readonly selection: {
    readonly selectedRanges: readonly { readonly start: CellAddress; readonly end: CellAddress }[];
    readonly activeRange: { readonly start: CellAddress; readonly end: CellAddress } | undefined;
    readonly activeCell: CellAddress | undefined;
  };
  readonly state: {
    readonly editingCell: CellAddress | undefined;
  };
  readonly activeSheetIndex: number | undefined;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
  readonly children: React.ReactNode;
};

/**
 * Viewport overlay for the sheet grid.
 *
 * This component does not render cell contents; it overlays selection rectangles, gridlines/borders,
 * merge outlines, and the inline editor above the cells layer.
 */
export function XlsxSheetGridCellViewport({
  sheet,
  workbookStyles,
  layout,
  metrics,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
  zoom,
  focusGridRoot,
  selection,
  state,
  activeSheetIndex,
  normalizedMerges,
  dispatch,
  children,
}: XlsxSheetGridCellViewportProps) {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(`XlsxSheetGridCellViewport zoom must be a positive finite number: ${String(zoom)}`);
  }
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fillDragListener = useRef<(() => void) | null>(null);
  const rangeSelectCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      const cleanup = fillDragListener.current;
      if (cleanup) {
        cleanup();
      }
      fillDragListener.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      const cleanup = rangeSelectCleanupRef.current;
      if (cleanup) {
        cleanup();
      }
      rangeSelectCleanupRef.current = null;
    };
  }, []);

  const rowHeaderWidthPx = metrics.rowHeaderWidthPx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx;

  const gridViewportWidth = Math.max(0, viewportWidth - rowHeaderWidthPx);
  const gridViewportHeight = Math.max(0, viewportHeight - colHeaderHeightPx);

  const selectedRangeRects = useMemo(() => {
    return selection.selectedRanges
      .map((range) => clipRectToViewport(getSelectedRangeRect(range, layout, scrollTop, scrollLeft), gridViewportWidth, gridViewportHeight))
      .filter((rect) => rect !== null);
  }, [gridViewportHeight, gridViewportWidth, layout, scrollLeft, scrollTop, selection.selectedRanges]);

  const activeRangeRect = useMemo(() => {
    const rect = getSelectedRangeRect(selection.activeRange, layout, scrollTop, scrollLeft);
    return clipRectToViewport(rect, gridViewportWidth, gridViewportHeight);
  }, [gridViewportHeight, gridViewportWidth, layout, scrollLeft, scrollTop, selection.activeRange]);

  const gridLineSegments = useMemo(() => {
    if (sheet.sheetView?.showGridLines === false) {
      return { vertical: [], horizontal: [] } as const;
    }
    return getVisibleGridLineSegments({
      rowRange,
      colRange,
      layout,
      scrollTop,
      scrollLeft,
      viewportWidth: gridViewportWidth,
      viewportHeight: gridViewportHeight,
      normalizedMerges,
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
    });
  }, [
    colRange,
    gridViewportHeight,
    gridViewportWidth,
    layout,
    metrics.colCount,
    metrics.rowCount,
    normalizedMerges,
    rowRange,
    scrollLeft,
    scrollTop,
    sheet.sheetView?.showGridLines,
  ]);

  const borderLines = useMemo(() => {
    return buildBorderOverlayLines({
      sheet,
      styles: workbookStyles,
      layout,
      rowRange,
      colRange,
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
      scrollTop,
      scrollLeft,
      defaultBorderColor: `var(--border-primary, ${colorTokens.border.primary})`,
    });
  }, [colRange, layout, metrics.colCount, metrics.rowCount, rowRange, scrollLeft, scrollTop, sheet, workbookStyles]);

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

  const handleFillHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) {
        return;
      }
      const activeRange = selection.activeRange;
      if (!activeRange) {
        return;
      }
      if (state.editingCell) {
        return;
      }
      const container = containerRef.current;
      if (!container) {
        throw new Error("Expected fill handle container");
      }

      event.preventDefault();
      event.stopPropagation();

      const cleanupPrevious = fillDragListener.current;
      if (cleanupPrevious) {
        cleanupPrevious();
      }

      fillDragListener.current = startFillHandlePointerDrag({
        pointerId: event.pointerId,
        captureTarget: event.currentTarget,
        container,
        baseRange: activeRange,
        scrollLeft,
        scrollTop,
        layout,
        metrics: { rowCount: metrics.rowCount, colCount: metrics.colCount },
        zoom,
        normalizedMerges,
        dispatch,
      });
    },
    [dispatch, layout, metrics.colCount, metrics.rowCount, normalizedMerges, scrollLeft, scrollTop, selection.activeRange, state.editingCell, zoom],
  );

  const hitTestViewportCell = useCallback(
    (e: Pick<PointerEvent, "clientX" | "clientY">, container: HTMLElement): CellAddress => {
      return hitTestCellFromPointerEvent({
        e,
        container,
        scrollLeft,
        scrollTop,
        layout,
        metrics: { rowCount: metrics.rowCount, colCount: metrics.colCount },
        normalizedMerges,
        zoom,
      });
    },
    [layout, metrics.colCount, metrics.rowCount, normalizedMerges, scrollLeft, scrollTop, zoom],
  );

  const getCellAddressFromEventTarget = useCallback((target: EventTarget): CellAddress | null => {
    const el =
      target instanceof HTMLElement ? target : target instanceof Node ? (target.parentElement as HTMLElement | null) : null;
    const cell = el?.closest("[data-xlsx-cell-col][data-xlsx-cell-row]") as HTMLElement | null;
    if (!cell) {
      return null;
    }

    const col = Number(cell.dataset.xlsxCellCol);
    const row = Number(cell.dataset.xlsxCellRow);
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 1 || row < 1) {
      return null;
    }

    return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
  }, []);

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) {
        return;
      }
      if (state.editingCell) {
        return;
      }

      event.preventDefault();
      focusGridRoot(event.currentTarget);

      const address = getCellAddressFromEventTarget(event.target) ?? hitTestViewportCell(event.nativeEvent, event.currentTarget);
      const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;
      const origin = merge?.origin ?? address;

      if (event.metaKey || event.ctrlKey) {
        dispatch({ type: "ADD_RANGE_TO_SELECTION", range: merge?.range ?? { start: origin, end: origin } });
        return;
      }
      if (event.shiftKey) {
        dispatch({ type: "SELECT_CELL", address: origin, extend: true });
        return;
      }

      const previous = rangeSelectCleanupRef.current;
      if (previous) {
        previous();
      }
      rangeSelectCleanupRef.current = startRangeSelectPointerDrag({
        pointerId: event.pointerId,
        captureTarget: event.currentTarget,
        container: event.currentTarget,
        startAddress: origin,
        scrollLeft,
        scrollTop,
        layout,
        metrics: { rowCount: metrics.rowCount, colCount: metrics.colCount },
        zoom,
        normalizedMerges,
        dispatch,
      });
    },
    [dispatch, focusGridRoot, getCellAddressFromEventTarget, hitTestViewportCell, layout, metrics.colCount, metrics.rowCount, normalizedMerges, scrollLeft, scrollTop, state.editingCell, zoom],
  );

  const handleViewportDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      if (state.editingCell) {
        return;
      }
      event.preventDefault();
      focusGridRoot(event.currentTarget);

      const address =
        getCellAddressFromEventTarget(event.target) ?? hitTestViewportCell(event.nativeEvent, event.currentTarget);
      const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;
      const origin = merge?.origin ?? address;

      if (merge) {
        dispatch({ type: "SELECT_RANGE", range: merge.range });
        dispatch({ type: "ENTER_CELL_EDIT", address: origin });
        return;
      }

      dispatch({ type: "SELECT_CELL", address: origin });
      dispatch({ type: "ENTER_CELL_EDIT", address: origin });
    },
    [dispatch, focusGridRoot, getCellAddressFromEventTarget, hitTestViewportCell, normalizedMerges, state.editingCell],
  );

  return (
    <div
      ref={containerRef}
      data-xlsx-grid-viewport="true"
      style={{
        position: "absolute",
        left: rowHeaderWidthPx,
        top: colHeaderHeightPx,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
      }}
      onPointerDown={handleViewportPointerDown}
      onDoubleClick={handleViewportDoubleClick}
    >
      {sheet.sheetView?.showGridLines !== false && gridViewportWidth > 0 && gridViewportHeight > 0 && (
        <svg
          data-testid="xlsx-gridlines"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={gridViewportWidth}
          height={gridViewportHeight}
          viewBox={`0 0 ${gridViewportWidth} ${gridViewportHeight}`}
        >
          {gridLineSegments.vertical.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={`var(--border-primary, ${colorTokens.border.primary})`}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ))}
          {gridLineSegments.horizontal.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={`var(--border-primary, ${colorTokens.border.primary})`}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ))}
        </svg>
      )}

      {children}

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

      {selectedRangeRects.map((rect, idx) => (
        <div
          key={`multi-selection-fill-${idx}`}
          data-testid="xlsx-selection-fill-multi"
          style={{
            ...multiSelectionFillStyle,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}
      {selectedRangeRects.map((rect, idx) => (
        <div
          key={`multi-selection-outline-${idx}`}
          data-testid="xlsx-selection-outline-multi"
          style={{
            ...multiSelectionOutlineStyle,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}

      {activeRangeRect && (
        <div
          data-testid="xlsx-selection-fill"
          style={{
            ...selectionFillStyle,
            left: activeRangeRect.left,
            top: activeRangeRect.top,
            width: activeRangeRect.width,
            height: activeRangeRect.height,
          }}
        />
      )}
      {activeRangeRect && (
        <div
          data-testid="xlsx-selection-outline"
          style={{
            ...selectionOutlineStyle,
            left: activeRangeRect.left,
            top: activeRangeRect.top,
            width: activeRangeRect.width,
            height: activeRangeRect.height,
          }}
        />
      )}

      {activeRangeRect && selection.activeRange && !state.editingCell && (
        <div
          data-testid="xlsx-selection-fill-handle"
          style={{
            ...fillHandleStyle,
            left: activeRangeRect.left + activeRangeRect.width - FILL_HANDLE_SIZE_PX,
            top: activeRangeRect.top + activeRangeRect.height - FILL_HANDLE_SIZE_PX,
          }}
          onPointerDown={handleFillHandlePointerDown}
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
  );
}
