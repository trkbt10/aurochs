/**
 * @file PPTX Exporter Module
 *
 * Exports PresentationDocument to PPTX format.
 */

// =============================================================================
// Exporter
// =============================================================================

export type { ExportOptions, ExportResult } from "./pptx-exporter";
export { exportPptx, exportPptxAsBuffer } from "./pptx-exporter";

// =============================================================================
// Zip Builder
// =============================================================================

export type { ZipBuilder, ZipGenerateOptions, ZipEntryInput } from "./zip-builder";
export {
  createZipBuilder,
  createZipBuilderFromBuffer,
  createZipBuilderFromBlob,
} from "./zip-builder";
