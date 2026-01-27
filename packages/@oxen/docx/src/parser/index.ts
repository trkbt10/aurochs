/**
 * @file DOCX Parser Index
 *
 * Re-exports all parser functions and types.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

// Context
export { createParseContext, createEmptyParseContext, type DocxParseContext, type ParseContextConfig } from "./context";

// Primitive parsing
export {
  parseInt32,
  parseInt32Or,
  parseFloat64,
  parseBoolean,
  parseBooleanOr,
  parseOnOff,
  parseTwips,
  parseTwipsToPixels,
  parseTwipsToPoints,
  parseSignedTwips,
  parseHalfPoints,
  parseHalfPointsToPoints,
  parseHalfPointsToPixels,
  parseEighthPoints,
  parseEighthPointsToPixels,
  parsePercentage50,
  parseDecimalPercentage,
  parseStyleId,
  parseNumId,
  parseAbstractNumId,
  parseIlvl,
  parseRelId,
  getTwipsAttr,
  getHalfPointsAttr,
  getBoolAttr,
  getBoolAttrOr,
  getIntAttr,
  getIntAttrOr,
  getStyleIdAttr,
  getRelIdAttr,
  getChildAttr,
  getChildVal,
  getChildBoolVal,
  getChildIntVal,
  hasChild,
  parseToggleChild,
} from "./primitive";

// Run parsing
export {
  parseRunFonts,
  parseColor,
  parseShading,
  parseRunBorder,
  parseUnderline,
  parseRunProperties,
  parseRun,
} from "./run";

// Paragraph parsing
export { parseParagraphProperties, parseParagraph } from "./paragraph";

// Table parsing
export { parseTable } from "./table";

// Styles parsing
export { parseStyles } from "./styles";

// Numbering parsing
export { parseNumbering } from "./numbering";

// Section parsing
export { parseSectionProperties } from "./section";

// Document parsing
export { parseBody, parseDocument } from "./document";
