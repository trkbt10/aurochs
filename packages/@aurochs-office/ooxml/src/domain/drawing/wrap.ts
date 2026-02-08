/**
 * @file Text wrapping types for DrawingML - WordprocessingML Drawing
 *
 * @see ECMA-376 Part 1, Section 20.4 - WordprocessingML Drawing
 */

import type { EMU } from "@aurochs-office/drawing-ml/domain/units";
import type { DrawingEffectExtent } from "./extent";
import type { Point2D } from "./position";

// =============================================================================
// Text Wrapping Types
// =============================================================================

/**
 * Text wrapping location for floating objects
 * @see ECMA-376 Part 1, Section 20.4.3.7 (ST_WrapText)
 */
export type WrapText = "bothSides" | "left" | "right" | "largest";

/**
 * Wrapping polygon definition
 * @see ECMA-376 Part 1, Section 20.4.2.16 (wrapPolygon)
 */
export type WrapPolygon = {
  readonly edited?: boolean;
  readonly start: Point2D;
  readonly lineTo: readonly Point2D[];
};

/**
 * Square wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.17 (wrapSquare)
 */
export type WrapSquare = {
  readonly wrapText: WrapText;
  readonly distT?: EMU;
  readonly distB?: EMU;
  readonly distL?: EMU;
  readonly distR?: EMU;
  readonly effectExtent?: DrawingEffectExtent;
};

/**
 * Through wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.18 (wrapThrough)
 */
export type WrapThrough = {
  readonly wrapText: WrapText;
  readonly distL?: EMU;
  readonly distR?: EMU;
  readonly polygon: WrapPolygon;
};

/**
 * Tight wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.19 (wrapTight)
 */
export type WrapTight = {
  readonly wrapText: WrapText;
  readonly distL?: EMU;
  readonly distR?: EMU;
  readonly polygon: WrapPolygon;
};

/**
 * Top and bottom wrapping specification
 * @see ECMA-376 Part 1, Section 20.4.2.20 (wrapTopAndBottom)
 */
export type WrapTopAndBottom = {
  readonly distT?: EMU;
  readonly distB?: EMU;
};
