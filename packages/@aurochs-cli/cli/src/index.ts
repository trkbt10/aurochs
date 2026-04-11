/**
 * @file Library exports for @aurochs-cli/cli
 */

export { createProgram as createPptxProgram } from "@aurochs-cli/pptx-cli";
export { createProgram as createDocxProgram } from "@aurochs-cli/docx-cli";
export { createProgram as createXlsxProgram } from "@aurochs-cli/xlsx-cli";
export { createProgram as createPdfProgram } from "@aurochs-cli/pdf-cli";

// Conversion API
export {
  convert,
  convertToMarkdown,
  getSupportedExtensions,
  getSupportedOutputExtensions,
  getSupportedOutputFormats,
  type InputFormat,
  type OutputFormat,
  type ConvertOptions,
  type ConvertResult,
  type ConvertOutput,
  type ConvertPage,
} from "./convert";
