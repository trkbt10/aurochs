/**
 * @file Positioning types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.4 - WordprocessingML Drawing
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type { EffectExtent, Point } from "./geometry";

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
 * Horizontal positioning for floating objects
 * @see ECMA-376 Part 1, Section 20.4.2.10 (positionH)
 */
export type PositionH = {
  readonly relativeFrom: RelFromH;
  readonly align?: AlignH;
  readonly offset?: Pixels;
};

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
 * Vertical positioning for floating objects
 * @see ECMA-376 Part 1, Section 20.4.2.11 (positionV)
 */
export type PositionV = {
  readonly relativeFrom: RelFromV;
  readonly align?: AlignV;
  readonly offset?: Pixels;
};

// =============================================================================
// Text Wrapping Types
// =============================================================================

/**
 * Wrapping polygon definition
 * @see ECMA-376 Part 1, Section 20.4.2.16 (wrapPolygon)
 */
export type WrapPolygon = {
  readonly edited?: boolean;
  readonly start: Point;
  readonly lineTo: readonly Point[];
};

/**
 * Text wrapping location for floating objects
 * @see ECMA-376 Part 1, Section 20.4.3.7 (ST_WrapText)
 */
export type WrapText = "bothSides" | "left" | "right" | "largest";

/**
 * Wrap distance from text (EMUs -> pixels)
 * @see ECMA-376 Part 1, Section 20.4.3.6 (ST_WrapDistance)
 */
export type WrapDistance = Pixels;

/**
 * Square wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.17 (wrapSquare)
 */
export type WrapSquare = {
  readonly wrapText: WrapText;
  readonly distTop?: WrapDistance;
  readonly distBottom?: WrapDistance;
  readonly distLeft?: WrapDistance;
  readonly distRight?: WrapDistance;
  readonly effectExtent?: EffectExtent;
};

/**
 * Through wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.18 (wrapThrough)
 */
export type WrapThrough = {
  readonly wrapText: WrapText;
  readonly distLeft?: WrapDistance;
  readonly distRight?: WrapDistance;
  readonly polygon: WrapPolygon;
};

/**
 * Tight wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.19 (wrapTight)
 */
export type WrapTight = {
  readonly wrapText: WrapText;
  readonly distLeft?: WrapDistance;
  readonly distRight?: WrapDistance;
  readonly polygon: WrapPolygon;
};

/**
 * Top and bottom wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.20 (wrapTopAndBottom)
 */
export type WrapTopAndBottom = {
  readonly distTop?: WrapDistance;
  readonly distBottom?: WrapDistance;
};
