/**
 * @file Export functionality
 *
 * This module provides PPTX export capabilities.
 */

// Main export functions
export {
  exportPptx,
  exportPptxAsBuffer,
  type ExportOptions,
  type ExportResult,
  type ChartUpdate,
  type WorkbookUpdate,
  type LayoutUpdate,
  type MasterUpdate,
  type ThemeUpdate,
  type ExtendedExportOptions,
} from "./pptx-exporter";

// Chart embedding
export {
  updateEmbeddedXlsx,
  syncAllChartEmbeddings,
  listEmbeddedXlsx,
  getChartRelsPath,
  type GetFileContent,
  type SetFileContent,
  type UpdateEmbeddedXlsxOptions,
} from "./chart-embedding";
