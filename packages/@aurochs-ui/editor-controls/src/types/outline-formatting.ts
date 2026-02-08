/**
 * @file Generic outline/border formatting types
 *
 * OutlineFormatting represents a single line/stroke.
 * BorderEdges represents per-edge borders (used by table cells in DOCX/XLSX).
 */

export type OutlineFormatting = {
  /** Line width in points. */
  readonly width?: number;
  /** Line color as #RRGGBB hex string. */
  readonly color?: string;
  /** Dash style. */
  readonly style?: "solid" | "dashed" | "dotted" | "none";
};

export type BorderEdges = {
  readonly top?: OutlineFormatting;
  readonly bottom?: OutlineFormatting;
  readonly left?: OutlineFormatting;
  readonly right?: OutlineFormatting;
};
