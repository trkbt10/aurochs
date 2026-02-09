/**
 * @file Spec Converter
 *
 * Converts simplified build spec types (DocxBuildSpec) to DOCX domain types
 * for use with the serializer and exporter.
 */

import type { DocxRun, DocxRunProperties, DocxRunContent, DocxHighlightColor } from "@aurochs-office/docx/domain/run";
import type { DocxParagraph, DocxParagraphProperties, DocxParagraphSpacing, DocxParagraphIndent, DocxNumberingProperties } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable, DocxTableProperties, DocxTableRow, DocxTableRowProperties, DocxTableCell, DocxTableCellProperties, DocxTableBorders, DocxTableBorderEdge, DocxCellBorders, DocxTableGrid, DocxRowHeight } from "@aurochs-office/docx/domain/table";
import type { DocxBlockContent, DocxBody, DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxSectionProperties, DocxPageSize, DocxPageMargins, DocxColumns } from "@aurochs-office/docx/domain/section";
import type { DocxNumbering, DocxAbstractNum, DocxNum, DocxLevel } from "@aurochs-office/docx/domain/numbering";
import type { DocxStyles, DocxStyle } from "@aurochs-office/docx/domain/styles";
import type { TableWidth } from "@aurochs-office/ooxml/domain/table";
import { twips, halfPoints, docxStyleId, docxNumId, docxIlvl, docxAbstractNumId } from "@aurochs-office/docx/domain/types";
import { gridSpan } from "@aurochs-office/ooxml/domain/table";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type {
  RunSpec,
  ParagraphSpec,
  TableSpec,
  TableRowSpec,
  TableCellSpec,
  BorderEdgeSpec,
  BlockContentSpec,
  NumberingDefinitionSpec,
  NumberingLevelSpec,
  StyleSpec,
  SectionSpec,
  DocxBuildSpec,
} from "./types";

// =============================================================================
// Run Conversion
// =============================================================================

/**
 * Convert a RunSpec to DocxRun domain type.
 */
export function convertRunSpec(spec: RunSpec): DocxRun {
  const content: DocxRunContent[] = [{ type: "text", value: spec.text }];

  const properties: DocxRunProperties = {
    ...(spec.bold !== undefined ? { b: spec.bold } : {}),
    ...(spec.italic !== undefined ? { i: spec.italic } : {}),
    ...(spec.strikethrough !== undefined ? { strike: spec.strikethrough } : {}),
    ...(spec.smallCaps !== undefined ? { smallCaps: spec.smallCaps } : {}),
    ...(spec.allCaps !== undefined ? { caps: spec.allCaps } : {}),
    ...(spec.fontSize !== undefined ? { sz: halfPoints(spec.fontSize) } : {}),
    ...(spec.fontFamily !== undefined ? { rFonts: { ascii: spec.fontFamily, hAnsi: spec.fontFamily } } : {}),
    ...(spec.color !== undefined ? { color: { val: spec.color } } : {}),
    ...(spec.highlight !== undefined ? { highlight: spec.highlight as DocxHighlightColor } : {}),
    ...(spec.vertAlign !== undefined ? { vertAlign: spec.vertAlign } : {}),
    ...(spec.underline !== undefined
      ? { u: typeof spec.underline === "boolean" ? { val: spec.underline ? "single" : "none" } : { val: spec.underline as "single" } }
      : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "run",
    ...(hasProperties ? { properties } : {}),
    content,
  };
}

// =============================================================================
// Paragraph Conversion
// =============================================================================

/**
 * Convert a ParagraphSpec to DocxParagraph domain type.
 */
export function convertParagraphSpec(spec: ParagraphSpec): DocxParagraph {
  const properties: DocxParagraphProperties = {
    ...(spec.style !== undefined ? { pStyle: docxStyleId(spec.style) } : {}),
    ...(spec.alignment !== undefined ? { jc: spec.alignment } : {}),
    ...(spec.keepNext !== undefined ? { keepNext: spec.keepNext } : {}),
    ...(spec.keepLines !== undefined ? { keepLines: spec.keepLines } : {}),
    ...(spec.pageBreakBefore !== undefined ? { pageBreakBefore: spec.pageBreakBefore } : {}),
    ...(spec.spacing !== undefined ? { spacing: convertSpacing(spec.spacing) } : {}),
    ...(spec.indent !== undefined ? { ind: convertIndent(spec.indent) } : {}),
    ...(spec.numbering !== undefined ? { numPr: convertNumberingProperties(spec.numbering) } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "paragraph",
    ...(hasProperties ? { properties } : {}),
    content: spec.runs.map(convertRunSpec),
  };
}

function convertSpacing(spacing: NonNullable<ParagraphSpec["spacing"]>): DocxParagraphSpacing {
  return {
    ...(spacing.before !== undefined ? { before: twips(spacing.before) } : {}),
    ...(spacing.after !== undefined ? { after: twips(spacing.after) } : {}),
    ...(spacing.line !== undefined ? { line: spacing.line } : {}),
    ...(spacing.lineRule !== undefined ? { lineRule: spacing.lineRule } : {}),
  };
}

function convertIndent(indent: NonNullable<ParagraphSpec["indent"]>): DocxParagraphIndent {
  return {
    ...(indent.left !== undefined ? { left: twips(indent.left) } : {}),
    ...(indent.right !== undefined ? { right: twips(indent.right) } : {}),
    ...(indent.firstLine !== undefined ? { firstLine: twips(indent.firstLine) } : {}),
    ...(indent.hanging !== undefined ? { hanging: twips(indent.hanging) } : {}),
  };
}

function convertNumberingProperties(numbering: NonNullable<ParagraphSpec["numbering"]>): DocxNumberingProperties {
  return {
    numId: docxNumId(numbering.numId),
    ilvl: docxIlvl(numbering.ilvl),
  };
}

// =============================================================================
// Table Conversion
// =============================================================================

/**
 * Convert a TableSpec to DocxTable domain type.
 */
export function convertTableSpec(spec: TableSpec): DocxTable {
  const properties: DocxTableProperties = {
    ...(spec.style !== undefined ? { tblStyle: docxStyleId(spec.style) } : {}),
    ...(spec.width !== undefined ? { tblW: convertTableWidth(spec.width) } : {}),
    ...(spec.alignment !== undefined ? { jc: spec.alignment } : {}),
    ...(spec.borders !== undefined ? { tblBorders: convertTableBorders(spec.borders) } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;
  const grid: DocxTableGrid | undefined = spec.grid
    ? { columns: spec.grid.map((w) => ({ width: px(w) })) }
    : undefined;

  return {
    type: "table",
    ...(hasProperties ? { properties } : {}),
    ...(grid ? { grid } : {}),
    rows: spec.rows.map(convertTableRow),
  };
}

function convertTableWidth(width: { readonly value: number; readonly type: "dxa" | "pct" | "auto" }): TableWidth {
  return { value: width.value, type: width.type };
}

function convertTableBorderEdge(edge: BorderEdgeSpec): DocxTableBorderEdge {
  return {
    val: edge.style as DocxTableBorderEdge["val"],
    ...(edge.size !== undefined ? { sz: edge.size as DocxTableBorderEdge["sz"] } : {}),
    ...(edge.color !== undefined ? { color: edge.color } : {}),
  };
}

function convertTableBorders(borders: NonNullable<TableSpec["borders"]>): DocxTableBorders {
  return {
    ...(borders.top ? { top: convertTableBorderEdge(borders.top) } : {}),
    ...(borders.left ? { left: convertTableBorderEdge(borders.left) } : {}),
    ...(borders.bottom ? { bottom: convertTableBorderEdge(borders.bottom) } : {}),
    ...(borders.right ? { right: convertTableBorderEdge(borders.right) } : {}),
    ...(borders.insideH ? { insideH: convertTableBorderEdge(borders.insideH) } : {}),
    ...(borders.insideV ? { insideV: convertTableBorderEdge(borders.insideV) } : {}),
  };
}

function convertTableRow(spec: TableRowSpec): DocxTableRow {
  const properties: DocxTableRowProperties = {
    ...(spec.height !== undefined ? { trHeight: convertRowHeight(spec.height) } : {}),
    ...(spec.header !== undefined ? { tblHeader: spec.header } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "tableRow",
    ...(hasProperties ? { properties } : {}),
    cells: spec.cells.map(convertTableCell),
  };
}

function convertRowHeight(height: NonNullable<TableRowSpec["height"]>): DocxRowHeight {
  return {
    val: twips(height.value),
    ...(height.rule !== undefined ? { hRule: height.rule } : {}),
  };
}

function convertTableCell(spec: TableCellSpec): DocxTableCell {
  const properties: DocxTableCellProperties = {
    ...(spec.width !== undefined ? { tcW: convertTableWidth(spec.width) } : {}),
    ...(spec.gridSpan !== undefined ? { gridSpan: gridSpan(spec.gridSpan) } : {}),
    ...(spec.vMerge !== undefined ? { vMerge: spec.vMerge } : {}),
    ...(spec.shading !== undefined ? { shd: { val: "clear", fill: spec.shading } } : {}),
    ...(spec.vAlign !== undefined ? { vAlign: spec.vAlign } : {}),
    ...(spec.borders !== undefined ? { tcBorders: convertCellBorders(spec.borders) } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "tableCell",
    ...(hasProperties ? { properties } : {}),
    content: spec.content.map(convertParagraphSpec),
  };
}

function convertCellBorders(borders: NonNullable<TableCellSpec["borders"]>): DocxCellBorders {
  return {
    ...(borders.top ? { top: convertTableBorderEdge(borders.top) } : {}),
    ...(borders.left ? { left: convertTableBorderEdge(borders.left) } : {}),
    ...(borders.bottom ? { bottom: convertTableBorderEdge(borders.bottom) } : {}),
    ...(borders.right ? { right: convertTableBorderEdge(borders.right) } : {}),
  };
}

// =============================================================================
// Block Content Conversion
// =============================================================================

/**
 * Convert a BlockContentSpec to DocxBlockContent domain type.
 */
export function convertBlockContent(spec: BlockContentSpec): DocxBlockContent {
  switch (spec.type) {
    case "paragraph":
      return convertParagraphSpec(spec);
    case "table":
      return convertTableSpec(spec);
  }
}

/**
 * Count paragraphs and tables in block content specs.
 */
export function countBlockContentSpecs(specs: readonly BlockContentSpec[]): { paragraphCount: number; tableCount: number } {
  return specs.reduce(
    (acc, block) => {
      switch (block.type) {
        case "paragraph":
          return { ...acc, paragraphCount: acc.paragraphCount + 1 };
        case "table": {
          const cellParagraphs = block.rows.reduce(
            (sum, row) => sum + row.cells.reduce((cs, cell) => cs + cell.content.length, 0),
            0,
          );
          return { paragraphCount: acc.paragraphCount + cellParagraphs, tableCount: acc.tableCount + 1 };
        }
      }
    },
    { paragraphCount: 0, tableCount: 0 },
  );
}

// =============================================================================
// Numbering Conversion
// =============================================================================

function convertNumberingLevel(spec: NumberingLevelSpec): DocxLevel {
  return {
    ilvl: docxIlvl(spec.ilvl),
    numFmt: spec.numFmt as DocxLevel["numFmt"],
    lvlText: { val: spec.lvlText },
    ...(spec.start !== undefined ? { start: spec.start } : {}),
    ...(spec.lvlJc !== undefined ? { lvlJc: spec.lvlJc } : {}),
    ...(spec.indent !== undefined
      ? {
          pPr: {
            ind: {
              ...(spec.indent.left !== undefined ? { left: twips(spec.indent.left) } : {}),
              ...(spec.indent.hanging !== undefined ? { hanging: twips(spec.indent.hanging) } : {}),
            },
          },
        }
      : {}),
    ...(spec.font !== undefined ? { rPr: { rFonts: { ascii: spec.font, hAnsi: spec.font } } } : {}),
  };
}

/**
 * Convert NumberingDefinitionSpec array to DocxNumbering domain type.
 */
export function convertNumberingSpec(specs: readonly NumberingDefinitionSpec[]): DocxNumbering {
  const abstractNum: DocxAbstractNum[] = specs.map((spec) => ({
    abstractNumId: docxAbstractNumId(spec.abstractNumId),
    lvl: spec.levels.map(convertNumberingLevel),
  }));

  const num: DocxNum[] = specs.map((spec) => ({
    numId: docxNumId(spec.numId),
    abstractNumId: docxAbstractNumId(spec.abstractNumId),
  }));

  return { abstractNum, num };
}

// =============================================================================
// Style Conversion
// =============================================================================

/**
 * Convert StyleSpec array to DocxStyles domain type.
 */
export function convertStylesSpec(specs: readonly StyleSpec[]): DocxStyles {
  const style: DocxStyle[] = specs.map((spec) => ({
    type: spec.type,
    styleId: docxStyleId(spec.styleId),
    name: { val: spec.name },
    ...(spec.basedOn !== undefined ? { basedOn: { val: docxStyleId(spec.basedOn) } } : {}),
    ...(spec.next !== undefined ? { next: { val: docxStyleId(spec.next) } } : {}),
    ...(spec.paragraph !== undefined
      ? {
          pPr: {
            ...(spec.paragraph.alignment !== undefined ? { jc: spec.paragraph.alignment } : {}),
            ...(spec.paragraph.spacing !== undefined ? { spacing: convertSpacing(spec.paragraph.spacing) } : {}),
            ...(spec.paragraph.indent !== undefined ? { ind: convertIndent(spec.paragraph.indent) } : {}),
            ...(spec.paragraph.keepNext !== undefined ? { keepNext: spec.paragraph.keepNext } : {}),
            ...(spec.paragraph.keepLines !== undefined ? { keepLines: spec.paragraph.keepLines } : {}),
            ...(spec.paragraph.pageBreakBefore !== undefined ? { pageBreakBefore: spec.paragraph.pageBreakBefore } : {}),
          },
        }
      : {}),
    ...(spec.run !== undefined
      ? {
          rPr: {
            ...(spec.run.bold !== undefined ? { b: spec.run.bold } : {}),
            ...(spec.run.italic !== undefined ? { i: spec.run.italic } : {}),
            ...(spec.run.fontSize !== undefined ? { sz: halfPoints(spec.run.fontSize) } : {}),
            ...(spec.run.fontFamily !== undefined ? { rFonts: { ascii: spec.run.fontFamily, hAnsi: spec.run.fontFamily } } : {}),
            ...(spec.run.color !== undefined ? { color: { val: spec.run.color } } : {}),
          },
        }
      : {}),
  }));

  return { style };
}

// =============================================================================
// Section Conversion
// =============================================================================

/**
 * Convert SectionSpec to DocxSectionProperties domain type.
 */
export function convertSectionSpec(spec: SectionSpec): DocxSectionProperties {
  return {
    ...(spec.pageSize !== undefined ? { pgSz: convertPageSize(spec.pageSize) } : {}),
    ...(spec.margins !== undefined ? { pgMar: convertPageMargins(spec.margins) } : {}),
    ...(spec.columns !== undefined ? { cols: convertColumns(spec.columns) } : {}),
  };
}

function convertPageSize(size: NonNullable<SectionSpec["pageSize"]>): DocxPageSize {
  return {
    w: twips(size.w),
    h: twips(size.h),
    ...(size.orient !== undefined ? { orient: size.orient } : {}),
  };
}

function convertPageMargins(margins: NonNullable<SectionSpec["margins"]>): DocxPageMargins {
  return {
    top: twips(margins.top),
    right: twips(margins.right),
    bottom: twips(margins.bottom),
    left: twips(margins.left),
    ...(margins.header !== undefined ? { header: twips(margins.header) } : {}),
    ...(margins.footer !== undefined ? { footer: twips(margins.footer) } : {}),
    ...(margins.gutter !== undefined ? { gutter: twips(margins.gutter) } : {}),
  };
}

function convertColumns(cols: NonNullable<SectionSpec["columns"]>): DocxColumns {
  return {
    ...(cols.num !== undefined ? { num: cols.num } : {}),
    ...(cols.space !== undefined ? { space: twips(cols.space) } : {}),
    ...(cols.equalWidth !== undefined ? { equalWidth: cols.equalWidth } : {}),
  };
}

// =============================================================================
// Document Conversion
// =============================================================================

/**
 * Convert a DocxBuildSpec to DocxDocument domain type.
 * This is the main entry point for spec → domain conversion.
 */
export function convertDocument(spec: DocxBuildSpec): DocxDocument {
  const body: DocxBody = {
    content: spec.content.map(convertBlockContent),
    ...(spec.section !== undefined ? { sectPr: convertSectionSpec(spec.section) } : {}),
  };

  return {
    body,
    ...(spec.styles !== undefined ? { styles: convertStylesSpec(spec.styles) } : {}),
    ...(spec.numbering !== undefined ? { numbering: convertNumberingSpec(spec.numbering) } : {}),
  };
}
