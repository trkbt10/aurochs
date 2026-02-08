/**
 * @file OOXML parser public exports
 *
 * Shared primitives (parseInt32, parseBoolean, etc.) are re-exported from
 * @aurochs-office/drawing-ml/parser. OOXML-specific functions (EMU parsing,
 * alignment enums, etc.) are defined in drawing-primitive.ts.
 *
 * DrawingML-specific parsing (color, fill, line) should be imported directly
 * from @aurochs-office/drawing-ml/parser.
 */

export type { OoxmlTextReader } from "./relationships";
export {
  resolvePartPath,
  getRelationshipPath,
  parseRelationships,
  parseRelationshipsFromText,
  loadRelationships,
} from "./relationships";

// Drawing primitive parsing (returns EMU values)
export {
  parseInt32,
  parseInt64,
  parseUnsignedInt,
  parseBoolean,
  getBoolAttr,
  getIntAttr,
  parseEmuValue,
  parseCoordinateUnqualified,
  parsePositiveCoordinate,
  parsePositionOffset,
  parseWrapDistance,
  parseAlignH,
  parseAlignV,
  parseRelFromH,
  parseRelFromV,
  parseWrapText,
  parseEditAs,
  parseBlackWhiteMode,
} from "./drawing-primitive";

// WordprocessingML Drawing parsing (Section 20.4)
export {
  parseAlignHElement,
  parseAlignVElement,
  parseEffectExtentElement,
  parsePositionHElement,
  parsePositionVElement,
  parsePosOffsetElement,
  parseSimplePosElement,
  parseWrapNoneElement,
  parseWrapPolygonElement,
  parseWrapSquareElement,
  parseWrapThroughElement,
  parseWrapTightElement,
  parseWrapTopAndBottomElement,
  parseCNvCnPrElement,
  parseCNvContentPartPrElement,
  parseCNvFrPrElement,
  parseCNvGrpSpPrElement,
  parseCxnSpLocksElement as parseWpCxnSpLocksElement,
  parseCNvSpPrElement as parseWpCNvSpPrElement,
  parseContentPartElement as parseWpContentPartElement,
  parseLinkedTxbxElement,
  parseTxbxElement,
  parseTxbxContentElement,
  parseWgpElement,
  parseWpcElement,
  parseWspElement,
} from "./wp-drawing";

// SpreadsheetML Drawing parsing (Section 20.5)
export {
  parseAbsoluteAnchorElement,
  parseClientDataElement,
  parseCNvGraphicFramePrElement,
  parseCNvGrpSpPrElement as parseXdrCNvGrpSpPrElement,
  parseCNvSpPrElement as parseXdrCNvSpPrElement,
  parseCxnSpLocksElement as parseXdrCxnSpLocksElement,
  parseColOffElement,
  parseRowOffElement,
  parseContentPartElement as parseXdrContentPartElement,
  parseOneCellAnchorElement,
  parseTwoCellAnchorElement,
  parseWsDrElement,
} from "./xdr-drawing";
