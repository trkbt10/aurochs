/**
 * @file OOXML common utilities
 *
 * Shared types and utilities for all OOXML formats (PPTX, XLSX, DOCX).
 * DrawingML types have been moved to @aurochs-office/drawing-ml.
 *
 * @see ECMA-376 (Office Open XML File Formats)
 */

// Domain types - Border
export type {
  CoreBorderStyle,
  SpreadsheetBorderStyle,
  WordBorderStyle,
  EighthPoints,
  BorderSpacing,
  BorderEdge,
} from "./domain/border";
export { eighthPt, borderSpacing } from "./domain/border";

// Domain types - Table
export type {
  TableGridColumn,
  TableGrid,
  GridSpan,
  VerticalMerge,
  TableWidthType,
  TableWidth,
  TableCellMargins,
  TableAlignment,
  TableCellVerticalAlignment,
  TableLayoutType,
  TableOverlap,
} from "./domain/table";
export { gridSpan } from "./domain/table";

// Domain types - Numbering
export type {
  NumberFormat,
  NumberingLevelIndex,
  LevelSuffix,
  MultiLevelType,
  AbstractNumId,
  NumId,
  LevelStartOverride,
  LevelRestart,
} from "./domain/numbering";
export { numberingLevelIdx, abstractNumId, numId, levelRestart } from "./domain/numbering";

// Domain types - Text
export type {
  ParagraphAlignment,
  TextVerticalAlignment,
  TextDirection,
  LineSpacingRule,
  LineSpacing,
  TabStopAlignment,
  TabStopLeader,
  TextEmphasisMark,
  TextCapitalization,
  UnderlineStyle,
  BreakType,
  BreakClear,
} from "./domain/text";

// Domain types - Font
export type { BaseFontProperties, FontTypefaceProperties, BaseUnderlineStyle } from "./domain/font";

// Domain types - Warnings
export type { RenderWarning, WarningCollector } from "./domain/warnings";
export { createWarningCollector } from "./domain/warnings";
