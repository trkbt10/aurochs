/**
 * @file DOCX Renderer Package
 *
 * Provides rendering utilities for DOCX documents.
 * Follows the same pattern as @aurochs-renderer/pptx.
 */

// Render options
export {
  type DocxRenderDialect,
  type DocxLineSpacingMode,
  type DocxBaselineMode,
  type DocxRenderOptions,
  DEFAULT_DOCX_RENDER_OPTIONS,
  LIBREOFFICE_DOCX_RENDER_OPTIONS,
  WORD_DOCX_RENDER_OPTIONS,
  createDocxRenderOptions,
  getEffectiveLineSpacing,
} from "./render-options";

// SVG rendering
export {
  type PageRenderResult,
  type DocumentRenderResult,
  type DocumentSvgResult,
  type DocumentSvgConfig,
  type WarningsCollector,
  createWarningsCollector,
  renderPageToSvg,
  renderDocumentToSvgs,
  renderDocumentToSvg,
} from "./svg";
