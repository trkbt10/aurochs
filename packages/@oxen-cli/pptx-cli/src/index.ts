/**
 * @file Library exports for @oxen-cli/pptx-cli
 */

// Commands
export { runInfo, type InfoData } from "./commands/info";
export { runList, type ListData, type SlideListItem } from "./commands/list";
export { runShow, type ShowData } from "./commands/show";
export { runExtract, type ExtractData, type ExtractOptions, type SlideTextItem } from "./commands/extract";
export { runTheme, type ThemeData, type FontSchemeJson, type ColorSchemeJson, type FormatSchemeJson } from "./commands/theme";
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

// Text extraction (from @oxen-office/pptx)
export {
  extractTextFromBody,
  extractTextFromParagraph,
  extractTextFromRun,
  extractTextFromShape,
} from "@oxen-office/pptx/domain/text-utils";

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
  type DiagramJson,
  type GraphicContentJson,
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
} from "./output/pretty-output";
