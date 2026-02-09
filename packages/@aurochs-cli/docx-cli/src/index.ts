/**
 * @file Library exports for @aurochs-cli/docx-cli
 */

// Program
export { createProgram } from "./program";

// Commands
export { runInfo, type InfoData } from "./commands/info";
export { runList, type ListData, type SectionListItem } from "./commands/list";
export {
  runShow,
  type ShowData,
  type BlockContentJson,
  type TableJson,
  type TableRowJson,
  type TableCellJson,
} from "./commands/show";
export { runExtract, type ExtractData, type ExtractOptions, type SectionTextItem } from "./commands/extract";
export { runBuild, type BuildSpec, type BuildData } from "./commands/build";
export { runPatch, type PatchData } from "./commands/patch";
export {
  runVerify,
  type VerifyData,
  type VerifyOptions,
  type TestCaseSpec,
  type TestCaseResult,
  type ExpectedDocument,
  type Assertion,
} from "./commands/verify";

// Text extraction (from @aurochs-office/docx)
export {
  extractTextFromRunContent,
  extractTextFromRun,
  extractTextFromParagraph,
  extractTextFromParagraphContent,
  extractTextFromBlockContent,
  extractTextFromBody,
  extractTextFromDocument,
} from "@aurochs-office/docx/domain/text-utils";

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

// Preview
export { runPreview, type PreviewData, type PreviewSection, type PreviewOptions } from "./commands/preview";

// Pretty output formatters
export {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatPatchPretty,
  formatVerifyPretty,
  formatPreviewPretty,
} from "./output/pretty-output";
