/**
 * @file Fill Parser for styles.xml
 *
 * Parses fill elements from SpreadsheetML styles.
 * Supports pattern fills and gradient fills.
 *
 * @see ECMA-376 Part 4, Section 18.8.20 (fill)
 * @see ECMA-376 Part 4, Section 18.8.32 (patternFill)
 * @see ECMA-376 Part 4, Section 18.8.24 (gradientFill)
 */

import type {
  XlsxFill,
  XlsxPatternFill,
  XlsxGradientFill,
  XlsxGradientStop,
  XlsxColor,
  XlsxPatternType,
} from "../../domain/style/fill";
import { parseFloatAttr, parseIntAttr } from "../primitive";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getChildren } from "@oxen/xml";

// =============================================================================
// Color Parsing
// =============================================================================

/**
 * Parse a color element into XlsxColor.
 *
 * Colors in SpreadsheetML can be specified in multiple ways:
 * - RGB: Direct AARRGGBB hex value
 * - Theme: Reference to theme color with optional tint
 * - Indexed: Reference to legacy indexed color palette
 * - Auto: Automatic color (system-dependent)
 *
 * @param colorElement - The color element
 * @returns The parsed color or undefined if no color specified
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 * @see ECMA-376 Part 4, Section 18.8.3 (CT_Color)
 */
export function parseColor(colorElement: XmlElement): XlsxColor | undefined {
  // Check for RGB color
  const rgb = getAttr(colorElement, "rgb");
  if (rgb) {
    return { type: "rgb", value: rgb };
  }

  // Check for theme color
  const theme = getAttr(colorElement, "theme");
  if (theme !== undefined) {
    const tint = getAttr(colorElement, "tint");
    return {
      type: "theme",
      theme: parseIntAttr(theme) ?? 0,
      tint: tint !== undefined ? parseFloatAttr(tint) : undefined,
    };
  }

  // Check for indexed color
  const indexed = getAttr(colorElement, "indexed");
  if (indexed !== undefined) {
    return { type: "indexed", index: parseIntAttr(indexed) ?? 0 };
  }

  // Check for auto color
  const auto = getAttr(colorElement, "auto");
  if (auto === "1" || auto === "true") {
    return { type: "auto" };
  }

  return undefined;
}

// =============================================================================
// Pattern Fill Parsing
// =============================================================================

/**
 * Parse a patternFill element.
 *
 * @param patternFillElement - The <patternFill> element
 * @returns The parsed pattern fill
 *
 * @see ECMA-376 Part 4, Section 18.8.32 (patternFill)
 */
export function parsePatternFill(
  patternFillElement: XmlElement,
): XlsxPatternFill {
  const patternType = (getAttr(patternFillElement, "patternType") ??
    "none") as XlsxPatternType;
  const fgColorEl = getChild(patternFillElement, "fgColor");
  const bgColorEl = getChild(patternFillElement, "bgColor");

  return {
    patternType,
    fgColor: fgColorEl ? parseColor(fgColorEl) : undefined,
    bgColor: bgColorEl ? parseColor(bgColorEl) : undefined,
  };
}

// =============================================================================
// Gradient Fill Parsing
// =============================================================================

/**
 * Parse a gradientFill element.
 *
 * @param gradientFillElement - The <gradientFill> element
 * @returns The parsed gradient fill
 *
 * @see ECMA-376 Part 4, Section 18.8.24 (gradientFill)
 */
export function parseGradientFill(
  gradientFillElement: XmlElement,
): XlsxGradientFill {
  const gradientType = (getAttr(gradientFillElement, "type") ?? "linear") as
    | "linear"
    | "path";
  const degree = parseFloatAttr(getAttr(gradientFillElement, "degree"));

  const stops: XlsxGradientStop[] = [];
  const stopElements = getChildren(gradientFillElement, "stop");
  for (const stopEl of stopElements) {
    const position = parseFloatAttr(getAttr(stopEl, "position")) ?? 0;
    const colorEl = getChild(stopEl, "color");
    if (colorEl) {
      const color = parseColor(colorEl);
      if (color) {
        stops.push({ position, color });
      }
    }
  }

  return { gradientType, degree, stops };
}

// =============================================================================
// Fill Parsing
// =============================================================================

/**
 * Parse a single fill element.
 *
 * @param fillElement - The <fill> element
 * @returns The parsed fill
 *
 * @see ECMA-376 Part 4, Section 18.8.20 (fill)
 */
export function parseFill(fillElement: XmlElement): XlsxFill {
  const patternFillEl = getChild(fillElement, "patternFill");
  if (patternFillEl) {
    const patternType = getAttr(patternFillEl, "patternType");
    if (patternType === "none") {
      return { type: "none" };
    }
    return { type: "pattern", pattern: parsePatternFill(patternFillEl) };
  }

  const gradientFillEl = getChild(fillElement, "gradientFill");
  if (gradientFillEl) {
    return { type: "gradient", gradient: parseGradientFill(gradientFillEl) };
  }

  return { type: "none" };
}

/**
 * Parse the fills collection from styles.xml.
 *
 * @param fillsElement - The <fills> element
 * @returns Array of parsed fills
 *
 * @see ECMA-376 Part 4, Section 18.8.21 (fills)
 */
export function parseFills(fillsElement: XmlElement): readonly XlsxFill[] {
  const result: XlsxFill[] = [];
  const fillElements = getChildren(fillsElement, "fill");
  for (const fillEl of fillElements) {
    result.push(parseFill(fillEl));
  }
  return result;
}
