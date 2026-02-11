/**
 * @file ReadonlySheetGrid
 *
 * Read-only spreadsheet grid for workbook viewer.
 * Renders cells without editing capabilities.
 */

import { useMemo, type CSSProperties } from "react";
import { VirtualScroll, useVirtualScrollContext, clampRange, spacingTokens, colorTokens, fontTokens } from "@aurochs-ui/ui-components";
import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import { createFormulaEvaluator, type FormulaEvaluator } from "@aurochs-office/xlsx/formula/evaluator";
import { createSheetLayout, type SheetLayout } from "../../selectors/sheet-layout";
import { getCell } from "../../cell/query";
import { resolveCellRenderStyle } from "../../selectors/cell-render-style";
import { formatCellValueForDisplay, formatFormulaScalarForDisplay, resolveCellFormatCode } from "../../selectors/cell-display-text";
import { normalizeMergeRange, findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";
import { indexToColumnLetter } from "@aurochs-office/xlsx/domain/cell/address";

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

const cellBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  boxSizing: "border-box",
  paddingBlock: 0,
  paddingInline: spacingTokens.xs,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "clip",
  fontSize: fontTokens.size.md,
  color: colorTokens.text.primary,
};

const headerCellStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.secondary,
  backgroundColor: colorTokens.background.secondary,
  borderRight: `1px solid ${colorTokens.border.primary}`,
  borderBottom: `1px solid ${colorTokens.border.primary}`,
};

const gridlineStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: colorTokens.border.subtle,
};

function createAddress(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

type FormatCellTextParams = {
  readonly cell: ReturnType<typeof getCell>;
  readonly sheetIndex: number;
  readonly address: CellAddress;
  readonly formatCode: string;
  readonly dateSystem: XlsxWorksheet["dateSystem"];
  readonly formulaEvaluator: FormulaEvaluator;
};

function formatCellText(params: FormatCellTextParams): string {
  const { cell, sheetIndex, address, formatCode, dateSystem, formulaEvaluator } = params;
  if (cell?.formula) {
    const evaluated = formulaEvaluator.evaluateCell(sheetIndex, address);
    return formatFormulaScalarForDisplay(evaluated, formatCode, { dateSystem });
  }
  return formatCellValueForDisplay(cell?.value ?? { type: "empty" }, formatCode, { dateSystem });
}

type GridLayersProps = {
  readonly workbook: XlsxWorkbook;
  readonly sheet: XlsxWorksheet;
  readonly sheetIndex: number;
  readonly layout: SheetLayout;
  readonly metrics: ReadonlySheetGridProps["metrics"];
  readonly formulaEvaluator: FormulaEvaluator;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly zoom: number;
  readonly showGridlines: boolean;
  readonly showHeaders: boolean;
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
  showGridlines,
  showHeaders,
}: GridLayersProps) {
  const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = useVirtualScrollContext();

  const scrollTopUnscaled = scrollTop / zoom;
  const scrollLeftUnscaled = scrollLeft / zoom;
  const viewportWidthUnscaled = viewportWidth / zoom;
  const viewportHeightUnscaled = viewportHeight / zoom;

  const gridViewportWidth = Math.max(0, viewportWidthUnscaled - (showHeaders ? metrics.rowHeaderWidthPx : 0));
  const gridViewportHeight = Math.max(0, viewportHeightUnscaled - (showHeaders ? metrics.colHeaderHeightPx : 0));

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

  const cellNodes = useMemo(() => {
    const nodes: React.ReactNode[] = [];

    for (let row0 = rowRange.start; row0 <= rowRange.end; row0++) {
      const row1 = row0 + 1;
      const height = layout.rows.getSizePx(row0);
      if (height <= 0) continue;

      for (let col0 = colRange.start; col0 <= colRange.end; col0++) {
        const col1 = col0 + 1;
        const address = createAddress(col1, row1);
        const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;

        if (merge) {
          const isOrigin = (address.col as number) === merge.minCol && (address.row as number) === merge.minRow;
          if (!isOrigin) continue;

          const originAddress = merge.origin;
          const cell = getCell(sheet, originAddress);
          const formatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address: originAddress, cell });
          const text = formatCellText({
            cell,
            sheetIndex,
            address: originAddress,
            formatCode,
            dateSystem: sheet.dateSystem,
            formulaEvaluator,
          });
          const cellRenderStyle = resolveCellRenderStyle({ styles: workbook.styles, sheet, address: originAddress, cell });

          const leftPx = layout.cols.getBoundaryOffsetPx(merge.minCol - 1);
          const rightPx = layout.cols.getBoundaryOffsetPx(merge.maxCol);
          const topPx = layout.rows.getBoundaryOffsetPx(merge.minRow - 1);
          const bottomPx = layout.rows.getBoundaryOffsetPx(merge.maxRow);
          const width = Math.max(0, rightPx - leftPx);
          const mergedHeight = Math.max(0, bottomPx - topPx);
          if (width <= 0 || mergedHeight <= 0) continue;

          nodes.push(
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
            >
              {text}
            </div>
          );
          continue;
        }

        const cell = getCell(sheet, address);
        const formatCode = resolveCellFormatCode({ styles: workbook.styles, sheet, address, cell });
        const text = formatCellText({
          cell,
          sheetIndex,
          address,
          formatCode,
          dateSystem: sheet.dateSystem,
          formulaEvaluator,
        });
        const cellRenderStyle = resolveCellRenderStyle({ styles: workbook.styles, sheet, address, cell });
        const width = layout.cols.getSizePx(col0);
        if (width <= 0) continue;
        if (text === "" && Object.keys(cellRenderStyle).length === 0) continue;

        nodes.push(
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
          >
            {text}
          </div>
        );
      }
    }
    return nodes;
  }, [colRange, rowRange, layout, sheet, workbook.styles, sheetIndex, formulaEvaluator, normalizedMerges]);

  const gridlineNodes = useMemo(() => {
    if (!showGridlines) return null;
    const nodes: React.ReactNode[] = [];

    // Horizontal gridlines
    for (let row0 = rowRange.start; row0 <= rowRange.end + 1; row0++) {
      const y = layout.rows.getBoundaryOffsetPx(row0);
      nodes.push(
        <div
          key={`h-${row0}`}
          style={{
            ...gridlineStyle,
            left: 0,
            top: y,
            width: layout.totalColsWidthPx,
            height: 1,
          }}
        />
      );
    }

    // Vertical gridlines
    for (let col0 = colRange.start; col0 <= colRange.end + 1; col0++) {
      const x = layout.cols.getBoundaryOffsetPx(col0);
      nodes.push(
        <div
          key={`v-${col0}`}
          style={{
            ...gridlineStyle,
            left: x,
            top: 0,
            width: 1,
            height: layout.totalRowsHeightPx,
          }}
        />
      );
    }

    return nodes;
  }, [showGridlines, colRange, rowRange, layout]);

  const headerNodes = useMemo(() => {
    if (!showHeaders) return null;

    const colHeaders: React.ReactNode[] = [];
    const rowHeaders: React.ReactNode[] = [];

    // Column headers (A, B, C...)
    for (let col0 = colRange.start; col0 <= colRange.end; col0++) {
      const width = layout.cols.getSizePx(col0);
      if (width <= 0) continue;
      colHeaders.push(
        <div
          key={`col-${col0}`}
          style={{
            ...headerCellStyle,
            position: "absolute",
            left: metrics.rowHeaderWidthPx + layout.cols.getOffsetPx(col0) - scrollLeftUnscaled,
            top: 0,
            width,
            height: metrics.colHeaderHeightPx,
          }}
        >
          {indexToColumnLetter(colIdx(col0 + 1))}
        </div>
      );
    }

    // Row headers (1, 2, 3...)
    for (let row0 = rowRange.start; row0 <= rowRange.end; row0++) {
      const height = layout.rows.getSizePx(row0);
      if (height <= 0) continue;
      rowHeaders.push(
        <div
          key={`row-${row0}`}
          style={{
            ...headerCellStyle,
            position: "absolute",
            left: 0,
            top: metrics.colHeaderHeightPx + layout.rows.getOffsetPx(row0) - scrollTopUnscaled,
            width: metrics.rowHeaderWidthPx,
            height,
          }}
        >
          {row0 + 1}
        </div>
      );
    }

    // Top-left corner
    const cornerCell = (
      <div
        key="corner"
        style={{
          ...headerCellStyle,
          position: "absolute",
          left: 0,
          top: 0,
          width: metrics.rowHeaderWidthPx,
          height: metrics.colHeaderHeightPx,
          zIndex: 2,
        }}
      />
    );

    return (
      <>
        {cornerCell}
        {colHeaders}
        {rowHeaders}
      </>
    );
  }, [showHeaders, colRange, rowRange, layout, metrics, scrollLeftUnscaled, scrollTopUnscaled]);

  const headerOffsetX = showHeaders ? metrics.rowHeaderWidthPx : 0;
  const headerOffsetY = showHeaders ? metrics.colHeaderHeightPx : 0;

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
        {headerNodes}
        <div
          style={{
            position: "absolute",
            left: headerOffsetX,
            top: headerOffsetY,
            width: gridViewportWidth,
            height: gridViewportHeight,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              transform: `translate(${-scrollLeftUnscaled}px, ${-scrollTopUnscaled}px)`,
            }}
          >
            {gridlineNodes}
            {cellNodes}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only spreadsheet grid component.
 *
 * @example
 * ```tsx
 * <ReadonlySheetGrid
 *   workbook={workbook}
 *   sheet={workbook.sheets[0]}
 *   sheetIndex={0}
 *   metrics={{
 *     rowCount: 100,
 *     colCount: 26,
 *     rowHeightPx: 24,
 *     colWidthPx: 80,
 *     rowHeaderWidthPx: 40,
 *     colHeaderHeightPx: 24,
 *   }}
 * />
 * ```
 */
export function ReadonlySheetGrid({
  workbook,
  sheet,
  sheetIndex,
  metrics,
  zoom = 1,
  showGridlines = true,
  showHeaders = true,
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
    if (merges.length === 0) return [];
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
          showGridlines={showGridlines}
          showHeaders={showHeaders}
        />
      </VirtualScroll>
    </div>
  );
}
