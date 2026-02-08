/**
 * @file Generic table cell formatting type
 */

import type { BorderEdges } from "./outline-formatting";

export type VerticalAlignment = "top" | "center" | "bottom";

export type CellFormatting = {
  /** Vertical alignment of cell content. */
  readonly verticalAlignment?: VerticalAlignment;
  /** Background color as #RRGGBB hex string. */
  readonly backgroundColor?: string;
  /** Text wrapping within cell. */
  readonly wrapText?: boolean;
  /** Per-edge borders. */
  readonly borders?: BorderEdges;
};
