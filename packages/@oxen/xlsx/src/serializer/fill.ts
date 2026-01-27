/**
 * @file Fill Serializer for styles.xml
 *
 * Serializes XlsxFill types to XML elements.
 * Produces ECMA-376 compliant SpreadsheetML fill elements.
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
} from "../domain/style/fill";
import type { XmlElement } from "@oxen/xml";

// =============================================================================
// Color Serialization
// =============================================================================

/**
 * Serialize a color to XML element.
 *
 * @param elementName - The name of the color element (e.g., "fgColor", "bgColor", "color")
 * @param color - The color to serialize
 * @returns XmlElement for the color
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 */
export function serializeColor(elementName: string, color: XlsxColor): XmlElement {
  const attrs: Record<string, string> = {};

  switch (color.type) {
    case "rgb":
      attrs.rgb = color.value;
      break;
    case "theme":
      attrs.theme = String(color.theme);
      if (color.tint !== undefined) {
        attrs.tint = String(color.tint);
      }
      break;
    case "indexed":
      attrs.indexed = String(color.index);
      break;
    case "auto":
      attrs.auto = "1";
      break;
  }

  return {
    type: "element",
    name: elementName,
    attrs,
    children: [],
  };
}

// =============================================================================
// Pattern Fill Serialization
// =============================================================================

/**
 * Serialize a pattern fill to XML element.
 *
 * Serialization rules:
 * - patternType="none" produces `<patternFill patternType="none"/>`
 * - patternType="solid" requires fgColor, bgColor is optional
 * - Other pattern types output both fgColor and bgColor if present
 * - Child element order: fgColor, then bgColor
 *
 * @param patternFill - The pattern fill to serialize
 * @returns XmlElement for the patternFill
 *
 * @see ECMA-376 Part 4, Section 18.8.32 (patternFill)
 */
export function serializePatternFill(patternFill: XlsxPatternFill): XmlElement {
  const children: XmlElement[] = [];

  // Child element order: fgColor first, then bgColor
  if (patternFill.fgColor) {
    children.push(serializeColor("fgColor", patternFill.fgColor));
  }
  if (patternFill.bgColor) {
    children.push(serializeColor("bgColor", patternFill.bgColor));
  }

  return {
    type: "element",
    name: "patternFill",
    attrs: { patternType: patternFill.patternType },
    children,
  };
}

// =============================================================================
// Gradient Fill Serialization
// =============================================================================

/**
 * Serialize a gradient stop to XML element.
 *
 * @param stop - The gradient stop to serialize
 * @returns XmlElement for the stop
 *
 * @see ECMA-376 Part 4, Section 18.8.25 (stop)
 */
export function serializeGradientStop(stop: XlsxGradientStop): XmlElement {
  return {
    type: "element",
    name: "stop",
    attrs: { position: String(stop.position) },
    children: [serializeColor("color", stop.color)],
  };
}

/**
 * Serialize a gradient fill to XML element.
 *
 * @param gradientFill - The gradient fill to serialize
 * @returns XmlElement for the gradientFill
 *
 * @see ECMA-376 Part 4, Section 18.8.24 (gradientFill)
 */
export function serializeGradientFill(gradientFill: XlsxGradientFill): XmlElement {
  const attrs: Record<string, string> = {};

  // Only include type attribute if not default "linear"
  if (gradientFill.gradientType !== "linear") {
    attrs.type = gradientFill.gradientType;
  } else {
    attrs.type = "linear";
  }

  if (gradientFill.degree !== undefined) {
    attrs.degree = String(gradientFill.degree);
  }

  const children: XmlElement[] = gradientFill.stops.map(serializeGradientStop);

  return {
    type: "element",
    name: "gradientFill",
    attrs,
    children,
  };
}

// =============================================================================
// Fill Serialization
// =============================================================================

/**
 * Serialize a single fill to XML element.
 *
 * @param fill - The fill to serialize
 * @returns XmlElement for the fill
 *
 * @see ECMA-376 Part 4, Section 18.8.20 (fill)
 */
export function serializeFill(fill: XlsxFill): XmlElement {
  const children: XmlElement[] = [];

  switch (fill.type) {
    case "none":
      // For type "none", output patternFill with patternType="none"
      children.push({
        type: "element",
        name: "patternFill",
        attrs: { patternType: "none" },
        children: [],
      });
      break;
    case "pattern":
      children.push(serializePatternFill(fill.pattern));
      break;
    case "gradient":
      children.push(serializeGradientFill(fill.gradient));
      break;
  }

  return {
    type: "element",
    name: "fill",
    attrs: {},
    children,
  };
}

/**
 * Serialize a fills collection to XML element.
 *
 * Standard Excel workbooks contain at least 2 default fills:
 * - fills[0]: patternFill with patternType="none"
 * - fills[1]: patternFill with patternType="gray125"
 *
 * @param fills - The fills collection to serialize
 * @returns XmlElement for the fills collection
 *
 * @see ECMA-376 Part 4, Section 18.8.21 (fills)
 */
export function serializeFills(fills: readonly XlsxFill[]): XmlElement {
  return {
    type: "element",
    name: "fills",
    attrs: { count: String(fills.length) },
    children: fills.map(serializeFill),
  };
}
