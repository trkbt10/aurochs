/**
 * @file Chart data utilities for PPTX editor
 *
 * Provides layout detection and XLSX integration for editing chart data.
 */

export {
  type ChartDataLayout,
  detectChartDataLayout,
  countCategories,
  countSeries,
  createAddress,
  createCellRange,
  EMPTY_CHART_DATA_LAYOUT,
} from "./layout-detection";

export {
  type ChartDataEditor,
  createChartDataEditor,
  editorToSheetUpdates,
} from "./xlsx-integration";
