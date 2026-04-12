/**
 * @file Sheet grid interactive overlay
 *
 * Renders selection rectangles, fill handle, formula reference overlay,
 * and inline cell editor. Handles pointer events for cell selection,
 * drag-select, and fill-drag.
 *
 * This component is a sibling of CoreSheetViewport, positioned at the
 * same coordinates. It does NOT render gridlines, borders, or cell content —
 * those are handled by CoreSheetViewport (the SoT for grid rendering).
 */

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { colorTokens } from "@aurochs-ui/ui-components";
import { useCoreSheetViewport } from "@aurochs-ui/xlsx-sheet/core";
import { XlsxCellEditorOverlay } from "../cell-input/XlsxCellEditorOverlay";
import { findMergeForCell, type NormalizedMergeRange } from "@aurochs-ui/xlsx-sheet/sheet/merge-range";
import { clipRectToViewport, getActiveCellRect, getSelectedRangeRect } from "./selection-geometry";
import type { SheetLayout } from "@aurochs-ui/xlsx-sheet/selectors/sheet-layout";
import type { CellEditingState, XlsxEditorAction } from "../../context/workbook/editor/types";
import { startFillHandlePointerDrag } from "./fill-handle-drag";
import { startRangeSelectPointerDrag } from "./range-select-drag";
import { hitTestCellFromPointerEvent } from "./cell-hit-test";
import { analyzeFormula } from "../../formula-edit/formula-analysis";
import { FormulaReferenceOverlay } from "./FormulaReferenceOverlay";
import { isReferenceInsertionPoint, buildReferenceText } from "../../formula-edit/formula-reference-insert";
import { startFormulaRangeDrag } from "./formula-range-drag";

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

/** Resolve an EventTarget to the nearest HTMLElement (or null). */
function resolveElementFromTarget(target: EventTarget): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target;
  }
  if (target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

function computeNextPosition(params: {
  readonly direction: "down" | "up" | "right" | "left";
  readonly col: number;
  readonly row: number;
  readonly rowCount: number;
  readonly colCount: number;
}): { readonly nextCol: number; readonly nextRow: number } {
  const { direction, col, row, rowCount, colCount } = params;
  switch (direction) {
    case "down":
      return { nextCol: col, nextRow: Math.min(row + 1, rowCount) };
    case "up":
      return { nextCol: col, nextRow: Math.max(row - 1, 1) };
    case "right":
      return { nextCol: Math.min(col + 1, colCount), nextRow: row };
    case "left":
      return { nextCol: Math.max(col - 1, 1), nextRow: row };
  }
}

export type XlsxSheetGridCellViewportProps = {
  readonly sheet: XlsxWorksheet;
  readonly layout: SheetLayout;
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
  };
  readonly scrollTop: number;
  readonly scrollLeft: number;
  /** Display zoom factor (1 = 100%). */
  readonly zoom: number;
  readonly focusGridRoot: (target: EventTarget) => void;
  readonly selection: {
    readonly selectedRanges: readonly { readonly start: CellAddress; readonly end: CellAddress }[];
    readonly activeRange: { readonly start: CellAddress; readonly end: CellAddress } | undefined;
    readonly activeCell: CellAddress | undefined;
  };
  readonly state: {
    readonly editing: CellEditingState | undefined;
  };
  readonly activeSheetIndex: number | undefined;
  /** Name of the sheet where editing started (for cross-sheet reference qualification) */
  readonly editingSheetName: string | undefined;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
  /** Cell content layer (CellsLayer), rendered inside the interactive overlay container */
  readonly children?: React.ReactNode;
};

/**
 * Interactive overlay for the sheet grid.
 *
 * Renders selection rectangles, fill handle, formula reference overlay,
 * and inline cell editor. Handles pointer events for cell selection.
 *
 * This is a sibling of CoreSheetViewport, positioned at the same absolute
 * coordinates. It uses `viewportContainerBaseStyle` from xlsx-sheet to
 * ensure pixel-perfect alignment with the grid below.
 */
export function XlsxSheetGridCellViewport({
  sheet,
  layout,
  metrics,
  scrollTop,
  scrollLeft,
  zoom,
  focusGridRoot,
  selection,
  state,
  activeSheetIndex: _activeSheetIndex,
  editingSheetName,
  normalizedMerges,
  dispatch,
  children,
}: XlsxSheetGridCellViewportProps) {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(`XlsxSheetGridCellViewport zoom must be a positive finite number: ${String(zoom)}`);
  }
  const { viewportWidth: gridViewportWidth, viewportHeight: gridViewportHeight } = useCoreSheetViewport();
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

  const selectedRangeRects = useMemo(() => {
    return selection.selectedRanges
      .map((range) =>
        clipRectToViewport(
          getSelectedRangeRect({ range, layout, scrollTop, scrollLeft }),
          gridViewportWidth,
          gridViewportHeight,
        ),
      )
      .filter((rect) => rect !== null);
  }, [gridViewportHeight, gridViewportWidth, layout, scrollLeft, scrollTop, selection.selectedRanges]);

  const activeRangeRect = useMemo(() => {
    const rect = getSelectedRangeRect({ range: selection.activeRange, layout, scrollTop, scrollLeft });
    return clipRectToViewport(rect, gridViewportWidth, gridViewportHeight);
  }, [gridViewportHeight, gridViewportWidth, layout, scrollLeft, scrollTop, selection.activeRange]);

  const editingCell = state.editing?.address;
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
    return getActiveCellRect({ cell: editingCell, layout, scrollTop, scrollLeft });
  }, [editingCell, layout, normalizedMerges, scrollLeft, scrollTop]);

  const formulaReferences = useMemo(() => {
    const editing = state.editing;
    if (!editing || !editing.isFormulaMode) {
      return undefined;
    }
    return analyzeFormula(editing.text, editing.caretOffset).references;
  }, [state.editing?.text, state.editing?.caretOffset, state.editing?.isFormulaMode]);

  const handleCommitAndMove = useCallback(
    (direction: "down" | "up" | "right" | "left"): void => {
      const cell = editingCell;
      if (!cell) {
        return;
      }
      const { nextCol, nextRow } = computeNextPosition({
        direction,
        col: cell.col as number,
        row: cell.row as number,
        rowCount: metrics.rowCount,
        colCount: metrics.colCount,
      });

      dispatch({
        type: "SELECT_CELL",
        address: {
          col: colIdx(nextCol),
          row: rowIdx(nextRow),
          colAbsolute: false,
          rowAbsolute: false,
        },
      });
    },
    [dispatch, editingCell, metrics.colCount, metrics.rowCount],
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
      if (state.editing) {
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
    [
      dispatch,
      layout,
      metrics.colCount,
      metrics.rowCount,
      normalizedMerges,
      scrollLeft,
      scrollTop,
      selection.activeRange,
      state.editing,
      zoom,
    ],
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
    const el = resolveElementFromTarget(target);
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

      const address =
        getCellAddressFromEventTarget(event.target) ?? hitTestViewportCell(event.nativeEvent, event.currentTarget);
      const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;
      const origin = merge?.origin ?? address;

      // Formula-mode: check if the click should insert a reference or commit the formula
      if (state.editing?.isFormulaMode) {
        if (isReferenceInsertionPoint(state.editing.text, state.editing.caretOffset)) {
          event.preventDefault();
          const refText = buildReferenceText(
            { start: origin, end: origin },
            editingSheetName ?? sheet.name,
            sheet.name,
          );
          const refInsertOffset = state.editing.caretOffset;
          dispatch({ type: "INSERT_CELL_REFERENCE", refText });

          // Start formula range drag so the user can expand the reference by dragging
          const previous = rangeSelectCleanupRef.current;
          if (previous) {
            previous();
          }
          rangeSelectCleanupRef.current = startFormulaRangeDrag({
            pointerId: event.pointerId,
            captureTarget: event.currentTarget,
            container: event.currentTarget,
            startAddress: origin,
            editingSheetName: editingSheetName ?? sheet.name,
            currentSheetName: sheet.name,
            editingText: state.editing.text.slice(0, refInsertOffset) + refText + state.editing.text.slice(refInsertOffset),
            refInsertOffset,
            refLength: refText.length,
            scrollLeft,
            scrollTop,
            layout,
            metrics,
            zoom,
            normalizedMerges,
            dispatch,
          });
          return;
        }
        // Not an insertion point → commit the formula and fall through to normal selection
        dispatch({ type: "COMMIT_CELL_EDIT" });
      } else if (state.editing) {
        // Non-formula editing: commit the edit first
        dispatch({ type: "COMMIT_CELL_EDIT" });
      }

      event.preventDefault();
      focusGridRoot(event.currentTarget);

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
    [
      dispatch,
      editingSheetName,
      focusGridRoot,
      getCellAddressFromEventTarget,
      hitTestViewportCell,
      layout,
      metrics,
      normalizedMerges,
      scrollLeft,
      scrollTop,
      sheet.name,
      state.editing,
      zoom,
    ],
  );

  const handleViewportDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      if (state.editing) {
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
        dispatch({ type: "ENTER_CELL_EDIT", address: origin, entryMode: "enter" });
        return;
      }

      dispatch({ type: "SELECT_CELL", address: origin });
      dispatch({ type: "ENTER_CELL_EDIT", address: origin, entryMode: "enter" });
    },
    [dispatch, focusGridRoot, getCellAddressFromEventTarget, hitTestViewportCell, normalizedMerges, state.editing],
  );

  return (
    <div
      ref={containerRef}
      data-xlsx-grid-viewport="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
      }}
      onPointerDown={handleViewportPointerDown}
      onDoubleClick={handleViewportDoubleClick}
    >
      {children}

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

      {activeRangeRect && selection.activeRange && !state.editing && (
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

      {formulaReferences && formulaReferences.length > 0 && (
        <FormulaReferenceOverlay
          references={formulaReferences}
          activeSheetName={sheet.name}
          editingSheetName={editingSheetName}
          layout={layout}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          viewportWidth={gridViewportWidth}
          viewportHeight={gridViewportHeight}
        />
      )}

      {editingCell && editingRect && state.editing?.origin === "cell" && (
        <XlsxCellEditorOverlay
          sheet={sheet}
          address={editingCell}
          rect={editingRect}
          onCommitAndMove={handleCommitAndMove}
          onCancel={() => dispatch({ type: "EXIT_CELL_EDIT" })}
        />
      )}
    </div>
  );
}
