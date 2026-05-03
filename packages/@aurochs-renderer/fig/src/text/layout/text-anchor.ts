/**
 * @file Shared text-anchor mapping.
 */

import type { TextAlignHorizontal } from "./types";

export type TextAnchor = "start" | "middle" | "end";

/** Map Figma horizontal text alignment to SVG-compatible text-anchor. */
export function textAlignHorizontalToAnchor(align: TextAlignHorizontal | string | undefined): TextAnchor {
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
