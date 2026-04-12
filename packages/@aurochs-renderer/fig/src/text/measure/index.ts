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
  createCanvasMeasurementProvider,
  createFallbackMeasurementProvider,
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
export { createTextMeasurer, type TextMeasurerInstance } from "./measurer";

// OpenType.js provider (for accurate font metrics)
export {
  createOpentypeMeasurementProvider,
  type OpentypeMeasurementProviderInstance,
  measureTextAsync,
  getAscenderRatioAsync,
} from "./opentype-provider";
