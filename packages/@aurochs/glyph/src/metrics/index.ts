/**
 * @file Font metrics module
 *
 * Provides font metrics for text width estimation and kerning calculations.
 */

// Types
export type { CharWidthMap, KerningPairMap, FontMetrics, FontCategory } from "./types";

// CJK detection
export { isCjkChar, isCjkCodePoint } from "./cjk";

// Font metrics
export { getCharWidth, getKerningAdjustment, getKerningForText, getAscenderRatio } from "./font-metrics";

// Font registry
export { getFontCategory, getFontMetrics, isMonospace } from "./fonts";
