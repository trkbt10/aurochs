/**
 * @file SVG-specific text alignment (getTextAnchor)
 *
 * Shared alignment math (getAlignedX, getAlignedYWithMetrics) is in text/layout/alignment.ts.
 */

import type { TextAlignHorizontal } from "../../../text/layout/types";

/**
 * SVG text-anchor values
 */
export type SvgTextAnchor = "start" | "middle" | "end";

/**
 * Map horizontal alignment to SVG text-anchor
 *
 * @param align - Figma horizontal alignment
 * @returns SVG text-anchor value
 */
export function getTextAnchor(align: TextAlignHorizontal): SvgTextAnchor {
  switch (align) {
    case "CENTER":
      return "middle";
    case "RIGHT":
      return "end";
    case "LEFT":
    case "JUSTIFIED":
    default:
      return "start";
  }
}
