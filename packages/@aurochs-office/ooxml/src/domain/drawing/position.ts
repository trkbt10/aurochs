/**
 * @file Positioning types for DrawingML - WordprocessingML Drawing
 *
 * @see ECMA-376 Part 1, Section 20.4 - WordprocessingML Drawing
 */

import type { EMU } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Alignment Types
// =============================================================================

/**
 * Relative horizontal alignment positions
 * @see ECMA-376 Part 1, Section 20.4.3.1 (ST_AlignH)
 */
export type AlignH = "left" | "right" | "center" | "inside" | "outside";

/**
 * Vertical alignment definition
 * @see ECMA-376 Part 1, Section 20.4.3.2 (ST_AlignV)
 */
export type AlignV = "top" | "bottom" | "center" | "inside" | "outside";

// =============================================================================
// Relative Positioning Types
// =============================================================================

/**
 * Horizontal relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.4 (ST_RelFromH)
 */
export type RelFromH =
  | "character"
  | "column"
  | "insideMargin"
  | "leftMargin"
  | "margin"
  | "outsideMargin"
  | "page"
  | "rightMargin";

/**
 * Vertical relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.5 (ST_RelFromV)
 */
export type RelFromV =
  | "bottomMargin"
  | "insideMargin"
  | "line"
  | "margin"
  | "outsideMargin"
  | "page"
  | "paragraph"
  | "topMargin";

/**
 * Horizontal positioning for floating objects
 * @see ECMA-376 Part 1, Section 20.4.2.10 (positionH)
 */
export type PositionH = {
  readonly relativeFrom: RelFromH;
  readonly align?: AlignH;
  readonly offset?: EMU;
};

/**
 * Vertical positioning for floating objects
 * @see ECMA-376 Part 1, Section 20.4.2.11 (positionV)
 */
export type PositionV = {
  readonly relativeFrom: RelFromV;
  readonly align?: AlignV;
  readonly offset?: EMU;
};

/**
 * 2D point in EMUs
 */
export type Point2D = {
  readonly x: EMU;
  readonly y: EMU;
};

/**
 * 2D size in EMUs
 */
export type Size2D = {
  readonly cx: EMU;
  readonly cy: EMU;
};
