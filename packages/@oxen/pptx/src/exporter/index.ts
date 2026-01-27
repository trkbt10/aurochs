/**
 * @file PPTX Exporter Module
 *
 * Exports PresentationDocument to PPTX format.
 *
 * @see @oxen/zip - Shared ZIP abstraction
 * @see src/pptx/app/pptx-loader.ts - Corresponding load functionality
 */

// =============================================================================
// Exporter
// =============================================================================

export type { ExportOptions, ExportResult } from "./pptx-exporter";
export { exportPptx, exportPptxAsBuffer } from "./pptx-exporter";
