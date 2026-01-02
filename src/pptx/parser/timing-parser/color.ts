/**
 * @file Color value parsing for animation timing.
 */

import { getAttr, getChild, type XmlElement } from "../../../xml";

/**
 * Parse color value from element.
 */
export function parseColorValue(element: XmlElement): string | undefined {
  // Try srgbClr first
  const srgbClr = getChild(element, "a:srgbClr");
  if (srgbClr) {
    return getAttr(srgbClr, "val");
  }
  // Try schemeClr
  const schemeClr = getChild(element, "a:schemeClr");
  if (schemeClr) {
    return getAttr(schemeClr, "val");
  }
  // Try hsl
  const hsl = getChild(element, "p:hsl");
  if (hsl) {
    const h = getAttr(hsl, "h") ?? "0";
    const s = getAttr(hsl, "s") ?? "0";
    const l = getAttr(hsl, "l") ?? "0";
    return `hsl(${h},${s},${l})`;
  }
  // Try rgb
  const rgb = getChild(element, "p:rgb");
  if (rgb) {
    const r = getAttr(rgb, "r") ?? "0";
    const g = getAttr(rgb, "g") ?? "0";
    const b = getAttr(rgb, "b") ?? "0";
    return `rgb(${r},${g},${b})`;
  }
  return undefined;
}
