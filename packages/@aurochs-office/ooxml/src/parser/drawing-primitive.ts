/**
 * @file Drawing primitive parsing utilities
 *
 * Re-exports shared primitives from drawing-ml and provides
 * OOXML-specific parsing functions that return EMU values without conversion.
 *
 * @see ECMA-376 Part 1, Section 20.1.10 (Simple Types)
 * @see ECMA-376 Part 1, Section 20.4.3 (WordprocessingML Drawing Simple Types)
 * @see ECMA-376 Part 1, Section 20.5.3 (SpreadsheetML Drawing Simple Types)
 */

import type { EMU } from "@aurochs-office/drawing-ml/domain/units";
import type { AlignH, AlignV, RelFromH, RelFromV } from "../domain/drawing/position";
import type { EditAs } from "../domain/drawing/anchor";
import type { WrapText } from "../domain/drawing/wrap";
import type { BlackWhiteMode } from "../domain/drawing/content";
import { emu } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Re-export shared primitives from drawing-ml
// =============================================================================

export {
  parseInt32,
  parseInt64,
  parseUnsignedInt,
  parseBoolean,
  getBoolAttr,
  getIntAttr,
} from "@aurochs-office/drawing-ml/parser";

// =============================================================================
// EMU Parsing (returns EMU, not Pixels)
//
// These functions differ from drawing-ml's parseEmu() which converts to Pixels.
// OOXML anchoring/positioning often requires raw EMU values for precise layout.
// =============================================================================

// Import for internal use
import { parseInt32, parseInt64, parseUnsignedInt } from "@aurochs-office/drawing-ml/parser";

/**
 * Parse EMU coordinate value (returns EMU as-is)
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 */
export function parseEmuValue(value: string | undefined): EMU | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return emu(num);
}

/**
 * Parse coordinate (long EMU with bounds) - returns EMU
 * @see ECMA-376 Part 1, Section 20.1.10.19 (ST_CoordinateUnqualified)
 */
export function parseCoordinateUnqualified(value: string | undefined): EMU | undefined {
  const num = parseInt64(value);
  if (num === undefined) {
    return undefined;
  }
  if (num < -27273042329600 || num > 27273042316900) {
    return undefined;
  }
  return emu(num);
}

/**
 * Parse positive coordinate - returns EMU
 * @see ECMA-376 Part 1, Section 20.1.10.42 (ST_PositiveCoordinate)
 */
export function parsePositiveCoordinate(value: string | undefined): EMU | undefined {
  const num = parseInt64(value);
  if (num === undefined) {
    return undefined;
  }
  if (num < 0 || num > 27273042316900) {
    return undefined;
  }
  return emu(num);
}

/**
 * Parse position offset in EMUs
 * @see ECMA-376 Part 1, Section 20.4.3.3 (ST_PositionOffset)
 */
export function parsePositionOffset(value: string | undefined): EMU | undefined {
  return parseEmuValue(value);
}

/**
 * Parse wrap distance in EMUs (unsigned)
 * @see ECMA-376 Part 1, Section 20.4.3.6 (ST_WrapDistance)
 */
export function parseWrapDistance(value: string | undefined): EMU | undefined {
  const num = parseUnsignedInt(value);
  if (num === undefined) {
    return undefined;
  }
  return emu(num);
}

// =============================================================================
// OOXML-specific Alignment Enums (Section 20.4)
// =============================================================================

/**
 * Parse relative horizontal alignment
 * @see ECMA-376 Part 1, Section 20.4.3.1 (ST_AlignH)
 */
export function parseAlignH(value: string | undefined): AlignH | undefined {
  switch (value) {
    case "left":
    case "right":
    case "center":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse relative vertical alignment
 * @see ECMA-376 Part 1, Section 20.4.3.2 (ST_AlignV)
 */
export function parseAlignV(value: string | undefined): AlignV | undefined {
  switch (value) {
    case "top":
    case "bottom":
    case "center":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// OOXML-specific Relative Positioning Enums (Section 20.4)
// =============================================================================

/**
 * Parse horizontal relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.4 (ST_RelFromH)
 */
export function parseRelFromH(value: string | undefined): RelFromH | undefined {
  switch (value) {
    case "character":
    case "column":
    case "insideMargin":
    case "leftMargin":
    case "margin":
    case "outsideMargin":
    case "page":
    case "rightMargin":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse vertical relative positioning base
 * @see ECMA-376 Part 1, Section 20.4.3.5 (ST_RelFromV)
 */
export function parseRelFromV(value: string | undefined): RelFromV | undefined {
  switch (value) {
    case "bottomMargin":
    case "insideMargin":
    case "line":
    case "margin":
    case "outsideMargin":
    case "page":
    case "paragraph":
    case "topMargin":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// OOXML-specific Wrap/Anchor Enums (Section 20.4, 20.5)
// =============================================================================

/**
 * Parse wrap text location
 * @see ECMA-376 Part 1, Section 20.4.3.7 (ST_WrapText)
 */
export function parseWrapText(value: string | undefined): WrapText | undefined {
  switch (value) {
    case "bothSides":
    case "left":
    case "right":
    case "largest":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse editAs behavior
 * @see ECMA-376 Part 1, Section 20.5.3.2 (ST_EditAs)
 */
export function parseEditAs(value: string | undefined): EditAs | undefined {
  switch (value) {
    case "twoCell":
    case "oneCell":
    case "absolute":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// OOXML-specific Black/White Mode (Section 20.1)
// =============================================================================

/**
 * Parse black/white mode
 * @see ECMA-376 Part 1, Section 20.1.10.10 (ST_BlackWhiteMode)
 */
export function parseBlackWhiteMode(value: string | undefined): BlackWhiteMode | undefined {
  switch (value) {
    case "clr":
    case "auto":
    case "gray":
    case "ltGray":
    case "invGray":
    case "grayWhite":
    case "blackGray":
    case "blackWhite":
    case "black":
    case "white":
    case "hidden":
      return value;
    default:
      return undefined;
  }
}
