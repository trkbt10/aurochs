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
  InlineImageConfig,
  ImageSourceRect,
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
  calculateCharWidth,
  estimateTextWidth,
  measureSpan,
  measureSpans,
  estimateBulletWidth,
  measureTextDetailed,
  measureSpanTextWidth,
  getCharIndexAtOffset,
} from "./measure/measurer";
export type { CharWidthResult, DetailedMeasurement } from "./measure/measurer";

// Line breaker
export {
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./measure/line-breaker";
export type { LineBreakResult, LineFontInfo } from "./measure/line-breaker";

// Layout engine
export { layoutTextBody, layoutDocument } from "./layout/engine";

// Table layout engine
export { layoutTable } from "./layout/table-layout";
export type { TableLayoutConfig } from "./layout/table-layout";

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
} from "./layout/page-flow";
export type { PageFlowConfig, PageBreakHint, PageFlowInput, ColumnConfig } from "./layout/page-flow";
