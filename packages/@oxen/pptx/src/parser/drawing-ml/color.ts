/**
 * @file Solid fill color extraction
 *
 * Extracts color values from DrawingML (a:) color elements.
 * Handles all ECMA-376 color types: sRGB, scheme, scRGB, preset, HSL, and system colors.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 */

import type { XmlElement } from "@oxen/xml";
import { isXmlElement, getChild, getAttr } from "@oxen/xml";
import { OOXML_PERCENT_FACTOR } from "../../domain/defaults";
import type { ColorResolveContext } from "../../domain/color/context";
import {
  toHex,
  hslToRgb,
  getColorName2Hex,
  applyShade,
  applyTint,
  applyLumMod,
  applyLumOff,
  applyHueMod,
  applySatMod,
  parseColorToHsl,
  hslToHexString,
} from "@oxen/color";

// =============================================================================
// Color Element Keys (ECMA-376)
// =============================================================================

/**
 * All color element keys per ECMA-376 Part 1, Section 20.1.2.3
 */
export const COLOR_ELEMENT_KEYS = [
  "a:srgbClr",
  "a:schemeClr",
  "a:scrgbClr",
  "a:prstClr",
  "a:hslClr",
  "a:sysClr",
] as const;

export type ColorElementKey = (typeof COLOR_ELEMENT_KEYS)[number];

// =============================================================================
// Scheme Color Mapping (ECMA-376 compliant)
// =============================================================================

/**
 * Default scheme color mapping per ECMA-376.
 * Maps semantic colors (tx1, bg1) to theme color references (dk1, lt1).
 *
 * @see ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap)
 */
const DEFAULT_SCHEME_MAPPING: Record<string, string> = {
  tx1: "dk1",
  tx2: "dk2",
  bg1: "lt1",
  bg2: "lt2",
};

const MAPPABLE_SCHEME_COLORS = new Set(["tx1", "tx2", "bg1", "bg2"]);

/**
 * Resolve effective scheme color name using color map.
 *
 * @param schmClrName - Scheme color name (e.g., "tx1", "dk1", "accent1")
 * @param colorCtx - Color resolution context
 * @returns Effective color name in theme (e.g., "dk1")
 */
function resolveEffectiveSchemeColor(
  schmClrName: string,
  colorCtx: ColorResolveContext,
): string {
  if (!MAPPABLE_SCHEME_COLORS.has(schmClrName)) {
    return schmClrName;
  }

  // Check slide color map override first
  if (colorCtx.colorMapOverride !== undefined) {
    const overrideValue = colorCtx.colorMapOverride[schmClrName];
    if (overrideValue !== undefined) {
      return overrideValue;
    }
  }

  // Fall back to master color map
  const mappedValue = colorCtx.colorMap[schmClrName];
  if (mappedValue !== undefined) {
    return mappedValue;
  }

  // Default mapping as final fallback
  return DEFAULT_SCHEME_MAPPING[schmClrName] ?? schmClrName;
}

/**
 * Get scheme color from theme using ColorResolveContext.
 *
 * Maps scheme color references (tx1, bg1, etc.) to actual color values.
 *
 * @param schemeClr - Scheme color reference (e.g., "a:tx1", "a:accent1")
 * @param phClr - Placeholder color for phClr scheme references
 * @param colorCtx - Color resolution context
 * @returns Hex color string (without #) or undefined
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3.32 (a:schemeClr)
 */
export function getSchemeColor(
  schemeClr: string,
  phClr: string | undefined,
  colorCtx: ColorResolveContext,
): string | undefined {
  const schmClrName = schemeClr.substring(2);

  if (schmClrName === "phClr" && phClr !== undefined) {
    return phClr;
  }

  const effectiveSchemeClr = resolveEffectiveSchemeColor(schmClrName, colorCtx);
  return colorCtx.colorScheme[effectiveSchemeClr];
}

// =============================================================================
// Color Extraction Context and Types
// =============================================================================

/**
 * Internal context for color extraction.
 * Combines ColorResolveContext with placeholder color.
 */
type ColorExtractContext = {
  colorCtx: ColorResolveContext;
  phClr: string | undefined;
};

/**
 * Color extractor function type for XmlElement.
 */
type ColorExtractor = (element: XmlElement, ctx: ColorExtractContext) => string;

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Extract solid fill color from a node.
 *
 * Supports various color formats: srgbClr, schemeClr, scrgbClr, prstClr, hslClr, sysClr.
 * Also applies color transformations: alpha, shade, tint, lumMod, lumOff, hueMod, satMod.
 *
 * The node can be:
 * - A color element directly (a:srgbClr, a:schemeClr, etc.)
 * - A node containing a:solidFill (e.g., a:rPr, a:defRPr)
 * - A solidFill element containing a color element
 *
 * @param node - The XmlElement to extract color from
 * @param phClr - Placeholder color for phClr scheme references
 * @param colorCtx - Color resolution context
 * @returns Hex color string (without #) or undefined if no color found
 */
export function getSolidFill(
  node: unknown,
  phClr: string | undefined,
  colorCtx: ColorResolveContext,
): string | undefined {
  if (node === undefined || node === null) {
    return undefined;
  }

  // Only handle XmlElement format
  if (!isXmlElement(node)) {
    return undefined;
  }

  const ctx: ColorExtractContext = { colorCtx, phClr };

  // If node has a:solidFill child, use that; otherwise use node directly
  const solidFillChild = getChild(node, "a:solidFill");
  const targetNode = solidFillChild ?? node;

  // Find color element
  const found = findColorElement(targetNode);
  if (found === undefined) {
    return undefined;
  }

  const extractor = COLOR_EXTRACTORS[found.key];
  const baseColor = extractor(found.element, ctx);

  return applyColorTransformations(found.element, baseColor);
}

/**
 * Find color element in XmlElement
 */
export function findColorElement(
  node: XmlElement,
): { key: ColorElementKey; element: XmlElement } | undefined {
  for (const key of COLOR_ELEMENT_KEYS) {
    const element = getChild(node, key);
    if (element !== undefined) {
      return { key, element };
    }
  }
  return undefined;
}

// =============================================================================
// Color Extractors
// =============================================================================

/**
 * Extract color from a:srgbClr element.
 * Direct hex color value in the `val` attribute.
 */
function extractSrgbColor(element: XmlElement): string {
  return getAttr(element, "val") ?? "";
}

/**
 * Extract color from a:schemeClr element.
 * References theme color scheme, needs lookup.
 */
function extractSchemeColor(element: XmlElement, ctx: ColorExtractContext): string {
  const schemeClr = getAttr(element, "val");
  if (schemeClr === undefined) {
    return "";
  }
  return getSchemeColor("a:" + schemeClr, ctx.phClr, ctx.colorCtx) ?? "";
}

/**
 * Extract color from a:scrgbClr element.
 * RGB in percentage values (0-100%).
 */
function extractScrgbColor(element: XmlElement): string {
  const r = getAttr(element, "r");
  const g = getAttr(element, "g");
  const b = getAttr(element, "b");
  if (r === undefined || g === undefined || b === undefined) {
    return "";
  }
  const rVal = Math.round((Number(r) / OOXML_PERCENT_FACTOR) * 255);
  const gVal = Math.round((Number(g) / OOXML_PERCENT_FACTOR) * 255);
  const bVal = Math.round((Number(b) / OOXML_PERCENT_FACTOR) * 255);
  return toHex(rVal) + toHex(gVal) + toHex(bVal);
}

/**
 * Extract color from a:prstClr element.
 * Named color from predefined list (e.g., "red", "blue").
 */
function extractPrstColor(element: XmlElement): string {
  const val = getAttr(element, "val");
  if (val === undefined) {
    return "";
  }
  return getColorName2Hex(val) ?? "";
}

/**
 * Extract color from a:hslClr element.
 * HSL color specification.
 */
function extractHslColor(element: XmlElement): string {
  const h = getAttr(element, "hue");
  const s = getAttr(element, "sat");
  const l = getAttr(element, "lum");
  if (h === undefined || s === undefined || l === undefined) {
    return "";
  }
  const hue = Number(h) / 60000;
  const sat = Number(s) / OOXML_PERCENT_FACTOR;
  const lum = Number(l) / OOXML_PERCENT_FACTOR;
  const rgb = hslToRgb(hue, sat, lum);
  return toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
}

/**
 * Extract color from a:sysClr element.
 * System-defined color, uses lastClr as fallback.
 */
function extractSysColor(element: XmlElement): string {
  const lastClr = getAttr(element, "lastClr");
  if (lastClr !== undefined) {
    return lastClr;
  }
  const val = getAttr(element, "val");
  if (val === undefined) {
    return "";
  }
  return val === "windowText" ? "000000" : (val === "window" ? "FFFFFF" : "");
}

/**
 * Color extractor registry
 */
const COLOR_EXTRACTORS: Record<ColorElementKey, ColorExtractor> = {
  "a:srgbClr": extractSrgbColor,
  "a:schemeClr": extractSchemeColor,
  "a:scrgbClr": extractScrgbColor,
  "a:prstClr": extractPrstColor,
  "a:hslClr": extractHslColor,
  "a:sysClr": extractSysColor,
};

// =============================================================================
// Color Transformations
// =============================================================================

/**
 * Parse percentage value (handles both "50%" and "50" formats)
 */
function parsePercentageValue(value: string): number {
  if (value.indexOf("%") !== -1) {
    return Number(value.split("%").shift());
  }
  return Number(value);
}

/**
 * Apply all color transformations to a base color.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Transforms
 */
function applyColorTransformations(element: XmlElement, baseColor: string | undefined): string | undefined {
  if (baseColor === undefined || baseColor === "") {
    return undefined;
  }

  let result = baseColor;

  // Check for alpha first
  const alpha = getChild(element, "a:alpha");
  let hasAlpha = false;
  if (alpha !== undefined) {
    const val = getAttr(alpha, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      const hsl = parseColorToHsl(result);
      hsl.a = pct;
      result = hslToHexString(hsl, true);
      hasAlpha = true;
    }
  }

  // Apply hueMod
  const hueMod = getChild(element, "a:hueMod");
  if (hueMod !== undefined) {
    const val = getAttr(hueMod, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      result = applyHueMod(result, pct, hasAlpha);
    }
  }

  // Apply lumMod
  const lumMod = getChild(element, "a:lumMod");
  if (lumMod !== undefined) {
    const val = getAttr(lumMod, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      result = applyLumMod(result, pct, hasAlpha);
    }
  }

  // Apply lumOff
  const lumOff = getChild(element, "a:lumOff");
  if (lumOff !== undefined) {
    const val = getAttr(lumOff, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      result = applyLumOff(result, pct, hasAlpha);
    }
  }

  // Apply satMod
  const satMod = getChild(element, "a:satMod");
  if (satMod !== undefined) {
    const val = getAttr(satMod, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      result = applySatMod(result, pct, hasAlpha);
    }
  }

  // Apply shade
  const shade = getChild(element, "a:shade");
  if (shade !== undefined) {
    const val = getAttr(shade, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      result = applyShade(result, pct, hasAlpha);
    }
  }

  // Apply tint
  const tint = getChild(element, "a:tint");
  if (tint !== undefined) {
    const val = getAttr(tint, "val");
    if (val !== undefined) {
      const pct = parsePercentageValue(val) / OOXML_PERCENT_FACTOR;
      result = applyTint(result, pct, hasAlpha);
    }
  }

  return result;
}
