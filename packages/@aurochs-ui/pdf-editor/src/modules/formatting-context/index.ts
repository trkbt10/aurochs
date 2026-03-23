/**
 * @file Formatting context module
 *
 * Bidirectional adapters between PDF domain types and generic editor formatting types:
 * - pdf-adapters: Color conversion, text formatting (PdfElement ↔ TextFormatting)
 * - pdf-surface-adapters: Fill/stroke (GraphicsState ↔ FillFormatting/OutlineFormatting)
 * - pdf-text-adapter: PdfText ↔ TextFormatting (FormattingAdapter)
 * - pdf-page-size-adapter: Page size presets and matching
 * - pdf-table-adapter: Table operations (TableOperationAdapter)
 */

export {
  floatToHex,
  hexToRgbComponents,
  pdfColorToHex,
  pdfFillToHex,
  pdfStrokeToHex,
  PDF_TEXT_FEATURES,
  pdfTextToFormatting,
  applyTextFormattingToPdfElement,
  pdfElementToPositionSize,
} from "./pdf-adapters";

export {
  pdfFillToFormatting,
  applyFillToGraphicsState,
  pdfStrokeToFormatting,
  applyStrokeToGraphicsState,
  pdfFillAdapter,
  pdfOutlineAdapter,
} from "./pdf-surface-adapters";

export { pdfTextAdapter } from "./pdf-text-adapter";
export { PDF_PAGE_PRESETS, findMatchingPreset } from "./pdf-page-size-adapter";
export { pdfTableOperationAdapter } from "./pdf-table-adapter";
