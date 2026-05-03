/**
 * @file SVG-specific text alignment (getTextAnchor)
 *
 * Shared alignment math (getAlignedX, getAlignedYWithMetrics) is in text/layout/alignment.ts.
 */

import type { TextAlignHorizontal } from "../../../text/layout/types";
import { textAlignHorizontalToAnchor } from "../../../text/layout/text-anchor";

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
  return textAlignHorizontalToAnchor(align);
}
