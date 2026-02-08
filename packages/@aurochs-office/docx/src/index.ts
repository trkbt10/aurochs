/**
 * @file DOCX Module Index
 *
 * Main entry point for DOCX parsing and serialization.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

// Constants
export {
  NS_WORDPROCESSINGML,
  NS_DRAWINGML,
  NS_DRAWINGML_PICTURE,
  NS_DRAWINGML_WORDPROCESSING,
  NS_RELATIONSHIPS,
  NS_CONTENT_TYPES,
  NS_PACKAGE_RELATIONSHIPS,
  NS_VML,
  NS_VML_OFFICE,
  NS_VML_WORD,
  NS_MATH,
  NAMESPACE_PREFIXES,
  RELATIONSHIP_TYPES,
  CONTENT_TYPES,
  DEFAULT_PART_PATHS,
} from "./constants";

// =============================================================================
// Domain
// =============================================================================

// Types
export type {
  DocxStyleId,
  DocxAbstractNumId,
  DocxNumId,
  DocxIlvl,
  BookmarkId,
  CommentId,
  NoteId,
  DocxRelId,
  Twips,
  HalfPoints,
  SignedTwips,
  DocxRowIndex,
  DocxCellIndex,
  HeaderFooterType,
  SectionBreakType,
} from "./domain/types";

export {
  docxStyleId,
  docxAbstractNumId,
  docxNumId,
  docxIlvl,
  bookmarkId,
  commentId,
  noteId,
  docxRelId,
  twips,
  halfPoints,
  signedTwips,
  docxRowIndex,
  docxCellIndex,
  twipsToPixels,
  twipsToPoints,
  halfPointsToPoints,
} from "./domain/types";

// Run types
export type {
  DocxRunFonts,
  DocxThemeFont,
  DocxColor,
  DocxThemeColor,
  DocxShading,
  DocxShadingPattern,
  DocxRunBorder,
  DocxUnderline,
  DocxHighlightColor,
  DocxVerticalAlignRun,
  DocxRunProperties,
  DocxEastAsianLayout,
  DocxText,
  DocxTab,
  DocxBreak,
  DocxSymbol,
  DocxRunContent,
  DocxRun,
} from "./domain/run";

// Paragraph types
export type {
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorderEdge,
  DocxParagraphBorders,
  DocxTabStop,
  DocxTabStops,
  DocxNumberingProperties,
  DocxFrameProperties,
  DocxOutlineLevel,
  DocxParagraphProperties,
  DocxParagraphPropertiesChange,
  DocxHyperlink,
  DocxBookmarkStart,
  DocxBookmarkEnd,
  DocxCommentRangeStart,
  DocxCommentRangeEnd,
  DocxParagraphContent,
  DocxParagraph,
} from "./domain/paragraph";

// Table types
export type {
  DocxTableBorderEdge,
  DocxTableBorders,
  DocxCellBorders,
  DocxCellWidth,
  DocxTableCellProperties,
  DocxTableCell,
  DocxRowHeight,
  DocxTableRowProperties,
  DocxTableRow,
  DocxTablePositioning,
  DocxTableCellSpacing,
  DocxTableProperties,
  DocxTableLook,
  DocxTableGrid,
  DocxTable,
} from "./domain/table";

// Section types
export type {
  DocxPageSize,
  DocxPageMargins,
  DocxPageBorderEdge,
  DocxPageBorders,
  DocxColumn,
  DocxColumns,
  DocxHeaderFooterRef,
  DocxLineNumbering,
  DocxPageNumberFormat,
  DocxPageNumberType,
  DocxDocGridType,
  DocxDocGrid,
  DocxVerticalJc,
  DocxFormProt,
  DocxSectionProperties,
  DocxNotePr,
} from "./domain/section";

// Style types
export type {
  DocxStyleType,
  DocxStyleName,
  DocxStyleAliases,
  DocxStyleBasedOn,
  DocxStyleNext,
  DocxStyleLink,
  DocxStyleUiPriority,
  DocxStyle,
  DocxTableStylePr,
  DocxTableStyleType,
  DocxRunPropertiesDefault,
  DocxParagraphPropertiesDefault,
  DocxDocDefaults,
  DocxLatentStyleException,
  DocxLatentStyles,
  DocxStyles,
} from "./domain/styles";

// Numbering types
export type {
  DocxLevelJustification,
  DocxLevelText,
  DocxLevelPicBullet,
  DocxLevel,
  DocxLegacy,
  DocxAbstractNum,
  DocxLevelOverride,
  DocxNum,
  DocxNumPicBullet,
  DocxNumbering,
} from "./domain/numbering";

// Document types
export type {
  DocxSectionBreak,
  DocxBlockContent,
  DocxBody,
  DocxCompatSettings,
  DocxZoom,
  DocxSettings,
  DocxDocumentProtection,
  DocxThemeFontLang,
  DocxHeader,
  DocxFooter,
  DocxComment,
  DocxComments,
  DocxNoteType,
  DocxFootnote,
  DocxEndnote,
  DocxFootnotes,
  DocxEndnotes,
  DocxRelationship,
  DocxRelationships,
  DocxDocument,
} from "./domain/document";

// ECMA-376 specification defaults
export {
  TWIPS_PER_POINT,
  HALF_POINTS_PER_POINT,
  EMU_PER_INCH,
  TWIPS_PER_INCH,
  POINTS_PER_INCH,
  PIXELS_PER_INCH,
  PT_TO_PX,
  TWIPS_TO_PX,
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  SPEC_DEFAULT_FONT_SIZE_HALF_POINTS,
  SPEC_DEFAULT_FONT_SIZE_PT,
  SPEC_DEFAULT_TEXT_DIRECTION,
  SPEC_DEFAULT_TAB_STOP_TWIPS,
  SPEC_DEFAULT_LINE_SPACING_VALUE,
  twipsToPx,
  twipsToPt,
  halfPointsToPt,
  ptToPx,
} from "./domain/ecma376-defaults";
export type { EcmaTextDirection } from "./domain/ecma376-defaults";

// =============================================================================
// Parser
// =============================================================================

export { createParseContext, createEmptyParseContext, type DocxParseContext, type ParseContextConfig } from "./parser/context";

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
} from "./parser/primitive";

export {
  parseRunFonts,
  parseColor,
  parseShading,
  parseRunBorder,
  parseUnderline,
  parseRunProperties,
  parseRun,
} from "./parser/run";

export { parseParagraphProperties, parseParagraph } from "./parser/paragraph";
export { parseTable } from "./parser/table";
export { parseStyles } from "./parser/styles";
export { parseNumbering } from "./parser/numbering";
export { parseSectionProperties } from "./parser/section";
export { parseBody, parseDocument } from "./parser/document";

// Document loader
export { loadDocx, loadDocxFromFile, type LoadDocxOptions } from "./document-parser";
