import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { Cell } from "../../../xlsx/domain/cell/types";
import type { XlsxStyleSheet } from "../../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { createFormulaEvaluator } from "../../../xlsx/formula/evaluator";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import { getCell } from "../../cell/query";
import { resolveCellRenderStyle } from "../../selectors/cell-render-style";
import { formatCellValueForDisplay, formatFormulaScalarForDisplay, resolveCellFormatCode } from "../../selectors/cell-display-text";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";
import { spacingTokens, colorTokens } from "../../../office-editor-components";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { startRangeSelectPointerDrag } from "./range-select-drag";

export type XlsxSheetGridCellsLayerProps = {
  readonly sheetIndex: number;
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly metrics: {
    readonly rowCount: number;
    readonly colCount: number;
  };
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
  readonly focusGridRoot: (target: EventTarget) => void;
  readonly formulaEvaluator: ReturnType<typeof createFormulaEvaluator>;
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

export function XlsxSheetGridCellsLayer({
  sheetIndex,
  sheet,
  styles,
  layout,
  metrics,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  normalizedMerges,
  dispatch,
  focusGridRoot,
  formulaEvaluator,
}: XlsxSheetGridCellsLayerProps) {
  const rangeSelectCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      const cleanup = rangeSelectCleanupRef.current;
      if (cleanup) {
        cleanup();
      }
      rangeSelectCleanupRef.current = null;
    };
  }, []);

  const startRangeSelectFromPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, address: CellAddress): void => {
      const viewport = event.currentTarget.closest('[data-xlsx-grid-viewport="true"]');
      if (!(viewport instanceof HTMLElement)) {
        throw new Error("Expected xlsx grid viewport container");
      }

      const previous = rangeSelectCleanupRef.current;
      if (previous) {
        previous();
      }

      rangeSelectCleanupRef.current = startRangeSelectPointerDrag({
        pointerId: event.pointerId,
        captureTarget: event.currentTarget,
        container: viewport,
        startAddress: address,
        scrollLeft,
        scrollTop,
        layout,
        metrics,
        normalizedMerges,
        dispatch,
      });
    },
    [dispatch, layout, metrics, normalizedMerges, scrollLeft, scrollTop],
  );

  const cellNodes = useMemo(() => {
    const nodes: ReactNode[] = [];
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
          const text = getCellDisplayText(cell, sheetIndex, originAddress, formulaEvaluator, sheet, styles);
          const cellRenderStyle = resolveCellRenderStyle({ styles, sheet, address: originAddress, cell });

          const leftPx = layout.cols.getBoundaryOffsetPx(merge.minCol - 1);
          const rightPx = layout.cols.getBoundaryOffsetPx(merge.maxCol);
          const topPx = layout.rows.getBoundaryOffsetPx(merge.minRow - 1);
          const bottomPx = layout.rows.getBoundaryOffsetPx(merge.maxRow);
          const width = Math.max(0, rightPx - leftPx);
          const mergedHeight = Math.max(0, bottomPx - topPx);
          if (width <= 0 || mergedHeight <= 0) {
            continue;
          }

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
            onPointerDown={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.preventDefault();
              focusGridRoot(e.target);
              if (e.metaKey || e.ctrlKey) {
                dispatch({ type: "ADD_RANGE_TO_SELECTION", range: merge.range });
                return;
              }
              if (e.shiftKey) {
                dispatch({ type: "SELECT_CELL", address: originAddress, extend: true });
                return;
              }
              startRangeSelectFromPointerDown(e, originAddress);
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                focusGridRoot(e.target);
                dispatch({ type: "SELECT_RANGE", range: merge.range });
                dispatch({ type: "ENTER_CELL_EDIT", address: originAddress });
              }}
            >
              {text}
            </div>,
          );
          continue;
        }

        const cell = getCell(sheet, address);
        const text = getCellDisplayText(cell, sheetIndex, address, formulaEvaluator, sheet, styles);
        const cellRenderStyle = resolveCellRenderStyle({ styles, sheet, address, cell });
        const width = layout.cols.getSizePx(col0);
        if (width <= 0) {
          continue;
        }

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
            onPointerDown={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.preventDefault();
              focusGridRoot(e.target);
              if (e.metaKey || e.ctrlKey) {
                dispatch({ type: "ADD_RANGE_TO_SELECTION", range: { start: address, end: address } });
                return;
              }
              if (e.shiftKey) {
                dispatch({ type: "SELECT_CELL", address, extend: true });
                return;
              }
              startRangeSelectFromPointerDown(e, address);
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              focusGridRoot(e.target);
              dispatch({ type: "SELECT_CELL", address });
              dispatch({ type: "ENTER_CELL_EDIT", address });
            }}
          >
            {text}
          </div>,
        );
      }
    }
    return nodes;
  }, [
    colRange.end,
    colRange.start,
    dispatch,
    focusGridRoot,
    formulaEvaluator,
    layout.cols,
    layout.rows,
    metrics,
    normalizedMerges,
    rowRange.end,
    rowRange.start,
    sheet,
    sheetIndex,
    startRangeSelectFromPointerDown,
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
