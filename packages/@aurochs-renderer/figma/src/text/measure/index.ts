/**
 * @file Text measurement module
 *
 * Provides text measurement and line breaking capabilities.
 *
 * Features:
 * - Text width/height measurement
 * - Character-level width measurement
 * - Word-based and character-based line breaking
 * - CJK text handling
 * - Multiple measurement providers (Canvas, fallback)
 */

// Types
export type {
  TextMeasurement,
  LineMeasurement,
  MultiLineMeasurement,
  FontSpec,
  LineBreakMode,
  LineBreakOptions,
  MeasurementProvider,
  TextMeasurerConfig,
  WordSegment,
} from "./types";

// Measurement provider
export {
  CanvasMeasurementProvider,
  FallbackMeasurementProvider,
  createMeasurementProvider,
} from "./provider";

// Line breaking
export {
  segmentText,
  breakLines,
  breakLinesWord,
  breakLinesChar,
  breakLinesAuto,
} from "./line-break";

// Main measurer
export { TextMeasurer, createTextMeasurer } from "./measurer";

// OpenType.js provider (for accurate font metrics)
export {
  OpentypeMeasurementProvider,
  measureTextAsync,
  getAscenderRatioAsync,
} from "./opentype-provider";
