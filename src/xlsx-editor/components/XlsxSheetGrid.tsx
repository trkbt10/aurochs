/**
 * @file XlsxSheetGrid
 *
 * Spreadsheet grid renderer (virtual scroll + selection + editing).
 */

import { useMemo, type CSSProperties } from "react";
import { VirtualScroll } from "../../office-editor-components";
import type { CellAddress } from "../../xlsx/domain/cell/address";
import { colIdx, rowIdx } from "../../xlsx/domain/types";
import { createFormulaEvaluator } from "../../xlsx/formula/evaluator";
import { useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { createSheetLayout } from "../selectors/sheet-layout";
import { XlsxSheetGridLayers } from "./sheet-grid/sheet-grid-layers";

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

/**
 * Spreadsheet grid view for a single worksheet.
 *
 * Provides virtualized scrolling and delegates rendering/interaction to layered grid components.
 */
export function XlsxSheetGrid({
  sheetIndex,
  metrics,
  zoom,
}: {
  readonly sheetIndex: number;
  readonly metrics: XlsxGridMetrics;
  /** Display zoom factor (1 = 100%). */
  readonly zoom?: number;
}) {
  const { dispatch, selection, state, workbook } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  const zoomFactor = zoom ?? 1;
  if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) {
    throw new Error(`XlsxSheetGrid zoom must be a positive finite number: ${String(zoom)}`);
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

  const formulaEvaluator = useMemo(() => createFormulaEvaluator(workbook), [workbook]);

  const contentWidth = (rowHeaderWidthPx + layout.totalColsWidthPx) * zoomFactor;
  const contentHeight = (colHeaderHeightPx + layout.totalRowsHeightPx) * zoomFactor;

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
        <XlsxSheetGridLayers sheetIndex={sheetIndex} sheet={sheet} metrics={metrics} layout={layout} formulaEvaluator={formulaEvaluator} zoom={zoomFactor} />
      </VirtualScroll>
    </div>
  );
}
