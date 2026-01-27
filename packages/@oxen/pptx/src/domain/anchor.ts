/**
 * @file Anchor types for PPTX/SpreadsheetML processing
 *
 * @see ECMA-376 Part 1, Section 20.5 - SpreadsheetML Drawing
 * @see ECMA-376 Part 1, Section 20.4 - WordprocessingML Drawing
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type { Point, Size } from "./geometry";
import type { ResourceId } from "./resource";
import type { BlackWhiteMode } from "./appearance";

// =============================================================================
// Spreadsheet Anchor Types
// =============================================================================

/**
 * Absolute anchor for spreadsheet drawings
 * @see ECMA-376 Part 1, Section 20.5.2.1 (absoluteAnchor)
 */
export type AbsoluteAnchor = {
  readonly position: Point;
  readonly size: Size;
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
 * Spreadsheet drawing marker
 * @see ECMA-376 Part 1, Section 20.5.2.15 (from)
 */
export type AnchorMarker = {
  readonly col: number;
  readonly row: number;
  readonly colOff?: Pixels;
  readonly rowOff?: Pixels;
};

/**
 * One cell anchor
 * @see ECMA-376 Part 1, Section 20.5.2.24 (oneCellAnchor)
 */
export type OneCellAnchor = {
  readonly from: AnchorMarker;
  readonly size: Size;
  readonly clientData?: AnchorClientData;
};

/**
 * Two cell anchor
 * @see ECMA-376 Part 1, Section 20.5.2.33 (twoCellAnchor)
 */
export type TwoCellAnchor = {
  readonly from: AnchorMarker;
  readonly to: AnchorMarker;
  readonly clientData?: AnchorClientData;
};

/**
 * Spreadsheet anchor resize behavior
 * @see ECMA-376 Part 1, Section 20.5.3.2 (ST_EditAs)
 */
export type EditAs = "twoCell" | "oneCell" | "absolute";

// =============================================================================
// WordprocessingML Content Types
// =============================================================================

/**
 * Content part reference (WordprocessingML)
 * @see ECMA-376 Part 1, Section 20.4.2.29 (contentPart)
 */
export type ContentPart = {
  readonly id: ResourceId;
  readonly bwMode?: BlackWhiteMode;
};

/**
 * Linked textbox information
 * @see ECMA-376 Part 1, Section 20.4.2.34 (linkedTxbx)
 */
export type LinkedTextbox = {
  readonly id: number;
  readonly seq: number;
};

/**
 * Textbox story info (first in sequence)
 * @see ECMA-376 Part 1, Section 20.4.2.37 (txbx)
 */
export type TextboxInfo = {
  readonly id: number;
};
