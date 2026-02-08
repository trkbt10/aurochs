/**
 * @file DOCX Adapters
 *
 * Adapters for converting DOCX domain types to text-layout input types.
 */

// =============================================================================
// DOCX Adapter (Paragraph/Run conversion)
// =============================================================================

export {
  paragraphToLayoutInput,
  paragraphsToLayoutInputs,
  getParagraphPlainText,
  getDocumentPlainText,
  extractFloatingImages,
  DEFAULT_PAGE_CONFIG,
  getContentWidth,
  getContentHeight,
  createParagraphLayoutContext,
} from "./docx-adapter";
export type { DocxPageConfig, ParagraphLayoutContext } from "./docx-adapter";

// =============================================================================
// DOCX Table Adapter
// =============================================================================

export { tableToLayoutInput, isParagraph, isTable } from "./docx-table-adapter";

// =============================================================================
// Numbering Resolver
// =============================================================================

export {
  formatNumber,
  substituteLevelText,
  resolveBulletConfig,
  createNumberingContext,
} from "./numbering-resolver";
export type { NumberingContext } from "./numbering-resolver";

// =============================================================================
// DOCX Section Adapter
// =============================================================================

export {
  sectionPropertiesToPageConfig,
  getSectionContentWidth,
  getSectionContentHeight,
  getAllSectionConfigs,
} from "./docx-section-adapter";

// =============================================================================
// DOCX Header/Footer Resolver
// =============================================================================

export {
  resolveHeaderFooter,
  hasHeaders,
  hasFooters,
  layoutHeader,
  layoutFooter,
} from "./docx-header-footer-resolver";
export type {
  ResolvedHeaderFooter,
  HeaderFooterContext,
  HeaderFooterLayoutConfig,
} from "./docx-header-footer-resolver";

// =============================================================================
// DOCX Style Resolver
// =============================================================================

export {
  createStyleResolver,
  resolveRunProperties,
  resolveRunPropertiesWithStyles,
} from "./docx-style-resolver";
export type { ResolvedRunProperties } from "./docx-style-resolver";
