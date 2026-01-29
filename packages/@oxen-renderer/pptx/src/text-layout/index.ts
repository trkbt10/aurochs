/**
 * @file Text layout module for SVG rendering
 *
 * Provides text layout functionality optimized for SVG output where
 * CSS flow-based text layout is not available.
 *
 * ## Why This Module Exists
 *
 * SVG text elements require explicit x/y coordinates for each text run,
 * unlike HTML where CSS handles text wrapping and positioning automatically.
 * This module pre-calculates text positions for SVG rendering.
 *
 * ## Font Measurement Approach
 *
 * This module uses **statistical font metrics** instead of loading actual fonts:
 * - Pre-computed character width tables based on common fonts
 * - Kerning adjustments for character pairs
 * - CJK (Chinese/Japanese/Korean) character width handling
 *
 * This approach enables:
 * - Server-side rendering without font dependencies
 * - Consistent output across different environments
 * - Fast layout calculation without font parsing
 *
 * See `src/text/font-metrics.ts` for the font metrics data.
 *
 * ## Module Structure
 *
 * - **types.ts** - Type definitions for layout input/output
 * - **measurer.ts** - Text width estimation using font metrics
 * - **line-breaker.ts** - Line breaking and word wrap logic
 * - **engine.ts** - Main layout engine that positions text
 * - **adapter.ts** - Converts domain TextBody to layout input
 *
 * @example
 * ```typescript
 * import { toLayoutInput, layoutTextBody } from "./text-layout";
 *
 * const input = toLayoutInput({
 *   body: textBody,
 *   width: px(300),
 *   height: px(200),
 *   colorContext,
 * });
 * const result = layoutTextBody(input);
 * // result.lines contains positioned text spans for SVG rendering
 * ```
 */

// Types
export type {
  TextBoxConfig,
  LayoutSpan,
  MeasuredSpan,
  PositionedSpan,
  BulletConfig,
  LayoutParagraphInput,
  LayoutLine,
  LayoutParagraphResult,
  LayoutResult,
  LayoutInput,
} from "./types";

// Measurement
export {
  calculateCharWidth,
  estimateTextWidth,
  measureSpan,
  measureSpans,
  estimateBulletWidth,
  measureTextDetailed,
} from "./measurer";
export type { CharWidthResult, DetailedMeasurement } from "./measurer";

// Line breaking
export { breakIntoLines, getLineWidth, getLineMaxFontSize, getLineMaxFontInfo } from "./line-breaker";
export type { LineBreakResult, LineFontInfo } from "./line-breaker";

// Layout engine
export { layoutTextBody } from "./engine";

// Adapter
export { toLayoutInput, toTextBoxConfig } from "./adapter";
export type { ToLayoutInputOptions, ToTextBoxConfigOptions } from "./adapter";
