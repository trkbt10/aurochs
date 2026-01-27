/**
 * @file Border Parser for styles.xml
 *
 * Parses border elements from the stylesheet (xl/styles.xml) of XLSX files.
 * Border definitions specify cell border styling including line styles and colors
 * for each edge of a cell.
 *
 * Note: styles.xml always contains at least one default border (index 0)
 * with all edges set to none.
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border)
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */

import type {
  XlsxBorder,
  XlsxBorderEdge,
  XlsxBorderStyle,
} from "../../domain/style/border";
import { parseBooleanAttr } from "../primitive";
import { parseColor } from "./font";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getChildren } from "@oxen/xml";

// =============================================================================
// Border Edge Parsing
// =============================================================================

/**
 * Parse a single border edge element.
 *
 * Border edges (left, right, top, bottom, diagonal) contain:
 * - style attribute: The line style (thin, medium, thick, etc.)
 * - color child element: The color specification
 *
 * @param edgeElement - The edge element (e.g., <left>, <right>, <top>, <bottom>, <diagonal>)
 * @returns The parsed border edge or undefined if no style or style is "none"
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border child elements)
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 *
 * @example
 * ```xml
 * <left style="thin">
 *   <color indexed="64"/>
 * </left>
 * ```
 */
export function parseBorderEdge(
  edgeElement: XmlElement | undefined,
): XlsxBorderEdge | undefined {
  if (!edgeElement) {
    return undefined;
  }

  const style = getAttr(edgeElement, "style") as XlsxBorderStyle | undefined;
  if (!style || style === "none") {
    return undefined;
  }

  const colorEl = getChild(edgeElement, "color");
  const color = colorEl ? parseColor(colorEl) : undefined;

  return { style, color };
}

// =============================================================================
// Border Parsing
// =============================================================================

/**
 * Parse a single border element.
 *
 * A border element contains:
 * - Edge child elements: left, right, top, bottom, diagonal
 * - Attributes: diagonalUp, diagonalDown, outline
 *
 * @param borderElement - The <border> element from styles.xml
 * @returns The parsed border definition
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border)
 *
 * @example
 * ```xml
 * <border diagonalUp="1" diagonalDown="0">
 *   <left style="thin">
 *     <color indexed="64"/>
 *   </left>
 *   <right style="thin">
 *     <color indexed="64"/>
 *   </right>
 *   <top style="thin">
 *     <color indexed="64"/>
 *   </top>
 *   <bottom style="thin">
 *     <color indexed="64"/>
 *   </bottom>
 *   <diagonal/>
 * </border>
 * ```
 */
export function parseBorder(borderElement: XmlElement): XlsxBorder {
  const left = parseBorderEdge(getChild(borderElement, "left"));
  const right = parseBorderEdge(getChild(borderElement, "right"));
  const top = parseBorderEdge(getChild(borderElement, "top"));
  const bottom = parseBorderEdge(getChild(borderElement, "bottom"));
  const diagonal = parseBorderEdge(getChild(borderElement, "diagonal"));

  const diagonalUp = parseBooleanAttr(getAttr(borderElement, "diagonalUp"));
  const diagonalDown = parseBooleanAttr(getAttr(borderElement, "diagonalDown"));
  const outline = parseBooleanAttr(getAttr(borderElement, "outline"));

  return {
    left,
    right,
    top,
    bottom,
    diagonal,
    diagonalUp,
    diagonalDown,
    outline,
  };
}

// =============================================================================
// Borders Collection Parsing
// =============================================================================

/**
 * Parse all border elements from the borders collection.
 *
 * @param bordersElement - The <borders> element from styles.xml
 * @returns Array of parsed border definitions
 *
 * @see ECMA-376 Part 4, Section 18.8.5 (borders)
 *
 * @example
 * ```xml
 * <borders count="2">
 *   <border>
 *     <left/>
 *     <right/>
 *     <top/>
 *     <bottom/>
 *     <diagonal/>
 *   </border>
 *   <border>
 *     <left style="thin">
 *       <color indexed="64"/>
 *     </left>
 *     <right style="thin">
 *       <color indexed="64"/>
 *     </right>
 *     <top style="thin">
 *       <color indexed="64"/>
 *     </top>
 *     <bottom style="thin">
 *       <color indexed="64"/>
 *     </bottom>
 *     <diagonal/>
 *   </border>
 * </borders>
 * ```
 */
export function parseBorders(bordersElement: XmlElement): readonly XlsxBorder[] {
  const result: XlsxBorder[] = [];
  const borderElements = getChildren(bordersElement, "border");
  for (const borderEl of borderElements) {
    result.push(parseBorder(borderEl));
  }
  return result;
}
