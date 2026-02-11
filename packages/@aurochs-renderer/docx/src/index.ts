/**
 * @file DOCX Renderer Package
 *
 * Provides rendering utilities for DOCX documents.
 * Follows the same pattern as @aurochs-renderer/pptx.
 */

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
