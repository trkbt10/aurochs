/**
 * @file Sheet grid cells layer
 *
 * Renders visible cell contents for the current viewport range.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { Cell } from "../../../xlsx/domain/cell/types";
import type { XlsxStyleSheet } from "../../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { createFormulaEvaluator } from "../../../xlsx/formula/evaluator";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import { getCell } from "../../cell/query";
import { resolveCellRenderStyle } from "../../selectors/cell-render-style";
import { formatCellValueForDisplay, formatFormulaScalarForDisplay, resolveCellFormatCode } from "../../selectors/cell-display-text";
import { resolveCellConditionalDifferentialFormat } from "../../selectors/conditional-formatting";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";
import { spacingTokens, colorTokens } from "../../../office-editor-components";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { XlsxCellCanvasText, type XlsxCellCanvasTextProps } from "./cell-text";

export type XlsxSheetGridCellsLayerProps = {
  readonly sheetIndex: number;
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly formulaEvaluator: ReturnType<typeof createFormulaEvaluator>;
};

const cellBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  boxSizing: "border-box",
  paddingBlock: 0,
  paddingInlineStart: `calc(var(--xlsx-cell-padding-inline, ${spacingTokens.xs}) + var(--xlsx-cell-indent-start, 0px))`,
  paddingInlineEnd: `calc(var(--xlsx-cell-padding-inline, ${spacingTokens.xs}) + var(--xlsx-cell-indent-end, 0px))`,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "clip",
  fontSize: 12,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

const CANVAS_TEXT_THRESHOLD_CHARS = 20_000;

function shouldRenderTextWithCanvas(text: string): boolean {
  return text.length >= CANVAS_TEXT_THRESHOLD_CHARS;
}

function renderCellText(params: {
  readonly text: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly style: XlsxCellCanvasTextProps["style"];
}): ReactNode {
  const { text, widthPx, heightPx, style } = params;
  if (shouldRenderTextWithCanvas(text)) {
    return <XlsxCellCanvasText text={text} widthPx={widthPx} heightPx={heightPx} style={style} />;
  }
  return text;
}

function createAddress(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function getCellDisplayText(
  cell: Cell | undefined,
  sheetIndex: number,
  address: CellAddress,
  formulaEvaluator: ReturnType<typeof createFormulaEvaluator>,
  formatCode: string,
  dateSystem: XlsxWorksheet["dateSystem"],
): string {
  if (!cell) {
    return "";
  }
  if (cell.formula) {
    return formatFormulaScalarForDisplay(formulaEvaluator.evaluateCell(sheetIndex, address), formatCode, { dateSystem });
  }
  return formatCellValueForDisplay(cell.value, formatCode, { dateSystem });
}

function shouldRenderCellLayerItem(text: string, style: CSSProperties): boolean {
  if (text !== "") {
    return true;
  }
  return Object.keys(style).length > 0;
}

function resolveConditionalFormatMaybe(params: {
  readonly hasConditionalFormatting: boolean;
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly sheetIndex: number;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly formulaEvaluator: ReturnType<typeof createFormulaEvaluator>;
}): ReturnType<typeof resolveCellConditionalDifferentialFormat> {
  if (!params.hasConditionalFormatting) {
    return undefined;
  }
  return resolveCellConditionalDifferentialFormat({
    sheet: params.sheet,
    styles: params.styles,
    sheetIndex: params.sheetIndex,
    address: params.address,
    cell: params.cell,
    formulaEvaluator: params.formulaEvaluator,
  });
}

/**
 * Renders the visible cell grid region as positioned divs.
 */
export function XlsxSheetGridCellsLayer({
  sheetIndex,
  sheet,
  styles,
  layout,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  normalizedMerges,
  formulaEvaluator,
}: XlsxSheetGridCellsLayerProps) {
  const cellNodes = useMemo(() => {
    const nodes: ReactNode[] = [];
    const hasConditionalFormatting = (sheet.conditionalFormattings?.length ?? 0) > 0;
    for (let row0 = rowRange.start; row0 <= rowRange.end; row0 += 1) {
      const row1 = row0 + 1;
      const height = layout.rows.getSizePx(row0);
      if (height <= 0) {
        continue;
      }

      for (let col0 = colRange.start; col0 <= colRange.end; col0 += 1) {
        const col1 = col0 + 1;
        const address = createAddress(col1, row1);
        const merge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, address) : undefined;
        if (merge) {
          const isOrigin = (address.col as number) === merge.minCol && (address.row as number) === merge.minRow;
          if (!isOrigin) {
            continue;
          }

          const originAddress = merge.origin;
          const cell = getCell(sheet, originAddress);
          const conditionalFormat = resolveConditionalFormatMaybe({
            hasConditionalFormatting,
            sheet,
            styles,
            sheetIndex,
            address: originAddress,
            cell,
            formulaEvaluator,
          });
          const formatCode = resolveCellFormatCode({ styles, sheet, address: originAddress, cell, conditionalFormat });
          const text = getCellDisplayText(cell, sheetIndex, originAddress, formulaEvaluator, formatCode, sheet.dateSystem);
          const cellRenderStyle = resolveCellRenderStyle({ styles, sheet, address: originAddress, cell, conditionalFormat });

          const leftPx = layout.cols.getBoundaryOffsetPx(merge.minCol - 1);
          const rightPx = layout.cols.getBoundaryOffsetPx(merge.maxCol);
          const topPx = layout.rows.getBoundaryOffsetPx(merge.minRow - 1);
          const bottomPx = layout.rows.getBoundaryOffsetPx(merge.maxRow);
          const width = Math.max(0, rightPx - leftPx);
          const mergedHeight = Math.max(0, bottomPx - topPx);
          if (width <= 0 || mergedHeight <= 0) {
            continue;
          }
          if (!shouldRenderCellLayerItem(text, cellRenderStyle)) {
            continue;
          }

          nodes.push(
            <div
              key={`merge-${merge.key}`}
              data-xlsx-cell-col={originAddress.col as number}
              data-xlsx-cell-row={originAddress.row as number}
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
              {renderCellText({ text, widthPx: width, heightPx: mergedHeight, style: cellRenderStyle })}
            </div>,
          );
          continue;
        }

        const cell = getCell(sheet, address);
        const conditionalFormat = resolveConditionalFormatMaybe({
          hasConditionalFormatting,
          sheet,
          styles,
          sheetIndex,
          address,
          cell,
          formulaEvaluator,
        });
        const formatCode = resolveCellFormatCode({ styles, sheet, address, cell, conditionalFormat });
        const text = getCellDisplayText(cell, sheetIndex, address, formulaEvaluator, formatCode, sheet.dateSystem);
        const cellRenderStyle = resolveCellRenderStyle({ styles, sheet, address, cell, conditionalFormat });
        const width = layout.cols.getSizePx(col0);
        if (width <= 0) {
          continue;
        }
        if (!shouldRenderCellLayerItem(text, cellRenderStyle)) {
          continue;
        }

        nodes.push(
          <div
            key={`cell-${col1}-${row1}`}
            data-xlsx-cell-col={col1}
            data-xlsx-cell-row={row1}
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
            {renderCellText({ text, widthPx: width, heightPx: height, style: cellRenderStyle })}
          </div>,
        );
      }
    }
    return nodes;
  }, [
    colRange.end,
    colRange.start,
    formulaEvaluator,
    layout.cols,
    layout.rows,
    normalizedMerges,
    rowRange.end,
    rowRange.start,
    sheet,
    sheetIndex,
    styles,
  ]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
        }}
      >
        {cellNodes}
      </div>
    </>
  );
}
