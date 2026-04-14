/**
 * @file Library exports for @aurochs-cli/tsv-cli
 */

export { createProgram } from "./program";

export { runInfo, type InfoData } from "./commands/info";
export { runShow, type ShowData, type ShowOptions } from "./commands/show";
export { runConvert, type ConvertData, type ConvertOptions } from "./commands/convert";

export {
  formatInfoPretty,
  formatShowPretty,
  formatConvertPretty,
} from "./output/pretty-output";
