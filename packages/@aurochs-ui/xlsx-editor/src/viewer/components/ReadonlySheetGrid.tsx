/**
 * @file ReadonlySheetGrid
 *
 * Read-only spreadsheet grid for workbook viewer.
 * Composes core rendering components from @aurochs-ui/xlsx-sheet
 * without editing capabilities.
 */

import { useMemo, type CSSProperties } from "react";
import { VirtualScroll, useVirtualScrollContext, clampRange } from "@aurochs-ui/ui-components";
import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { createFormulaEvaluator } from "@aurochs-office/xlsx/formula/evaluator";
import {
  CoreCellsLayer,
  CoreSheetViewport,
  CoreHeaderLayer,
} from "@aurochs-ui/xlsx-sheet/core";
import { createSheetLayout } from "@aurochs-ui/xlsx-sheet/selectors/sheet-layout";
import { normalizeMergeRange } from "@aurochs-ui/xlsx-sheet/sheet/merge-range";

export type ReadonlySheetGridProps = {
  /** The workbook containing styles and shared data */
  readonly workbook: XlsxWorkbook;
  /** The sheet to render */
  readonly sheet: XlsxWorksheet;
  /** Sheet index in workbook (0-based) */
  readonly sheetIndex: number;
  /** Grid metrics */
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
    readonly rowHeightPx: number;
    readonly colWidthPx: number;
    readonly rowHeaderWidthPx: number;
    readonly colHeaderHeightPx: number;
  };
  /** Zoom level (1 = 100%) */
  readonly zoom?: number;
  /** Show gridlines (default: true) */
  readonly showGridlines?: boolean;
  /** Show row/column headers (default: true) */
  readonly showHeaders?: boolean;
  /** Whether to evaluate conditional formatting (default: true) */
  readonly enableConditionalFormatting?: boolean;
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

type GridLayersProps = {
  readonly workbook: XlsxWorkbook;
  readonly sheet: XlsxWorksheet;
  readonly sheetIndex: number;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly metrics: ReadonlySheetGridProps["metrics"];
  readonly formulaEvaluator: ReturnType<typeof createFormulaEvaluator>;
  readonly normalizedMerges: ReturnType<typeof normalizeMergeRange>[];
  readonly zoom: number;
  readonly showHeaders: boolean;
  readonly enableConditionalFormatting: boolean;
};

function GridLayers({
  workbook,
  sheet,
  sheetIndex,
  layout,
  metrics,
  formulaEvaluator,
  normalizedMerges,
  zoom,
  showHeaders,
  enableConditionalFormatting,
}: GridLayersProps) {
  const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = useVirtualScrollContext();

  const scrollTopUnscaled = scrollTop / zoom;
  const scrollLeftUnscaled = scrollLeft / zoom;
  const viewportWidthUnscaled = viewportWidth / zoom;
  const viewportHeightUnscaled = viewportHeight / zoom;

  const headerOffsetX = showHeaders ? metrics.rowHeaderWidthPx : 0;
  const headerOffsetY = showHeaders ? metrics.colHeaderHeightPx : 0;

  const gridViewportWidth = Math.max(0, viewportWidthUnscaled - headerOffsetX);
  const gridViewportHeight = Math.max(0, viewportHeightUnscaled - headerOffsetY);

  const firstRow0 = layout.rows.findIndexAtOffset(scrollTopUnscaled);
  const lastRow0 = layout.rows.findIndexAtOffset(scrollTopUnscaled + gridViewportHeight);
  const firstCol0 = layout.cols.findIndexAtOffset(scrollLeftUnscaled);
  const lastCol0 = layout.cols.findIndexAtOffset(scrollLeftUnscaled + gridViewportWidth);

  const overscan = 2;
  const rowRange = clampRange({
    start: firstRow0 - overscan,
    end: lastRow0 + overscan,
    min: 0,
    max: metrics.rowCount - 1,
  });
  const colRange = clampRange({
    start: firstCol0 - overscan,
    end: lastCol0 + overscan,
    min: 0,
    max: metrics.colCount - 1,
  });

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
        {showHeaders && (
          <CoreHeaderLayer
            layout={layout}
            rowRange={rowRange}
            colRange={colRange}
            scrollTop={scrollTopUnscaled}
            scrollLeft={scrollLeftUnscaled}
            rowHeaderWidthPx={metrics.rowHeaderWidthPx}
            colHeaderHeightPx={metrics.colHeaderHeightPx}
          />
        )}

        <CoreSheetViewport
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={rowRange}
          colRange={colRange}
          scrollTop={scrollTopUnscaled}
          scrollLeft={scrollLeftUnscaled}
          viewportWidth={gridViewportWidth}
          viewportHeight={gridViewportHeight}
          rowCount={metrics.rowCount}
          colCount={metrics.colCount}
          normalizedMerges={normalizedMerges}
          headerOffsetX={headerOffsetX}
          headerOffsetY={headerOffsetY}
          drawing={sheet.drawing}
          resourceStore={workbook.resourceStore}
        >
          <CoreCellsLayer
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
            colorScheme={workbook.theme?.colorScheme}
            enableConditionalFormatting={enableConditionalFormatting}
          />
        </CoreSheetViewport>
      </div>
    </div>
  );
}

/**
 * Read-only spreadsheet grid component.
 *
 * Composes core rendering components from @aurochs-ui/xlsx-sheet for
 * consistent visual output with the editor.
 */
export function ReadonlySheetGrid({
  workbook,
  sheet,
  sheetIndex,
  metrics,
  zoom = 1,
  showGridlines: _showGridlines = true,
  showHeaders = true,
  enableConditionalFormatting = true,
}: ReadonlySheetGridProps) {
  const layout = useMemo(() => {
    return createSheetLayout(sheet, {
      rowCount: metrics.rowCount,
      colCount: metrics.colCount,
      defaultRowHeightPx: metrics.rowHeightPx,
      defaultColWidthPx: metrics.colWidthPx,
    });
  }, [sheet, metrics]);

  const formulaEvaluator = useMemo(() => createFormulaEvaluator(workbook), [workbook]);

  const normalizedMerges = useMemo(() => {
    const merges = sheet.mergeCells ?? [];
    if (merges.length === 0) { return []; }
    return merges.map((m) => normalizeMergeRange(m));
  }, [sheet.mergeCells]);

  const headerOffsetX = showHeaders ? metrics.rowHeaderWidthPx : 0;
  const headerOffsetY = showHeaders ? metrics.colHeaderHeightPx : 0;
  const contentWidth = (headerOffsetX + layout.totalColsWidthPx) * zoom;
  const contentHeight = (headerOffsetY + layout.totalRowsHeightPx) * zoom;

  return (
    <div style={rootStyle}>
      <VirtualScroll contentWidth={contentWidth} contentHeight={contentHeight}>
        <GridLayers
          workbook={workbook}
          sheet={sheet}
          sheetIndex={sheetIndex}
          layout={layout}
          metrics={metrics}
          formulaEvaluator={formulaEvaluator}
          normalizedMerges={normalizedMerges}
          zoom={zoom}
          showHeaders={showHeaders}
          enableConditionalFormatting={enableConditionalFormatting}
        />
      </VirtualScroll>
    </div>
  );
}
