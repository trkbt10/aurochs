/**
 * @file Shape style parsing
 *
 * @see ECMA-376 Part 1, Section 19.3.1.46 (p:style)
 */

import { getAttr, getChild, type XmlElement } from "@oxen/xml";
import type { FontReference, ShapeStyle, StyleReference } from "../../domain";
import { parseColorFromParent } from "../graphics/color-parser";
import { parseFontCollectionIndex, parseStyleMatrixColumnIndex } from "../primitive";

/**
 * Parse style reference
 *
 * Per ECMA-376 Part 1, Section 20.1.4.2.10 (a:fillRef):
 * The fillRef may contain a color child element (e.g., a:schemeClr, a:srgbClr)
 * that specifies the color to use in place of phClr in the referenced style.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.2.10
 */
export function parseStyleReference(element: XmlElement | undefined): StyleReference | undefined {
  if (!element) {
    return undefined;
  }

  const idx = parseStyleMatrixColumnIndex(getAttr(element, "idx"));
  if (idx === undefined) {
    return undefined;
  }

  // Color can be specified as a color child element (a:schemeClr, a:srgbClr, etc.)
  // This is NOT a fill element - we need to parse it as a color and wrap in solidFill
  const parsedColor = parseColorFromParent(element);
  const color = parsedColor ? { type: "solidFill" as const, color: parsedColor } : undefined;

  return { index: idx, color };
}

/**
 * Parse font reference
 *
 * Per ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef):
 * The fontRef may contain a color child element that specifies the font color.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.17
 */
export function parseFontReference(element: XmlElement | undefined): FontReference | undefined {
  if (!element) {
    return undefined;
  }

  const idx = parseFontCollectionIndex(getAttr(element, "idx"));
  if (!idx || idx === "none") {
    return undefined;
  }

  // Color can be specified as a color child element
  const parsedColor = parseColorFromParent(element);
  const color = parsedColor ? { type: "solidFill" as const, color: parsedColor } : undefined;

  return { index: idx, color };
}

/**
 * Parse shape style (p:style)
 * @see ECMA-376 Part 1, Section 19.3.1.46
 */
export function parseShapeStyle(style: XmlElement | undefined): ShapeStyle | undefined {
  if (!style) {
    return undefined;
  }

  return {
    lineReference: parseStyleReference(getChild(style, "a:lnRef")),
    fillReference: parseStyleReference(getChild(style, "a:fillRef")),
    effectReference: parseStyleReference(getChild(style, "a:effectRef")),
    fontReference: parseFontReference(getChild(style, "a:fontRef")),
  };
}
