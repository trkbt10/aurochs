/** @file OOXML parser public exports */

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

export type { OoxmlTextReader } from "./relationships";
export {
  resolvePartPath,
  getRelationshipPath,
  parseRelationships,
  parseRelationshipsFromText,
  loadRelationships,
} from "./relationships";

export {
  findColorElement,
  parseColor,
  parseColorFromParent,
  findFillElement,
  parseBaseFill,
  parseBaseFillFromParent,
  parseLine,
  getLineFromProperties,
  parseEffects,
  parseOuterShadowEffect,
  parseInnerShadowEffect,
  parseGlowEffect,
  parseReflectionEffect,
  parseSoftEdgeEffect,
} from "./drawing-ml";
