/**
 * @file Exhaustive field registry for DOCX reference documentation verification.
 *
 * Each exported constant maps every field of a spec type to the documentation
 * section name in docx.md where it must appear. The `satisfies Record<keyof T, string>`
 * pattern ensures that adding a field to any type causes a compile error here,
 * forcing the developer to update both the registry and the documentation.
 */

import type {
  RunSpec,
  ParagraphSpec,
  BorderEdgeSpec,
  TableCellSpec,
  TableRowSpec,
  TableSpec,
  NumberingLevelSpec,
  NumberingDefinitionSpec,
  StyleSpec,
  SectionSpec,
  DocxBuildSpec,
  DocxPatch,
  DocxPatchSpec,
} from "@aurochs-builder/docx";

import type { ExpectedDocument, TestCaseSpec } from "./verify";

// ---------------------------------------------------------------------------
// Build spec types
// ---------------------------------------------------------------------------

export const RUN_SPEC_FIELDS = {
  text: "Run spec",
  bold: "Run spec",
  italic: "Run spec",
  underline: "Run spec",
  strikethrough: "Run spec",
  fontSize: "Run spec",
  fontFamily: "Run spec",
  color: "Run spec",
  highlight: "Run spec",
  vertAlign: "Run spec",
  smallCaps: "Run spec",
  allCaps: "Run spec",
} satisfies Record<keyof RunSpec, string>;

export const PARAGRAPH_SPEC_FIELDS = {
  type: "Paragraph spec",
  style: "Paragraph spec",
  alignment: "Paragraph spec",
  spacing: "Paragraph spec",
  indent: "Paragraph spec",
  numbering: "Paragraph spec",
  keepNext: "Paragraph spec",
  keepLines: "Paragraph spec",
  pageBreakBefore: "Paragraph spec",
  runs: "Paragraph spec",
} satisfies Record<keyof ParagraphSpec, string>;

export const BORDER_EDGE_SPEC_FIELDS = {
  style: "Border edge spec",
  size: "Border edge spec",
  color: "Border edge spec",
} satisfies Record<keyof BorderEdgeSpec, string>;

export const TABLE_CELL_SPEC_FIELDS = {
  content: "Table cell spec",
  width: "Table cell spec",
  gridSpan: "Table cell spec",
  vMerge: "Table cell spec",
  shading: "Table cell spec",
  vAlign: "Table cell spec",
  borders: "Table cell spec",
} satisfies Record<keyof TableCellSpec, string>;

export const TABLE_ROW_SPEC_FIELDS = {
  cells: "Table row spec",
  height: "Table row spec",
  header: "Table row spec",
} satisfies Record<keyof TableRowSpec, string>;

export const TABLE_SPEC_FIELDS = {
  type: "Table spec",
  style: "Table spec",
  width: "Table spec",
  alignment: "Table spec",
  borders: "Table spec",
  grid: "Table spec",
  rows: "Table spec",
} satisfies Record<keyof TableSpec, string>;

export const NUMBERING_LEVEL_SPEC_FIELDS = {
  ilvl: "Numbering level spec",
  numFmt: "Numbering level spec",
  lvlText: "Numbering level spec",
  start: "Numbering level spec",
  lvlJc: "Numbering level spec",
  indent: "Numbering level spec",
  font: "Numbering level spec",
} satisfies Record<keyof NumberingLevelSpec, string>;

export const NUMBERING_DEFINITION_SPEC_FIELDS = {
  abstractNumId: "Numbering definition spec",
  numId: "Numbering definition spec",
  levels: "Numbering definition spec",
} satisfies Record<keyof NumberingDefinitionSpec, string>;

export const STYLE_SPEC_FIELDS = {
  type: "Style spec",
  styleId: "Style spec",
  name: "Style spec",
  basedOn: "Style spec",
  next: "Style spec",
  paragraph: "Style spec",
  run: "Style spec",
} satisfies Record<keyof StyleSpec, string>;

export const SECTION_SPEC_FIELDS = {
  pageSize: "Section spec",
  margins: "Section spec",
  columns: "Section spec",
} satisfies Record<keyof SectionSpec, string>;

export const DOCX_BUILD_SPEC_FIELDS = {
  output: "Build spec",
  content: "Build spec",
  numbering: "Build spec",
  styles: "Build spec",
  section: "Build spec",
} satisfies Record<keyof DocxBuildSpec, string>;

// ---------------------------------------------------------------------------
// Patch spec types
// ---------------------------------------------------------------------------

export const CONTENT_APPEND_PATCH_FIELDS = {
  type: "Patch spec",
  content: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "content.append" }>, string>;

export const CONTENT_INSERT_PATCH_FIELDS = {
  type: "Patch spec",
  index: "Patch spec",
  content: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "content.insert" }>, string>;

export const CONTENT_DELETE_PATCH_FIELDS = {
  type: "Patch spec",
  index: "Patch spec",
  count: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "content.delete" }>, string>;

export const CONTENT_REPLACE_PATCH_FIELDS = {
  type: "Patch spec",
  index: "Patch spec",
  count: "Patch spec",
  content: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "content.replace" }>, string>;

export const STYLES_APPEND_PATCH_FIELDS = {
  type: "Patch spec",
  styles: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "styles.append" }>, string>;

export const NUMBERING_APPEND_PATCH_FIELDS = {
  type: "Patch spec",
  numbering: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "numbering.append" }>, string>;

export const SECTION_UPDATE_PATCH_FIELDS = {
  type: "Patch spec",
  section: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "section.update" }>, string>;

export const TEXT_REPLACE_PATCH_FIELDS = {
  type: "Patch spec",
  search: "Patch spec",
  replace: "Patch spec",
  replaceAll: "Patch spec",
} satisfies Record<keyof Extract<DocxPatch, { type: "text.replace" }>, string>;

export const DOCX_PATCH_SPEC_FIELDS = {
  source: "Patch spec",
  output: "Patch spec",
  patches: "Patch spec",
} satisfies Record<keyof DocxPatchSpec, string>;

// ---------------------------------------------------------------------------
// Verify types
// ---------------------------------------------------------------------------

export const EXPECTED_DOCUMENT_FIELDS = {
  paragraphCount: "Verify spec",
  tableCount: "Verify spec",
  sectionCount: "Verify spec",
  hasStyles: "Verify spec",
  hasNumbering: "Verify spec",
} satisfies Record<keyof ExpectedDocument, string>;

export const TEST_CASE_SPEC_FIELDS = {
  name: "Verify spec",
  description: "Verify spec",
  tags: "Verify spec",
  input: "Verify spec",
  expected: "Verify spec",
} satisfies Record<keyof TestCaseSpec, string>;

// ---------------------------------------------------------------------------
// CLI commands
// ---------------------------------------------------------------------------

export const CLI_COMMANDS = [
  "info",
  "list",
  "show",
  "extract",
  "build",
  "patch",
  "verify",
  "styles",
  "numbering",
  "headers-footers",
  "tables",
  "comments",
  "images",
  "toc",
  "preview",
] as const;

// ---------------------------------------------------------------------------
// All registries (for iteration in tests)
// ---------------------------------------------------------------------------

export const ALL_REGISTRIES = [
  ["RunSpec", RUN_SPEC_FIELDS],
  ["ParagraphSpec", PARAGRAPH_SPEC_FIELDS],
  ["BorderEdgeSpec", BORDER_EDGE_SPEC_FIELDS],
  ["TableCellSpec", TABLE_CELL_SPEC_FIELDS],
  ["TableRowSpec", TABLE_ROW_SPEC_FIELDS],
  ["TableSpec", TABLE_SPEC_FIELDS],
  ["NumberingLevelSpec", NUMBERING_LEVEL_SPEC_FIELDS],
  ["NumberingDefinitionSpec", NUMBERING_DEFINITION_SPEC_FIELDS],
  ["StyleSpec", STYLE_SPEC_FIELDS],
  ["SectionSpec", SECTION_SPEC_FIELDS],
  ["DocxBuildSpec", DOCX_BUILD_SPEC_FIELDS],
  ["ContentAppendPatch", CONTENT_APPEND_PATCH_FIELDS],
  ["ContentInsertPatch", CONTENT_INSERT_PATCH_FIELDS],
  ["ContentDeletePatch", CONTENT_DELETE_PATCH_FIELDS],
  ["ContentReplacePatch", CONTENT_REPLACE_PATCH_FIELDS],
  ["StylesAppendPatch", STYLES_APPEND_PATCH_FIELDS],
  ["NumberingAppendPatch", NUMBERING_APPEND_PATCH_FIELDS],
  ["SectionUpdatePatch", SECTION_UPDATE_PATCH_FIELDS],
  ["TextReplacePatch", TEXT_REPLACE_PATCH_FIELDS],
  ["DocxPatchSpec", DOCX_PATCH_SPEC_FIELDS],
  ["ExpectedDocument", EXPECTED_DOCUMENT_FIELDS],
  ["TestCaseSpec", TEST_CASE_SPEC_FIELDS],
] as const;
