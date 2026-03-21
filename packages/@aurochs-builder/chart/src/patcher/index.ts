/**
 * @file Chart patcher exports
 *
 * Provides functions for patching chart XML documents with new data.
 */

// Chart data patching
export { patchChartData, patchChartStyle, patchChartTitle, patchSeriesData } from "./chart-data-patcher";

// Workbook synchronization (write)
export { syncChartToWorkbook } from "./chart-workbook-syncer";

// A1 range utilities
export type { CellAddress, CellRange, CreateRangeOptions } from "./a1-range";
export {
  columnLetterToIndex,
  createRange,
  expandRangeForItems,
  formatCellRef,
  formatRange,
  getRangeCellCount,
  getRangeCells,
  indexToColumnLetter,
  isColumnRange,
  isRowRange,
  parseCellRef,
  parseRange,
  updateRangeForItemCount,
} from "./a1-range";

// XML mutation functions: import from @aurochs/xml (SoT)
