/**
 * @file Library exports for @aurochs-cli/pdf-cli
 */

export { createProgram } from "./program";

export { runInfo, type InfoData } from "./commands/info";
export { runList, type ListData, type PageListItem } from "./commands/list";
export { runShow, type ShowData, type ElementData } from "./commands/show";
export { runExtract, type ExtractData, type ExtractOptions, type PageTextData } from "./commands/extract";
export { runBuild, type BuildData, type BuildSpec } from "./commands/build";
export { runPreview, type PreviewData, type PreviewOptions, type PreviewPage } from "./commands/preview";
export { parsePageSelection, parseOptionalPageSelection } from "./commands/page-selection";

export {
  formatInfoPretty,
  formatListPretty,
  formatShowPretty,
  formatExtractPretty,
  formatBuildPretty,
  formatPreviewPretty,
} from "./output/pretty-output";
