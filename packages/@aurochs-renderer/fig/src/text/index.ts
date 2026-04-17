/**
 * @file Shared text pipeline (format-agnostic)
 *
 * Provides text layout, measurement, and path extraction
 * shared between SVG and WebGL renderers.
 */

export type {
  ExtractedTextProps,
  FillColorResult,
  TextAlignHorizontal,
  TextAlignVertical,
  TextAutoResize,
  TextDecoration,
  TextBoxSize,
  FigFontName,
  FigValueWithUnits,
  FigTextData,
} from "./layout";

export {
  extractTextProps,
  getValueWithUnits,
  getAlignedX,
  getAlignedY,
  getAlignedYWithMetrics,
  type AlignYOptions,
  getFillColorAndOpacity,
  computeTextLayout,
  textLayoutToCursorLayout,
  type TextLayout,
  type LayoutLine,
  type ComputeLayoutOptions,
  type CursorLayoutResult,
  type CursorLayoutLine,
  type CursorLayoutSpan,
} from "./layout";

export {
  createTextMeasurer,
} from "./measure";

export type {
  TextMeasurerInstance,
  MeasurementProvider,
  FontSpec,
} from "./measure";

export {
  convertQuadraticsToCubic,
} from "./paths";

export type {
  PathContour,
} from "./paths";

// Unified text rendering SoT
export {
  resolveTextRendering,
} from "./rendering";

export type {
  TextRendering,
  TextRenderingEmpty,
  TextRenderingGlyphs,
  TextRenderingLines,
  ResolveTextContext,
} from "./rendering";
