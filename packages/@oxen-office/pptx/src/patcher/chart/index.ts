export type { ChartChange, ChartPatchTarget, ChartStyle } from "./chart-patcher";
export { patchChart, patchChartElement, patchChartTransform } from "./chart-patcher";

export type { ChartData, ChartSeries } from "./chart-data-patcher";
export { patchChartData, patchChartStyle, patchChartTitle, patchSeriesData } from "./chart-data-patcher";

export type { ChartExternalDataReference } from "./chart-external-data-resolver";
export {
  composeFormula,
  findExternalDataElement,
  hasExternalData,
  parseFormulaSheetName,
  quoteSheetName,
  resolveChartExternalData,
} from "./chart-external-data-resolver";

export type { ChartDataUpdate } from "./chart-workbook-syncer";
export { extractChartDataFromWorkbook, resolveEmbeddedXlsxPath, syncChartToWorkbook } from "./chart-workbook-syncer";

export type { CellAddress, CellRange } from "./a1-range";
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
