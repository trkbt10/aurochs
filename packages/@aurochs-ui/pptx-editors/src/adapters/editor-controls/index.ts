/**
 * @file PPTX editor-controls adapters
 *
 * Provides PPTX-specific adapters for the shared editor controls.
 */

export { pptxTextAdapter, pptxMixedRunToContext, pptxMixedRunToGeneric, PPTX_UNDERLINE_OPTIONS, PPTX_STRIKE_OPTIONS } from "./pptx-text-adapter";
export { pptxParagraphAdapter, pptxMixedParagraphToContext, pptxMixedParagraphToGeneric } from "./pptx-paragraph-adapter";
export { pptxFillAdapter } from "./pptx-fill-adapter";
export { pptxOutlineAdapter } from "./pptx-outline-adapter";
export { pptxTableAdapter } from "./pptx-table-adapter";
export { pptxCellAdapter } from "./pptx-cell-adapter";
