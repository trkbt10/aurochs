/**
 * @file DrawingML Parsers
 *
 * Export all DrawingML parsing functions.
 */

// Primitive parsing utilities
export {
  parseInt32,
  parseInt64,
  parseUnsignedInt,
  parseIndex,
  parseInt32Or,
  parseFloat64,
  parseBoolean,
  parseBooleanOr,
  parseEmu,
  parseLineWidth,
  parseAngle,
  parsePercentage,
  parsePercentage100k,
  parsePositivePercentage,
  parseFixedPercentage,
  parseSchemeColorValue,
  getEmuAttr,
  getAngleAttr,
  getBoolAttr,
  getBoolAttrOr,
  getIntAttr,
  getIntAttrOr,
  getFloatAttr,
  getPercentAttr,
  getPercent100kAttr,
  pointsToPixels,
} from "./primitive";

// Color parsing
export { findColorElement, parseColor, parseColorFromParent } from "./color";

// Fill parsing
export { findFillElement, parseBaseFill, parseBaseFillFromParent } from "./fill";

// Line parsing
export { parseLine, getLineFromProperties } from "./line";

// Effects parsing
export {
  parseOuterShadowEffect,
  parseInnerShadowEffect,
  parseGlowEffect,
  parseReflectionEffect,
  parseSoftEdgeEffect,
  parseEffects,
} from "./effects";
