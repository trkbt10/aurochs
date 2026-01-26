/**
 * @file Sheet grid layer composition
 *
 * Wires VirtualScroll viewport state (scroll offsets + visible ranges) into the grid layers:
 * - headers
 * - cell viewport overlays (selection, gridlines, borders, editor)
 * - cell content layer
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { clampRange, useVirtualScrollContext } from "../../../office-editor-components";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import type { FormulaEvaluator } from "../../../xlsx/formula/evaluator";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { normalizeMergeRange } from "../../sheet/merge-range";
import { getAllSelectedRanges } from "../../context/workbook/state/selection";
import { getRangeBounds } from "./selection-geometry";
import { XlsxSheetGridHeaderLayer } from "./header-layer";
import { XlsxSheetGridCellViewport } from "./cell-viewport";
import { XlsxSheetGridCellsLayer } from "./cells-layer";
import type { SheetLayout } from "../../selectors/sheet-layout";

const layerRootStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  userSelect: "none",
};

export type XlsxSheetGridLayersProps = {
  readonly sheetIndex: number;
  readonly sheet: XlsxWorksheet;
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
    readonly rowHeightPx: number;
    readonly colWidthPx: number;
    readonly headerSizePx: number;
    readonly rowHeaderWidthPx?: number;
    readonly colHeaderHeightPx?: number;
    readonly overscanRows: number;
    readonly overscanCols: number;
  };
  readonly layout: SheetLayout;
  readonly formulaEvaluator: FormulaEvaluator;
  /** Display zoom factor (1 = 100%). */
  readonly zoom: number;
};

/**
 * Render the sheet grid as a set of layered components inside the VirtualScroll root.
 */
export function XlsxSheetGridLayers({
  sheetIndex,
  sheet,
  metrics,
  layout,
  formulaEvaluator,
  zoom,
}: XlsxSheetGridLayersProps) {
  const { dispatch, selection, state, activeSheetIndex, workbook } = useXlsxWorkbookEditor();
  const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = useVirtualScrollContext();

  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(`XlsxSheetGridLayers zoom must be a positive finite number: ${String(zoom)}`);
  }

  const scrollTopUnscaled = scrollTop / zoom;
  const scrollLeftUnscaled = scrollLeft / zoom;
  const viewportWidthUnscaled = viewportWidth / zoom;
  const viewportHeightUnscaled = viewportHeight / zoom;

  const rowHeaderWidthPx = metrics.rowHeaderWidthPx ?? metrics.headerSizePx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx ?? metrics.rowHeightPx;

  const gridViewportWidth = Math.max(0, viewportWidthUnscaled - rowHeaderWidthPx);
  const gridViewportHeight = Math.max(0, viewportHeightUnscaled - colHeaderHeightPx);

  const firstRow0 = layout.rows.findIndexAtOffset(scrollTopUnscaled);
  const lastRow0 = layout.rows.findIndexAtOffset(scrollTopUnscaled + gridViewportHeight);
  const firstCol0 = layout.cols.findIndexAtOffset(scrollLeftUnscaled);
  const lastCol0 = layout.cols.findIndexAtOffset(scrollLeftUnscaled + gridViewportWidth);

  const rowRange = clampRange(firstRow0 - metrics.overscanRows, lastRow0 + metrics.overscanRows, 0, metrics.rowCount - 1);
  const colRange = clampRange(firstCol0 - metrics.overscanCols, lastCol0 + metrics.overscanCols, 0, metrics.colCount - 1);

  const normalizedMerges = useMemo(() => {
    const merges = sheet.mergeCells ?? [];
    if (merges.length === 0) {
      return [];
    }
    return merges.map((m) => normalizeMergeRange(m));
  }, [sheet.mergeCells]);

  const selectedRanges = useMemo(() => {
    return getAllSelectedRanges(selection);
  }, [selection]);

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

  const focusGridRoot = useCallback((target: EventTarget): void => {
    const el = target instanceof HTMLElement ? target : null;
    const root = el?.closest('[data-virtual-scroll-root="true"]') as HTMLElement | null;
    root?.focus();
  }, []);

  return (
    <div style={layerRootStyle}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: viewportWidthUnscaled,
          height: viewportHeightUnscaled,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        <XlsxSheetGridHeaderLayer
          sheet={sheet}
          layout={layout}
          metrics={{
            rowCount: metrics.rowCount,
            colCount: metrics.colCount,
            rowHeightPx: metrics.rowHeightPx,
            colWidthPx: metrics.colWidthPx,
            headerSizePx: metrics.headerSizePx,
            rowHeaderWidthPx,
            colHeaderHeightPx,
          }}
          rowRange={rowRange}
          colRange={colRange}
          scrollTop={scrollTopUnscaled}
          scrollLeft={scrollLeftUnscaled}
          selectionBounds={selectionBounds}
          isWholeSheetSelected={isWholeSheetSelected}
          activeCell={selection.activeCell}
          drag={state.drag}
          dispatch={dispatch}
          focusGridRoot={focusGridRoot}
          zoom={zoom}
        />

        <XlsxSheetGridCellViewport
          sheet={sheet}
          workbookStyles={workbook.styles}
          layout={layout}
          metrics={{
            rowCount: metrics.rowCount,
            colCount: metrics.colCount,
            rowHeaderWidthPx,
            colHeaderHeightPx,
          }}
          rowRange={rowRange}
          colRange={colRange}
          scrollTop={scrollTopUnscaled}
          scrollLeft={scrollLeftUnscaled}
          viewportWidth={viewportWidthUnscaled}
          viewportHeight={viewportHeightUnscaled}
          selection={{
            selectedRanges,
            activeRange: selection.selectedRange,
            activeCell: selection.activeCell,
          }}
          state={{
            editingCell: state.editingCell,
          }}
          activeSheetIndex={activeSheetIndex}
          normalizedMerges={normalizedMerges}
          dispatch={dispatch}
          zoom={zoom}
          focusGridRoot={focusGridRoot}
        >
          <XlsxSheetGridCellsLayer
            sheetIndex={sheetIndex}
            sheet={sheet}
            styles={workbook.styles}
            layout={layout}
            rowRange={rowRange}
            colRange={colRange}
            scrollTop={scrollTopUnscaled}
            scrollLeft={scrollLeftUnscaled}
            normalizedMerges={normalizedMerges}
            formulaEvaluator={formulaEvaluator}
          />
        </XlsxSheetGridCellViewport>
      </div>
    </div>
  );
}
