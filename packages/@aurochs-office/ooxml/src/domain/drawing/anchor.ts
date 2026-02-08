/**
 * @file Anchor types for DrawingML - SpreadsheetML Drawing
 *
 * @see ECMA-376 Part 1, Section 20.5 - SpreadsheetML Drawing
 */

import type { EMU } from "@aurochs-office/drawing-ml/domain/units";
import type { Point2D, Size2D } from "./position";

// =============================================================================
// Spreadsheet Anchor Types
// =============================================================================

/**
 * Spreadsheet drawing marker
 * @see ECMA-376 Part 1, Section 20.5.2.15 (from)
 */
export type CellMarker = {
  readonly col: number;
  readonly row: number;
  readonly colOff?: EMU;
  readonly rowOff?: EMU;
};

/**
 * Spreadsheet drawing client data
 * @see ECMA-376 Part 1, Section 20.5.2.3 (clientData)
 */
export type AnchorClientData = {
  readonly locksWithSheet?: boolean;
  readonly printsWithSheet?: boolean;
};

/**
 * Absolute anchor for spreadsheet drawings
 * @see ECMA-376 Part 1, Section 20.5.2.1 (absoluteAnchor)
 */
export type AbsoluteAnchor = {
  readonly position: Point2D;
  readonly size: Size2D;
};

/**
 * One cell anchor
 * @see ECMA-376 Part 1, Section 20.5.2.24 (oneCellAnchor)
 */
export type OneCellAnchor = {
  readonly from: CellMarker;
  readonly size: Size2D;
  readonly clientData?: AnchorClientData;
};

/**
 * Two cell anchor
 * @see ECMA-376 Part 1, Section 20.5.2.33 (twoCellAnchor)
 */
export type TwoCellAnchor = {
  readonly from: CellMarker;
  readonly to: CellMarker;
  readonly clientData?: AnchorClientData;
};

/**
 * Spreadsheet anchor resize behavior
 * @see ECMA-376 Part 1, Section 20.5.3.2 (ST_EditAs)
 */
export type EditAs = "twoCell" | "oneCell" | "absolute";
