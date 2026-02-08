/**
 * @file @aurochs-office/doc public API
 */

export { parseDoc, parseDocWithReport, type ParseDocOptions, type ParseDocResult } from "./parser";
export { convertDocToDocx } from "./converter";
export { extractDocDocument } from "./extractor";
export type {
  DocDocument,
  DocParagraph,
  DocTextRun,
  DocUnderlineStyle,
  DocLineSpacing,
  DocAlignment,
  DocSection,
  DocSectionBreakType,
  DocTable,
  DocTableRow,
  DocTableCell,
  DocStyle,
  DocStyleType,
  DocListDefinition,
  DocListLevel,
  DocListOverride,
  DocHyperlink,
  DocHeaderFooter,
  DocHeaderFooterType,
  DocNote,
  DocComment,
  DocBookmark,
  DocField,
  DocBlockContent,
  DocParagraphBorders,
  DocShading,
  DocTabStop,
  DocTabAlignment,
  DocTabLeader,
  DocLineNumbering,
  DocPageNumberFormat,
  DocFormField,
  DocTextbox,
  DocImage,
  DocShapeAnchor,
  DocBorder,
  DocBorderStyle,
  DocTableBorders,
} from "./domain/types";
