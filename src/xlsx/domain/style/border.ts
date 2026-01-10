/**
 * @file SpreadsheetML Border Type Definitions
 *
 * This module defines border-related types specific to SpreadsheetML (XLSX).
 * These types represent cell border formatting concepts as defined in ECMA-376.
 *
 * Note: styles.xml always contains at least one default border (index 0)
 * with all edges set to none.
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border)
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */

import type { XlsxColor } from "./font";

// =============================================================================
// XlsxBorderStyle Type
// =============================================================================

/**
 * Border style enumeration
 *
 * Defines the visual style of a border edge.
 *
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */
export type XlsxBorderStyle =
  | "none"
  | "thin"
  | "medium"
  | "thick"
  | "dashed"
  | "dotted"
  | "double"
  | "hair"
  | "mediumDashed"
  | "dashDot"
  | "mediumDashDot"
  | "dashDotDot"
  | "mediumDashDotDot"
  | "slantDashDot";

// =============================================================================
// XlsxBorderEdge Type
// =============================================================================

/**
 * Border edge definition
 *
 * Represents a single edge of a cell border with style and color.
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border child elements: left, right, top, bottom, diagonal)
 */
export type XlsxBorderEdge = {
  /** Border line style */
  readonly style: XlsxBorderStyle;

  /** Border color (optional) */
  readonly color?: XlsxColor;
};

// =============================================================================
// XlsxBorder Type
// =============================================================================

/**
 * SpreadsheetML border definition
 *
 * Represents a complete border specification for a cell, including
 * all four edges plus diagonal lines.
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border)
 *
 * Child elements:
 * - left: Left border (§18.8.5)
 * - right: Right border (§18.8.6)
 * - top: Top border (§18.8.7)
 * - bottom: Bottom border (§18.8.8)
 * - diagonal: Diagonal border
 *
 * Attributes:
 * - diagonalUp: Draw diagonal from bottom-left to top-right
 * - diagonalDown: Draw diagonal from top-left to bottom-right
 * - outline: Apply border to outline of range
 */
export type XlsxBorder = {
  /** Left border edge */
  readonly left?: XlsxBorderEdge;

  /** Right border edge */
  readonly right?: XlsxBorderEdge;

  /** Top border edge */
  readonly top?: XlsxBorderEdge;

  /** Bottom border edge */
  readonly bottom?: XlsxBorderEdge;

  /** Diagonal border edge */
  readonly diagonal?: XlsxBorderEdge;

  /**
   * Draw diagonal line from bottom-left to top-right
   * Only applicable when diagonal edge is defined
   */
  readonly diagonalUp?: boolean;

  /**
   * Draw diagonal line from top-left to bottom-right
   * Only applicable when diagonal edge is defined
   */
  readonly diagonalDown?: boolean;

  /**
   * Apply border to outline of cell range
   * Used primarily in conditional formatting contexts
   */
  readonly outline?: boolean;
};
