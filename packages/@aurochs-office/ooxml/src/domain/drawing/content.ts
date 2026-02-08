/**
 * @file Content types for DrawingML - WordprocessingML Drawing
 *
 * @see ECMA-376 Part 1, Section 20.4 - WordprocessingML Drawing
 */

import type { RelationshipId } from "./relationship";

// =============================================================================
// BlackWhiteMode
// =============================================================================

/**
 * Black and white mode for content part
 * @see ECMA-376 Part 1, Section 20.1.10.10 (ST_BlackWhiteMode)
 */
export type BlackWhiteMode =
  | "clr"
  | "auto"
  | "gray"
  | "ltGray"
  | "invGray"
  | "grayWhite"
  | "blackGray"
  | "blackWhite"
  | "black"
  | "white"
  | "hidden";

// =============================================================================
// Content Types
// =============================================================================

/**
 * Content part reference
 * @see ECMA-376 Part 1, Section 20.4.2.29 (contentPart)
 */
export type ContentPart = {
  readonly id: RelationshipId;
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

// =============================================================================
// Connection Types
// =============================================================================

/**
 * Connection target for connector shapes
 * @see ECMA-376 Part 1, Section 20.1.2.2.38 (stCxn, endCxn)
 */
export type ConnectionTarget = {
  readonly shapeId: string;
  readonly siteIndex: number;
};
