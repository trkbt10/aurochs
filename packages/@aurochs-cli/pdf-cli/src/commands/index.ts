/**
 * @file Commands index for pdf-cli
 */

export { runInfo, type InfoData } from "./info";
export { runList, type ListData, type PageListItem } from "./list";
export { runShow, type ShowData, type ElementData } from "./show";
export { runExtract, type ExtractData, type ExtractOptions, type PageTextData } from "./extract";
export { runBuild, type BuildSpec, type BuildData } from "./build";
export { runWrite, formatWritePretty, type WriteSpec, type WriteData } from "./write";
export { runPreview, type PreviewData, type PreviewOptions, type PreviewPage } from "./preview";
export { parsePageSelection, parseOptionalPageSelection } from "./page-selection";
