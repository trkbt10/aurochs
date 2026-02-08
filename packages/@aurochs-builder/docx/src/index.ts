/**
 * @file DOCX Serializer Index
 *
 * Exports all DOCX serialization functions.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

// Run serialization
export {
  serializeRunFonts,
  serializeColor,
  serializeShading,
  serializeUnderline,
  serializeRunBorder,
  serializeRunProperties,
  serializeRunContent,
  serializeRun,
} from "./run";

// Paragraph serialization
export {
  serializeSpacing,
  serializeIndent,
  serializeParagraphBorders,
  serializeTabStops,
  serializeNumberingProperties,
  serializeFrameProperties,
  serializeParagraphProperties,
  serializeHyperlink,
  serializeBookmarkStart,
  serializeBookmarkEnd,
  serializeParagraphContent,
  serializeParagraph,
} from "./paragraph";

// Table serialization
export {
  serializeTableWidth,
  serializeTableBorders,
  serializeTableCellMargins,
  serializeTableProperties,
  serializeTableGrid,
  serializeTableRowProperties,
  serializeTableCellBorders,
  serializeTableCellProperties,
  serializeTableCell,
  serializeTableRow,
  serializeTable,
} from "./table";

// Styles serialization
export {
  serializeDocDefaults,
  serializeLatentStyleException,
  serializeLatentStyles,
  serializeTableStylePr,
  serializeStyle,
  serializeStyles,
} from "./styles";

// Numbering serialization
export {
  serializeLevel,
  serializeAbstractNum,
  serializeLevelOverride,
  serializeNum,
  serializeNumbering,
} from "./numbering";

// Section serialization
export {
  serializePageSize,
  serializePageMargins,
  serializePageBorders,
  serializeColumns,
  serializeHeaderReference,
  serializeFooterReference,
  serializeLineNumbering,
  serializePageNumberType,
  serializeDocGrid,
  serializeNotePr,
  serializeSectionProperties,
} from "./section";

// Document serialization
export {
  serializeBlockContent,
  serializeBody,
  serializeDocument,
} from "./document";
