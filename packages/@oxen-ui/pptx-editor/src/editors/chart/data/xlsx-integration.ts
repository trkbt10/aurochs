/**
 * @file XLSX Integration for Chart Data Editing
 *
 * Provides a high-level API for editing chart data through the xlsx-editor reducer.
 * This bridges pptx-editor charts with embedded xlsx workbook data.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@oxen-office/xlsx/domain/workbook";
import type { CellAddress } from "@oxen-office/xlsx/domain/cell/address";
import type { CellValue } from "@oxen-office/xlsx/domain/cell/types";
import { colIdx } from "@oxen-office/xlsx/domain/types";
import { createInitialState, xlsxEditorReducer, type XlsxEditorAction } from "@oxen-ui/xlsx-editor";
import { indexToColumnLetter } from "@oxen-office/xlsx/domain/cell/address";
import {
  type ChartDataLayout,
  detectChartDataLayout,
  createAddress,
  EMPTY_CHART_DATA_LAYOUT,
} from "./layout-detection";

// Re-export layout detection types and functions
export type { ChartDataLayout } from "./layout-detection";
export { detectChartDataLayout, countCategories, countSeries } from "./layout-detection";

// =============================================================================
// Types
// =============================================================================

/**
 * Chart Data Editor - pptx-editorからチャートデータを編集するためのAPI
 */
export type ChartDataEditor = {
  /** シリーズの値を更新 */
  readonly updateSeriesValues: (seriesIndex: number, values: readonly number[]) => void;
  /** カテゴリを更新 */
  readonly updateCategories: (categories: readonly string[]) => void;
  /** シリーズを追加 */
  readonly addSeries: (name: string, values: readonly number[]) => void;
  /** シリーズを削除 */
  readonly removeSeries: (seriesIndex: number) => void;
  /** 変更後のワークブックを取得 */
  readonly getWorkbook: () => XlsxWorkbook;
  /** Undo */
  readonly undo: () => void;
  /** Redo */
  readonly redo: () => void;
  /** Undo可能か */
  readonly canUndo: () => boolean;
  /** Redo可能か */
  readonly canRedo: () => boolean;
  /** カテゴリ数を取得 */
  readonly getCategoryCount: () => number;
  /** シリーズ数を取得 */
  readonly getSeriesCount: () => number;
};

// =============================================================================
// ChartDataEditor Implementation
// =============================================================================

/**
 * ChartDataEditorを作成
 *
 * @param workbook - Initial workbook state
 * @param sheetIndex - Sheet index to edit (default: 0)
 */
export function createChartDataEditor(
  workbook: XlsxWorkbook,
  sheetIndex: number = 0,
): ChartDataEditor {
  // eslint-disable-next-line no-restricted-syntax -- mutable state pattern for reducer dispatch
  let state = createInitialState(workbook);
  state = { ...state, activeSheetIndex: sheetIndex };

  const dispatch = (action: XlsxEditorAction): void => {
    state = xlsxEditorReducer(state, action);
  };

  const getActiveSheet = (): XlsxWorksheet | undefined => {
    const idx = state.activeSheetIndex;
    if (idx === undefined) {return undefined;}
    return state.workbookHistory.present.sheets[idx];
  };

  const getLayout = (): ChartDataLayout => {
    const sheet = getActiveSheet();
    if (!sheet) {
      return EMPTY_CHART_DATA_LAYOUT;
    }
    return detectChartDataLayout(sheet);
  };

  return {
    updateSeriesValues(seriesIndex: number, values: readonly number[]): void {
      const layout = getLayout();
      const col = layout.seriesStartCol + seriesIndex;

      const updates: Array<{
        readonly address: CellAddress;
        readonly value: CellValue;
      }> = values.map((value, i) => ({
        address: createAddress(col, layout.dataStartRow + i),
        value: { type: "number" as const, value },
      }));

      dispatch({ type: "UPDATE_CELLS", updates });
    },

    updateCategories(categories: readonly string[]): void {
      const layout = getLayout();
      const col = layout.categoryCol;

      const updates: Array<{
        readonly address: CellAddress;
        readonly value: CellValue;
      }> = categories.map((value, i) => ({
        address: createAddress(col, layout.dataStartRow + i),
        value: { type: "string" as const, value },
      }));

      dispatch({ type: "UPDATE_CELLS", updates });
    },

    addSeries(name: string, values: readonly number[]): void {
      const layout = getLayout();
      const newCol = layout.seriesStartCol + layout.seriesCount;

      // Add header
      dispatch({
        type: "UPDATE_CELL",
        address: createAddress(newCol, layout.headerRow),
        value: { type: "string", value: name },
      });

      // Add values
      const updates: Array<{
        readonly address: CellAddress;
        readonly value: CellValue;
      }> = values.map((value, i) => ({
        address: createAddress(newCol, layout.dataStartRow + i),
        value: { type: "number" as const, value },
      }));

      dispatch({ type: "UPDATE_CELLS", updates });
    },

    removeSeries(seriesIndex: number): void {
      const layout = getLayout();
      const col = layout.seriesStartCol + seriesIndex;

      // Delete the column range (header + data)
      dispatch({
        type: "DELETE_COLUMNS",
        startCol: colIdx(col),
        count: 1,
      });
    },

    getWorkbook(): XlsxWorkbook {
      return state.workbookHistory.present;
    },

    undo(): void {
      dispatch({ type: "UNDO" });
    },

    redo(): void {
      dispatch({ type: "REDO" });
    },

    canUndo(): boolean {
      return state.workbookHistory.past.length > 0;
    },

    canRedo(): boolean {
      return state.workbookHistory.future.length > 0;
    },

    getCategoryCount(): number {
      return getLayout().categoryCount;
    },

    getSeriesCount(): number {
      return getLayout().seriesCount;
    },
  };
}

// =============================================================================
// Workbook Patcher Integration (T5-2)
// =============================================================================

/**
 * Convert ChartDataEditor changes to sheet update cells format
 * for compatibility with existing patchWorkbook API
 */
export function editorToSheetUpdates(
  editor: ChartDataEditor,
  sheetName: string = "Sheet1",
): {
  readonly sheetName: string;
  readonly cells: readonly {
    readonly col: string;
    readonly row: number;
    readonly value: string | number;
  }[];
} {
  const workbook = editor.getWorkbook();
  const sheet = workbook.sheets.find((s) => s.name === sheetName);
  if (!sheet) {
    return { sheetName, cells: [] };
  }

  const cells: Array<{
    readonly col: string;
    readonly row: number;
    readonly value: string | number;
  }> = [];

  for (const row of sheet.rows) {
    const rowNum = row.rowNumber as number;
    for (const cell of row.cells) {
      const colNum = cell.address.col as number;
      const colLetter = indexToColumnLetter(colIdx(colNum));

      const computeValue = (): { skip: boolean; value: string | number } => {
        switch (cell.value.type) {
          case "number":
            return { skip: false, value: cell.value.value };
          case "string":
            return { skip: false, value: cell.value.value };
          case "boolean":
            return { skip: false, value: cell.value.value ? 1 : 0 };
          default:
            return { skip: true, value: 0 };
        }
      };
      const { skip, value } = computeValue();
      if (skip) {
        continue;
      }

      cells.push({ col: colLetter, row: rowNum, value });
    }
  }

  return { sheetName, cells };
}
