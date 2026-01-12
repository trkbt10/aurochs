/**
 * @file Color utilities - public API
 */

export type { HslColor, RgbColor } from "./types";

export {
  hexToRgb,
  rgbToHex,
  toHex,
  rgbToHsl,
  hslToRgb,
  parseColorToHsl,
  hslToHexString,
  rgba2hex,
} from "./convert";

export {
  applyShade,
  applyTint,
  applyLumOff,
  applyLumMod,
  applyHueMod,
  applySatMod,
  applySrgbGamma,
  applySrgbInvGamma,
} from "./transform";

export { getColorName2Hex } from "./named-colors";

// Gradient utilities
export type { ParsedLinearGradient, SvgGradientResult } from "./gradient";
export {
  parseLinearGradient,
  angleToGradientCoords,
  toSvgLinearGradient,
  cssGradientToSvg,
  extractFirstColor,
} from "./gradient";

// Raw pixel conversion utilities
export {
  convertToRgba,
  getColorSpaceComponents,
  convertGrayToRgba,
  convertRgbToRgba,
  convertCmykToRgba,
  convertIccBasedToRgba,
} from "./raw-pixel-converter";
