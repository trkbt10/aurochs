/**
 * @file Color resolution utilities
 *
 * Resolves Color domain objects to CSS-compatible hex strings.
 * Shared by both parser and render layers.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 */

import type { Color, ColorTransform } from "./types";
import type { ColorContext } from "./context";
import {
  hexToRgb as hexToRgbObj,
  rgbToHex as rgbToHexBase,
  rgbToHsl as rgbToHslObj,
  hslToRgb,
  applySrgbGamma,
  applySrgbInvGamma,
} from "../../../color/index";

// =============================================================================
// Preset Colors
// =============================================================================

/**
 * Preset color values (ECMA-376 defined)
 * @see ECMA-376 Part 1, Section 20.1.10.47 (ST_PresetColorVal)
 */
const PRESET_COLORS: Record<string, string> = {
  aliceBlue: "F0F8FF",
  antiqueWhite: "FAEBD7",
  aqua: "00FFFF",
  aquamarine: "7FFFD4",
  azure: "F0FFFF",
  beige: "F5F5DC",
  bisque: "FFE4C4",
  black: "000000",
  blanchedAlmond: "FFEBCD",
  blue: "0000FF",
  blueViolet: "8A2BE2",
  brown: "A52A2A",
  burlyWood: "DEB887",
  cadetBlue: "5F9EA0",
  chartreuse: "7FFF00",
  chocolate: "D2691E",
  coral: "FF7F50",
  cornflowerBlue: "6495ED",
  cornsilk: "FFF8DC",
  crimson: "DC143C",
  cyan: "00FFFF",
  darkBlue: "00008B",
  darkCyan: "008B8B",
  darkGoldenrod: "B8860B",
  darkGray: "A9A9A9",
  darkGreen: "006400",
  darkKhaki: "BDB76B",
  darkMagenta: "8B008B",
  darkOliveGreen: "556B2F",
  darkOrange: "FF8C00",
  darkOrchid: "9932CC",
  darkRed: "8B0000",
  darkSalmon: "E9967A",
  darkSeaGreen: "8FBC8F",
  darkSlateBlue: "483D8B",
  darkSlateGray: "2F4F4F",
  darkTurquoise: "00CED1",
  darkViolet: "9400D3",
  deepPink: "FF1493",
  deepSkyBlue: "00BFFF",
  dimGray: "696969",
  dkBlue: "00008B",
  dkCyan: "008B8B",
  dkGoldenrod: "B8860B",
  dkGray: "A9A9A9",
  dkGreen: "006400",
  dkKhaki: "BDB76B",
  dkMagenta: "8B008B",
  dkOliveGreen: "556B2F",
  dkOrange: "FF8C00",
  dkOrchid: "9932CC",
  dkRed: "8B0000",
  dkSalmon: "E9967A",
  dkSeaGreen: "8FBC8F",
  dkSlateBlue: "483D8B",
  dkSlateGray: "2F4F4F",
  dkTurquoise: "00CED1",
  dkViolet: "9400D3",
  dodgerBlue: "1E90FF",
  firebrick: "B22222",
  floralWhite: "FFFAF0",
  forestGreen: "228B22",
  fuchsia: "FF00FF",
  gainsboro: "DCDCDC",
  ghostWhite: "F8F8FF",
  gold: "FFD700",
  goldenrod: "DAA520",
  gray: "808080",
  green: "008000",
  greenYellow: "ADFF2F",
  honeydew: "F0FFF0",
  hotPink: "FF69B4",
  indianRed: "CD5C5C",
  indigo: "4B0082",
  ivory: "FFFFF0",
  khaki: "F0E68C",
  lavender: "E6E6FA",
  lavenderBlush: "FFF0F5",
  lawnGreen: "7CFC00",
  lemonChiffon: "FFFACD",
  lightBlue: "ADD8E6",
  lightCoral: "F08080",
  lightCyan: "E0FFFF",
  lightGoldenrodYellow: "FAFAD2",
  lightGray: "D3D3D3",
  lightGreen: "90EE90",
  lightPink: "FFB6C1",
  lightSalmon: "FFA07A",
  lightSeaGreen: "20B2AA",
  lightSkyBlue: "87CEFA",
  lightSlateGray: "778899",
  lightSteelBlue: "B0C4DE",
  lightYellow: "FFFFE0",
  lime: "00FF00",
  limeGreen: "32CD32",
  linen: "FAF0E6",
  ltBlue: "ADD8E6",
  ltCoral: "F08080",
  ltCyan: "E0FFFF",
  ltGoldenrodYellow: "FAFAD2",
  ltGray: "D3D3D3",
  ltGreen: "90EE90",
  ltPink: "FFB6C1",
  ltSalmon: "FFA07A",
  ltSeaGreen: "20B2AA",
  ltSkyBlue: "87CEFA",
  ltSlateGray: "778899",
  ltSteelBlue: "B0C4DE",
  ltYellow: "FFFFE0",
  magenta: "FF00FF",
  maroon: "800000",
  medAquamarine: "66CDAA",
  medBlue: "0000CD",
  medOrchid: "BA55D3",
  medPurple: "9370DB",
  medSeaGreen: "3CB371",
  medSlateBlue: "7B68EE",
  medSpringGreen: "00FA9A",
  medTurquoise: "48D1CC",
  medVioletRed: "C71585",
  mediumAquamarine: "66CDAA",
  mediumBlue: "0000CD",
  mediumOrchid: "BA55D3",
  mediumPurple: "9370DB",
  mediumSeaGreen: "3CB371",
  mediumSlateBlue: "7B68EE",
  mediumSpringGreen: "00FA9A",
  mediumTurquoise: "48D1CC",
  mediumVioletRed: "C71585",
  midnightBlue: "191970",
  mintCream: "F5FFFA",
  mistyRose: "FFE4E1",
  moccasin: "FFE4B5",
  navajoWhite: "FFDEAD",
  navy: "000080",
  oldLace: "FDF5E6",
  olive: "808000",
  oliveDrab: "6B8E23",
  orange: "FFA500",
  orangeRed: "FF4500",
  orchid: "DA70D6",
  paleGoldenrod: "EEE8AA",
  paleGreen: "98FB98",
  paleTurquoise: "AFEEEE",
  paleVioletRed: "DB7093",
  papayaWhip: "FFEFD5",
  peachPuff: "FFDAB9",
  peru: "CD853F",
  pink: "FFC0CB",
  plum: "DDA0DD",
  powderBlue: "B0E0E6",
  purple: "800080",
  red: "FF0000",
  rosyBrown: "BC8F8F",
  royalBlue: "4169E1",
  saddleBrown: "8B4513",
  salmon: "FA8072",
  sandyBrown: "F4A460",
  seaGreen: "2E8B57",
  seaShell: "FFF5EE",
  sienna: "A0522D",
  silver: "C0C0C0",
  skyBlue: "87CEEB",
  slateBlue: "6A5ACD",
  slateGray: "708090",
  snow: "FFFAFA",
  springGreen: "00FF7F",
  steelBlue: "4682B4",
  tan: "D2B48C",
  teal: "008080",
  thistle: "D8BFD8",
  tomato: "FF6347",
  turquoise: "40E0D0",
  violet: "EE82EE",
  wheat: "F5DEB3",
  white: "FFFFFF",
  whiteSmoke: "F5F5F5",
  yellow: "FFFF00",
  yellowGreen: "9ACD32",
};

// =============================================================================
// System Colors
// =============================================================================

/**
 * System color fallbacks
 * @see ECMA-376 Part 1, Section 20.1.10.58 (ST_SystemColorVal)
 */
const SYSTEM_COLOR_FALLBACKS: Record<string, string> = {
  windowText: "000000",
  window: "FFFFFF",
  windowFrame: "000000",
  menuText: "000000",
  menu: "FFFFFF",
  scrollBar: "C0C0C0",
  btnFace: "C0C0C0",
  btnHighlight: "FFFFFF",
  btnShadow: "808080",
  btnText: "000000",
  captionText: "000000",
  activeCaption: "000080",
  activeBorder: "C0C0C0",
  appWorkspace: "808080",
  background: "008080",
  grayText: "808080",
  highlight: "000080",
  highlightText: "FFFFFF",
  inactiveCaption: "808080",
  inactiveCaptionText: "C0C0C0",
  inactiveBorder: "C0C0C0",
  infoText: "000000",
  infoBk: "FFFFE1",
  "3dDkShadow": "000000",
  "3dLight": "C0C0C0",
  hotLight: "0000FF",
  gradientActiveCaption: "B9D1EA",
  gradientInactiveCaption: "D7E4F2",
  menuHighlight: "316AC5",
  menuBar: "D4D0C8",
};

// =============================================================================
// Color Conversion Wrappers
// =============================================================================

/**
 * Convert hex to RGB tuple (for backward compatibility with existing code)
 */
function hexToRgb(hex: string): [number, number, number] {
  const rgb = hexToRgbObj(hex);
  return [rgb.r, rgb.g, rgb.b];
}

/**
 * Convert RGB to hex (uppercase)
 */
function rgbToHex(r: number, g: number, b: number): string {
  return rgbToHexBase(r, g, b).toUpperCase();
}

/**
 * Convert RGB to HSL with s/l in 0-100 scale (for backward compatibility)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const hsl = rgbToHslObj(r, g, b);
  return [hsl.h, hsl.s * 100, hsl.l * 100];
}

/**
 * Convert HSL (s/l in 0-100 scale) to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s / 100, l / 100);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// =============================================================================
// Color Resolution
// =============================================================================

/**
 * Resolve color to hex string
 *
 * @param color - Color domain object
 * @param context - Color resolution context with theme colors
 * @returns Hex color string (without #) or undefined
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */
export function resolveColor(color: Color | undefined, context?: ColorContext): string | undefined {
  if (!color) {return undefined;}

  let baseColor: string | undefined;

  switch (color.spec.type) {
    case "srgb":
      baseColor = color.spec.value;
      break;

    case "scheme": {
      // Look up scheme color in theme
      const schemeVal = color.spec.value;
      // First check color map for mapping
      const mappedColor = context?.colorMap[schemeVal] ?? schemeVal;
      // Then look up in color scheme
      baseColor = context?.colorScheme[mappedColor];
      break;
    }

    case "system":
      // Use lastColor if available, otherwise fallback
      baseColor = color.spec.lastColor ?? SYSTEM_COLOR_FALLBACKS[color.spec.value];
      break;

    case "preset":
      baseColor = PRESET_COLORS[color.spec.value];
      break;

    case "hsl":
      // Convert HSL to RGB
      baseColor = hslToHex(color.spec.hue, color.spec.saturation, color.spec.luminance);
      break;
  }

  if (!baseColor) {return undefined;}

  // Apply transforms
  if (color.transform) {
    baseColor = applyColorTransforms(baseColor, color.transform);
  }

  return baseColor;
}

// =============================================================================
// Color Transform Utilities
// =============================================================================

/**
 * Apply color transforms to a hex color.
 *
 * Per ECMA-376/MS-ODRAWXML:
 * - shade: RGB multiplication (moves towards black)
 * - tint: RGB interpolation (moves towards white)
 * - satMod/lumMod/hueMod: HSL modifications
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3.31 (shade)
 * @see ECMA-376 Part 1, Section 20.1.2.3.34 (tint)
 * @see MS-ODRAWXML Section 2.1.1410 (shade), 2.1.1432 (tint)
 */
function applyColorTransforms(hex: string, transform: ColorTransform): string {
  // Parse hex to RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Convert to HSL for HSL-based transforms (hue, sat, lum modifications)
  const [h, s, l] = rgbToHsl(r, g, b);
  let hue = h,
    sat = s,
    lum = l;

  // Apply HSL transforms
  if (transform.hue !== undefined) {hue = transform.hue;}
  if (transform.hueMod !== undefined) {hue = (hue * transform.hueMod) / 100;}
  if (transform.hueOff !== undefined) {hue = (hue + transform.hueOff) % 360;}

  if (transform.sat !== undefined) {sat = transform.sat;}
  if (transform.satMod !== undefined) {sat = (sat * transform.satMod) / 100;}
  if (transform.satOff !== undefined) {sat = Math.max(0, Math.min(100, sat + transform.satOff));}

  if (transform.lum !== undefined) {lum = transform.lum;}
  if (transform.lumMod !== undefined) {lum = (lum * transform.lumMod) / 100;}
  if (transform.lumOff !== undefined) {lum = Math.max(0, Math.min(100, lum + transform.lumOff));}

  // Convert back to RGB after HSL transforms
  let result = hslToHex(hue, sat, lum);

  if (transform.gamma) {
    const [gr, gg, gb] = hexToRgb(result);
    result = rgbToHex(applySrgbGamma(gr), applySrgbGamma(gg), applySrgbGamma(gb));
  }

  if (transform.invGamma) {
    const [gr, gg, gb] = hexToRgb(result);
    result = rgbToHex(applySrgbInvGamma(gr), applySrgbInvGamma(gg), applySrgbInvGamma(gb));
  }

  if (transform.green !== undefined) {
    const green = Math.max(0, Math.min(100, transform.green)) / 100;
    const [gr, , gb] = hexToRgb(result);
    result = rgbToHex(gr, Math.round(255 * green), gb);
  }

  if (transform.greenMod !== undefined) {
    const greenMod = transform.greenMod / 100;
    const [gr, gg, gb] = hexToRgb(result);
    result = rgbToHex(gr, Math.round(gg * greenMod), gb);
  }

  if (transform.greenOff !== undefined) {
    const greenOff = transform.greenOff / 100;
    const [gr, gg, gb] = hexToRgb(result);
    result = rgbToHex(gr, gg + 255 * greenOff, gb);
  }

  if (transform.redMod !== undefined) {
    const redMod = transform.redMod / 100;
    const [rr, rg, rb] = hexToRgb(result);
    result = rgbToHex(Math.round(rr * redMod), rg, rb);
  }

  if (transform.redOff !== undefined) {
    const redOff = transform.redOff / 100;
    const [rr, rg, rb] = hexToRgb(result);
    result = rgbToHex(rr + 255 * redOff, rg, rb);
  }

  if (transform.blueMod !== undefined) {
    const blueMod = transform.blueMod / 100;
    const [br, bg, bb] = hexToRgb(result);
    result = rgbToHex(br, bg, Math.round(bb * blueMod));
  }

  if (transform.blueOff !== undefined) {
    const blueOff = transform.blueOff / 100;
    const [br, bg, bb] = hexToRgb(result);
    result = rgbToHex(br, bg, bb + 255 * blueOff);
  }

  // Apply shade/tint in RGB space per MS-ODRAWXML spec
  // shade: "A 10% shade is 10% of the input color combined with 90% black"
  if (transform.shade !== undefined) {
    const shadeVal = transform.shade / 100;
    const [sr, sg, sb] = hexToRgb(result);
    result = rgbToHex(Math.round(sr * shadeVal), Math.round(sg * shadeVal), Math.round(sb * shadeVal));
  }

  // tint: "A 10% tint is 10% of the input color combined with 90% white"
  if (transform.tint !== undefined) {
    const tintVal = transform.tint / 100;
    const [tr, tg, tb] = hexToRgb(result);
    result = rgbToHex(
      Math.round(tr + (255 - tr) * (1 - tintVal)),
      Math.round(tg + (255 - tg) * (1 - tintVal)),
      Math.round(tb + (255 - tb) * (1 - tintVal)),
    );
  }

  // Complement
  if (transform.comp) {
    const [cr, cg, cb] = hexToRgb(result);
    return rgbToHex(255 - cr, 255 - cg, 255 - cb);
  }

  // Inverse
  if (transform.inv) {
    const [ir, ig, ib] = hexToRgb(result);
    return rgbToHex(255 - ir, 255 - ig, 255 - ib);
  }

  // Grayscale
  if (transform.gray) {
    const [gr, gg, gb] = hexToRgb(result);
    const gray = Math.round(0.299 * gr + 0.587 * gg + 0.114 * gb);
    return rgbToHex(gray, gray, gray);
  }

  return result;
}
