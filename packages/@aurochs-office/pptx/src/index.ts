/**
 * @file PPTX Parser - Public API
 */

// File abstraction (allows any ZIP library)
export type { PresentationFile } from "./domain";

// Presentation reader API (from app layer)
export { openPresentation } from "./app";
export type { Presentation, Slide, SlideInfo, ListOptions, PresentationOptions } from "./app/types";

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
