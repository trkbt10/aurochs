/**
 * @file OOXML common utilities
 *
 * Shared types and utilities for all OOXML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 (Office Open XML File Formats)
 */

// Domain types - Units
export type { Brand, Pixels, Degrees, Percent, Points, EMU } from "./domain/units";
export { px, deg, pct, pt, emu } from "./domain/units";
export type { ResourceMap } from "./domain/opc";

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

// OPC utilities (Part 2)
export {
  // Part name utilities
  arePartNamesEquivalent,
  isValidPartName,
  assertValidPartName,
  // Pack URI utilities
  parsePackIri,
  composePackIri,
  createPartBaseIri,
  arePackIrisEquivalent,
  getPackScheme,
  // Relationship utilities
  createEmptyResourceMap,
  createResourceMap,
} from "./opc";
export type { PackResource, ResourceEntry } from "./opc";

// Serializer utilities
export {
  ooxmlBool,
  ooxmlAngleUnits,
  ooxmlPercent100k,
  ooxmlPercent1000,
  ooxmlEmu,
  EMU_PER_PIXEL,
} from "./serializer";
