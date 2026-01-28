/**
 * @file Text measurement module
 *
 * Provides text measurement using Canvas API with font-metrics fallback.
 * All measurements use plain numbers (pixels for width, points for font size).
 *
 * For type-safe branded units (Pixels, Points), use @oxen-office/text-layout
 * which wraps these functions with OOXML-specific types.
 */

// Units
export { PT_TO_PX, PX_TO_PT, pointsToPixels, pixelsToPoints } from "./units";

// Measurer
export type { CharWidthResult, DetailedMeasurement, TextMeasurer } from "./measurer";
export {
  calculateCharWidth,
  measureTextWidth,
  estimateTextWidthFallback,
  measureTextDetailed,
  createTextMeasurer,
} from "./measurer";
