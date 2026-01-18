/**
 * @file Office Text Layout Module
 *
 * Unified text layout engine for PPTX and DOCX.
 * Provides shared text measurement, line breaking, and layout capabilities.
 */

// Types
export type {
  // Alignment
  TextAlign,
  TextAnchor,
  LineSpacing,
  // Span types
  TextFillConfig,
  TextOutlineConfig,
  LayoutSpan,
  MeasuredSpan,
  PositionedSpan,
  // Paragraph types
  BulletConfig,
  LayoutTabStop,
  FontAlignment,
  LayoutParagraphInput,
  // Layout results
  LayoutLine,
  LayoutParagraphResult,
  LayoutResult,
  // Table types
  LayoutBorderStyle,
  LayoutCellBorders,
  LayoutTableCellInput,
  LayoutTableRowInput,
  LayoutTableInput,
  LayoutTableCellResult,
  LayoutTableRowResult,
  LayoutTableResult,
  // Text box config
  TextWrapping,
  TextOverflow,
  TextVerticalOverflow,
  AutoFitConfig,
  TextBoxConfig,
  // Layout input
  MeasuredParagraph,
  LayoutInput,
  // Floating image types
  FloatingImageHorizontalRef,
  FloatingImageVerticalRef,
  FloatingImageWrap,
  FloatingImageConfig,
  PositionedFloatingImage,
  // Continuous document types
  HeaderFooterLayout,
  PageLayout,
  PagedLayoutResult,
  ContinuousCursorPosition,
  ContinuousSelection,
  CursorCoordinates,
  SelectionRect,
} from "./types";

// Measurer
export {
  PT_TO_PX,
  calculateCharWidth,
  estimateTextWidth,
  measureSpan,
  measureSpans,
  estimateBulletWidth,
  measureTextDetailed,
  measureSpanTextWidth,
  getCharIndexAtOffset,
} from "./measurer";
export type { CharWidthResult, DetailedMeasurement } from "./measurer";

// Line breaker
export {
  DEFAULT_FONT_SIZE_PT,
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./line-breaker";
export type { LineBreakResult, LineFontInfo } from "./line-breaker";

// Layout engine
export { layoutTextBody, layoutDocument } from "./engine";

// DOCX adapter
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
} from "./adapters/docx-adapter";
export type { DocxPageConfig, ParagraphLayoutContext } from "./adapters/docx-adapter";

// DOCX table adapter
export {
  tableToLayoutInput,
  isParagraph,
  isTable,
} from "./adapters/docx-table-adapter";

// Table layout engine
export { layoutTable } from "./table-layout";
export type { TableLayoutConfig } from "./table-layout";

// Numbering resolver
export {
  formatNumber,
  substituteLevelText,
  resolveBulletConfig,
  createNumberingContext,
} from "./adapters/numbering-resolver";
export type { NumberingContext } from "./adapters/numbering-resolver";

// DOCX section adapter
export {
  sectionPropertiesToPageConfig,
  getSectionContentWidth,
  getSectionContentHeight,
  getAllSectionConfigs,
} from "./adapters/docx-section-adapter";

// DOCX header/footer resolver
export {
  resolveHeaderFooter,
  hasHeaders,
  hasFooters,
  layoutHeader,
  layoutFooter,
} from "./adapters/docx-header-footer-resolver";
export type {
  ResolvedHeaderFooter,
  HeaderFooterContext,
  HeaderFooterLayoutConfig,
} from "./adapters/docx-header-footer-resolver";

// DOCX style resolver
export {
  createStyleResolver,
  resolveRunProperties,
  resolveRunPropertiesWithStyles,
} from "./adapters/docx-style-resolver";
export type { ResolvedRunProperties } from "./adapters/docx-style-resolver";

// Writing mode utilities
export {
  textDirectionToWritingMode,
  toDirectional,
  fromDirectional,
  toDirectionalSize,
  fromDirectionalSize,
  toDirectionalBounds,
  fromDirectionalBounds,
  isHorizontal,
  isVertical,
  getCssWritingMode,
} from "./writing-mode";
export type {
  WritingMode,
  DirectionalCoords,
  DirectionalSize,
  DirectionalBounds,
  PhysicalCoords,
  PhysicalSize,
  PhysicalBounds,
} from "./writing-mode";

// SVG Renderer
export {
  TextOverlay,
  renderSelectionRects,
  renderCursor,
  CURSOR_ANIMATION_CSS,
} from "./renderers/svg-renderer";
export type { TextOverlayProps } from "./renderers/svg-renderer";

// SVG Table Renderer
export { TableOverlay, renderTables } from "./renderers/svg-table-renderer";
export type { TableOverlayProps } from "./renderers/svg-table-renderer";

// Page Flow
export {
  flowIntoPages,
  createSinglePageLayout,
  DEFAULT_PAGE_FLOW_CONFIG,
} from "./page-flow";
export type { PageFlowConfig, PageBreakHint, PageFlowInput } from "./page-flow";
