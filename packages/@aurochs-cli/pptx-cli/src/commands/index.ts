/**
 * @file Command exports
 */

export { runInfo, type InfoData } from "./info";
export { runList, type ListData, type SlideListItem } from "./list";
export { runShow, type ShowData } from "./show";
export { runExtract, type ExtractData, type ExtractOptions, type SlideTextItem } from "./extract";
export { runTheme, type ThemeData, type FontSchemeJson, type ColorSchemeJson, type FormatSchemeJson } from "./theme";
export { runBuild } from "./build";
export {
  runVerify,
  type VerifyData,
  type VerifyOptions,
  type TestCaseSpec,
  type TestCaseResult,
  type SlideExpectation,
  type ExpectedShape,
  type ExpectedTable,
  type Assertion,
} from "./verify";
export { runPreview, type PreviewData, type PreviewSlide, type PreviewOptions } from "./preview";
export { runInventory, type InventoryData } from "./inventory";
export { runTables, type TablesData, type PptxTableSummaryJson, type TablesOptions } from "./tables";
export { runImages, type ImagesData, type PptxImageJson, type ImagesOptions } from "./images";
export { runDiff, type DiffData } from "./diff";
export { parseSlideRange, getSlideNumbers, hasShapeOfType, collectShapes } from "./utils";
