/**
 * @file Text utilities - public API
 */

export { isCjkChar, isCjkCodePoint } from "./cjk";
export { getAscenderRatio, getCharWidth, getKerningAdjustment, getKerningForText } from "./font-metrics";
export { getFontCategory, getFontMetrics, isMonospace } from "./fonts";
export type { FontCategory, FontMetrics } from "./fonts/types";
