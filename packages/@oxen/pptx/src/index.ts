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
export type { ResourceMap } from "./domain";
export type { SlideSize } from "./domain";

// Render options for dialect-specific behavior
export type { RenderOptions, RenderDialect, LineSpacingMode, BaselineMode } from "./render/render-options";
export { DEFAULT_RENDER_OPTIONS, LIBREOFFICE_RENDER_OPTIONS, createRenderOptions } from "./render/render-options";
