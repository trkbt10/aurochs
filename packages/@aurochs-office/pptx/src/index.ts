/**
 * @file PPTX Parser - Public API
 */

// Presentation reader API (from app layer)
export { openPresentation } from "./app";
export type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions } from "./app/types";

// Presentation document (for editor integration)
export type { PresentationDocument } from "./app/presentation-document";
export type { LoadedPresentation } from "./app/pptx-loader";
export { loadPptxFromBuffer, loadPptxFromFile } from "./app/pptx-loader";
export { convertToPresentationDocument } from "./app/presentation-converter";

// Core types needed by consumers
export type { IndexTables } from "./parser/slide/shape-tree-indexer";
export type { SlideSize } from "./domain";

// Text extraction utilities
export {
  extractTextFromBody,
  extractTextFromParagraph,
  extractTextFromRun,
  extractTextFromShape,
} from "./domain/text-utils";

// NOTE: For RenderOptions, DEFAULT_RENDER_OPTIONS, LIBREOFFICE_RENDER_OPTIONS, createRenderOptions,
// import directly from @aurochs-renderer/pptx/render-options
