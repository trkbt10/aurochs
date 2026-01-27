/**
 * @file XLSX Module
 *
 * Utilities for parsing and patching embedded Excel workbooks (xlsx).
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

export {
  parseWorkbook,
  getCellValue,
  getColumnValues,
  getRowValues,
  type Workbook,
  type WorkbookSheet,
  type WorkbookRow,
  type WorkbookCell,
} from "./workbook-parser";

export {
  patchWorkbook,
  updateChartDataInWorkbook,
  type CellUpdate,
  type SheetUpdate,
  type WorkbookPatchResult,
} from "./workbook-patcher";
