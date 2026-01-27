/**
 * @file DOCX Domain Types Index
 *
 * Re-exports all DOCX domain types for convenient access.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

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
} from "./types";

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
} from "./types";

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
} from "./run";

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
} from "./paragraph";

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
} from "./table";

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
} from "./section";

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
} from "./styles";

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
} from "./numbering";

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
} from "./document";

// ECMA-376 specification defaults
export {
  // Unit conversion constants
  TWIPS_PER_POINT,
  HALF_POINTS_PER_POINT,
  EMU_PER_INCH,
  TWIPS_PER_INCH,
  POINTS_PER_INCH,
  PIXELS_PER_INCH,
  PT_TO_PX,
  TWIPS_TO_PX,
  // Page defaults
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  // Font defaults
  SPEC_DEFAULT_FONT_SIZE_HALF_POINTS,
  SPEC_DEFAULT_FONT_SIZE_PT,
  // Text direction defaults
  SPEC_DEFAULT_TEXT_DIRECTION,
  // Tab stop defaults
  SPEC_DEFAULT_TAB_STOP_TWIPS,
  // Line spacing defaults
  SPEC_DEFAULT_LINE_SPACING_VALUE,
  // Conversion utilities
  twipsToPx,
  twipsToPt,
  halfPointsToPt,
  ptToPx,
} from "./ecma376-defaults";
export type { EcmaTextDirection } from "./ecma376-defaults";
