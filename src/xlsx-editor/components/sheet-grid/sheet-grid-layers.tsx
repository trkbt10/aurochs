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
  readonly layout: ReturnType<typeof import("../../selectors/sheet-layout").createSheetLayout>;
  readonly formulaEvaluator: FormulaEvaluator;
};

export function XlsxSheetGridLayers({
  sheetIndex,
  sheet,
  metrics,
  layout,
  formulaEvaluator,
}: XlsxSheetGridLayersProps) {
  const { dispatch, selection, state, activeSheetIndex, workbook } = useXlsxWorkbookEditor();
  const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = useVirtualScrollContext();

  const rowHeaderWidthPx = metrics.rowHeaderWidthPx ?? metrics.headerSizePx;
  const colHeaderHeightPx = metrics.colHeaderHeightPx ?? metrics.rowHeightPx;

  const gridViewportWidth = Math.max(0, viewportWidth - rowHeaderWidthPx);
  const gridViewportHeight = Math.max(0, viewportHeight - colHeaderHeightPx);

  const firstRow0 = layout.rows.findIndexAtOffset(scrollTop);
  const lastRow0 = layout.rows.findIndexAtOffset(scrollTop + gridViewportHeight);
  const firstCol0 = layout.cols.findIndexAtOffset(scrollLeft);
  const lastCol0 = layout.cols.findIndexAtOffset(scrollLeft + gridViewportWidth);

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
        scrollTop={scrollTop}
        scrollLeft={scrollLeft}
        selectionBounds={selectionBounds}
        isWholeSheetSelected={isWholeSheetSelected}
        activeCell={selection.activeCell}
        drag={state.drag}
        dispatch={dispatch}
        focusGridRoot={focusGridRoot}
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
        scrollTop={scrollTop}
        scrollLeft={scrollLeft}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
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
      >
        <XlsxSheetGridCellsLayer
          sheetIndex={sheetIndex}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          metrics={{ rowCount: metrics.rowCount, colCount: metrics.colCount }}
          rowRange={rowRange}
          colRange={colRange}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          normalizedMerges={normalizedMerges}
          dispatch={dispatch}
          focusGridRoot={focusGridRoot}
          formulaEvaluator={formulaEvaluator}
        />
      </XlsxSheetGridCellViewport>
    </div>
  );
}
