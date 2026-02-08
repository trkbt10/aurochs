/**
 * @file Library exports for @aurochs-cli/pptx-cli
 */

// Program
export { createProgram } from "./program";

// Commands
export { runInfo, type InfoData } from "./commands/info";
export { runList, type ListData, type SlideListItem } from "./commands/list";
export { runShow, type ShowData } from "./commands/show";
export { runExtract, type ExtractData, type ExtractOptions, type SlideTextItem } from "./commands/extract";
export {
  runTheme,
  type ThemeData,
  type FontSchemeJson,
  type ColorSchemeJson,
  type FormatSchemeJson,
} from "./commands/theme";
export { runBuild } from "./commands/build";
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
} from "./commands/verify";
export { runPreview, type PreviewData, type PreviewSlide, type PreviewOptions } from "./commands/preview";

// Text extraction (from @aurochs-office/pptx)
export {
  extractTextFromBody,
  extractTextFromParagraph,
  extractTextFromRun,
  extractTextFromShape,
} from "@aurochs-office/pptx/domain/text-utils";

// Serializers
export {
  serializeShape,
  type ShapeJson,
  type BoundsJson,
  type ParagraphJson,
  type TextRunJson,
  type PlaceholderJson,
  type GeometryJson,
  type FillJson,
  type LineJson,
  type TableJson,
  type ChartJson,
  type ChartSeriesJson,
  type DiagramJson,
  type DiagramShapeJson,
  type GraphicContentJson,
  type SerializationContext,
} from "./serializers/shape-serializer";

// Pretty output formatters
export {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatThemePretty,
  formatBuildPretty,
  formatVerifyPretty,
  formatPreviewPretty,
} from "./output/pretty-output";
