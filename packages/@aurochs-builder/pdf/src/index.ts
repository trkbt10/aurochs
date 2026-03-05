/**
 * @file PDF builder package
 *
 * Builder entrypoint that uses @aurochs/pdf parser -> context -> builder pipeline.
 */

export type {
  PdfBinarySource,
  ParsePdfSourceForBuilderArgs,
  CreatePdfBuilderContextArgs,
  BuildPdfFromBuilderContextArgs,
  BuildPdfWithContextArgs,
  BuildPdfArgs,
  BuildPdfPipelineResult,
} from "./types";

export {
  parsePdfSourceForBuilder,
  createPdfBuilderContext,
  buildPdfFromBuilderContext,
  buildAndSavePdfContextAsJson,
  buildPdfWithContext,
  runPdfBuildPipeline,
  buildPdf,
} from "./builder";

export {
  exportPdf,
  exportPdfToFile,
  type ExportPdfOptions,
} from "./export";
