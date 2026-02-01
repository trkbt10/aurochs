/**
 * @file Library exports for @oxen-cli/docx-cli
 */

// Commands
export { runInfo, type InfoData } from "./commands/info";
export { runList, type ListData, type SectionListItem } from "./commands/list";
export { runShow, type ShowData, type BlockContentJson, type TableJson, type TableRowJson, type TableCellJson } from "./commands/show";
export { runExtract, type ExtractData, type ExtractOptions, type SectionTextItem } from "./commands/extract";
export { runBuild, type BuildSpec, type BuildData } from "./commands/build";
export {
  runVerify,
  type VerifyData,
  type VerifyOptions,
  type TestCaseSpec,
  type TestCaseResult,
  type ExpectedDocument,
  type Assertion,
} from "./commands/verify";

// Text extraction (from @oxen-office/docx)
export {
  extractTextFromRunContent,
  extractTextFromRun,
  extractTextFromParagraph,
  extractTextFromParagraphContent,
  extractTextFromBlockContent,
  extractTextFromBody,
  extractTextFromDocument,
} from "@oxen-office/docx/domain/text-utils";

// Serializers
export {
  serializeParagraph,
  type ParagraphJson,
  type RunJson,
  type HyperlinkJson,
  type ParagraphContentJson,
} from "./serializers/paragraph-serializer";
export {
  serializeSection,
  type SectionJson,
  type PageSizeJson,
  type PageMarginsJson,
  type ColumnsJson,
} from "./serializers/section-serializer";

// Pretty output formatters
export {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatVerifyPretty,
} from "./output/pretty-output";
