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

// Render options re-exported from @oxen-renderer/pptx
export type { RenderOptions, RenderDialect, LineSpacingMode, BaselineMode } from "@oxen-renderer/pptx";
export { DEFAULT_RENDER_OPTIONS, LIBREOFFICE_RENDER_OPTIONS, createRenderOptions } from "@oxen-renderer/pptx";
