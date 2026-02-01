/**
 * @file Library exports for @oxen-cli/xlsx-cli
 */

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

// Sheet utilities (from @oxen-office/xlsx)
export { getSheetRange, type SheetRange } from "@oxen-office/xlsx/domain/sheet-utils";

// Serializers
export {
  serializeCell,
  formatCellValue,
  type CellJson,
} from "./serializers/cell-serializer";
export {
  serializeSheetSummary,
  serializeSheetData,
  type RowJson,
  type SheetSummaryJson,
  type SheetDataJson,
} from "./serializers/sheet-serializer";

// Pretty output formatters
export {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatVerifyPretty,
} from "./output/pretty-output";
