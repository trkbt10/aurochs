/**
 * @file Library exports for @aurochs-cli/xlsx-cli
 */

// Program
export { createProgram } from "./program";

// Commands
export { runInfo, type InfoData } from "./commands/info";
export { runList, type ListData, type SheetListItem } from "./commands/list";
export { runShow, type ShowData, type ShowOptions, type RowData, type CellData } from "./commands/show";
export { runExtract, type ExtractData, type ExtractOptions } from "./commands/extract";
export { runBuild, type BuildSpec, type BuildData } from "./commands/build";
export {
  runVerify,
  type VerifyData,
  type VerifyOptions,
  type TestCaseSpec,
  type TestCaseResult,
  type ExpectedWorkbook,
  type Assertion,
} from "./commands/verify";

// Serializers
export { serializeCell, formatCellValue, type CellJson } from "./serializers/cell-serializer";
export {
  serializeSheetSummary,
  serializeSheetData,
  type RowJson,
  type SheetSummaryJson,
  type SheetDataJson,
} from "./serializers/sheet-serializer";

// Preview
export { runPreview, type PreviewData, type PreviewSheet, type PreviewOptions } from "./commands/preview";

// Pretty output formatters
export {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatVerifyPretty,
  formatPreviewPretty,
} from "./output/pretty-output";
