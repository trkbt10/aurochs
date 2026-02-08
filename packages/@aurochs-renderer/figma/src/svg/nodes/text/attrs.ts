/**
 * @file SVG text attribute building
 */

import type { text } from "../../primitives";
import type { ExtractedTextProps } from "../../../text/layout/types";
import { getAlignedX, getAlignedY } from "../../../text/layout/alignment";
import { getTextAnchor } from "./alignment";

/**
 * SVG text element attributes
 */
export type SvgTextAttrs = Parameters<typeof text>[0];

/**
 * Build SVG text attributes from extracted props
 *
 * Creates the attribute object for an SVG <text> element
 * including position, font, color, and alignment.
 *
 * @param props - Extracted text properties
 * @param fillColor - Resolved fill color (hex)
 * @param fillOpacity - Fill opacity (0-1)
 * @param lineCount - Number of text lines (for vertical alignment)
 * @returns Attributes for SVG text element
 */
export function buildTextAttrs(
  props: ExtractedTextProps,
  fillColor: string,
  fillOpacity: number,
  lineCount: number
): SvgTextAttrs {
  const textAnchor = getTextAnchor(props.textAlignHorizontal);
  const x = getAlignedX(props.textAlignHorizontal, props.size?.width);
  const y = getAlignedY(
    props.textAlignVertical,
    props.size?.height,
    props.fontSize,
    lineCount,
    props.lineHeight
  );

  return {
    x,
    y,
    fill: fillColor,
    "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
    "font-family": props.fontFamily,
    "font-size": props.fontSize,
    "font-weight": props.fontWeight,
    "font-style": props.fontStyle,
    "letter-spacing": props.letterSpacing,
    "text-anchor": textAnchor !== "start" ? textAnchor : undefined,
  };
}
