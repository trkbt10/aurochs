/**
 * @file PPTX Parser - Public API
 */

// File abstraction (allows any ZIP library)
export type { PresentationFile } from "./types/file";

// Presentation reader API
export { openPresentation } from "./presentation";
export type { Presentation, Slide, SlideInfo, ListOptions } from "./types/api";

// Core types needed by consumers
export type { IndexTables } from "./core/types";
export type { ResourceMap } from "./opc";
export type { SlideSize } from "./domain";

// Render options for dialect-specific behavior
export type { RenderOptions, RenderDialect, LineSpacingMode, BaselineMode } from "./render/render-options";
export { DEFAULT_RENDER_OPTIONS, LIBREOFFICE_RENDER_OPTIONS, createRenderOptions } from "./render/render-options";
export type { PresentationOptions } from "./types/api";
