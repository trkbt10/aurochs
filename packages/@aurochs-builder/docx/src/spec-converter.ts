/**
 * @file Spec Converter
 *
 * Converts simplified build spec types (DocxBuildSpec) to DOCX domain types
 * for use with the serializer and exporter.
 */

import type { DocxRun, DocxRunProperties, DocxRunContent, DocxHighlightColor, DocxDrawingContent } from "@aurochs-office/docx/domain/run";
import type { DocxDrawing, DocxInlineDrawing, DocxAnchorDrawing } from "@aurochs-office/docx/domain/drawing";
import type { DrawingPicture, NonVisualDrawingProps, DrawingExtent } from "@aurochs-office/ooxml/domain/drawing";
import type { RunContentSpec, DrawingSpec, InlineDrawingSpec, AnchorDrawingSpec } from "./types";
import type { DocxParagraph, DocxParagraphProperties, DocxParagraphSpacing, DocxParagraphIndent, DocxNumberingProperties, DocxTabStops, DocxParagraphBorders, DocxParagraphBorderEdge } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable, DocxTableProperties, DocxTableRow, DocxTableRowProperties, DocxTableCell, DocxTableCellProperties, DocxTableBorders, DocxTableBorderEdge, DocxCellBorders, DocxTableGrid, DocxRowHeight } from "@aurochs-office/docx/domain/table";
import type { DocxBlockContent, DocxBody, DocxDocument, DocxHeader, DocxFooter } from "@aurochs-office/docx/domain/document";
import type { DocxSectionProperties, DocxPageSize, DocxPageMargins, DocxColumns, DocxPageNumberType, DocxHeaderFooterRef } from "@aurochs-office/docx/domain/section";
import type { DocxNumbering, DocxAbstractNum, DocxNum, DocxLevel } from "@aurochs-office/docx/domain/numbering";
import type { DocxStyles, DocxStyle } from "@aurochs-office/docx/domain/styles";
import type { TableWidth, TableCellMargins } from "@aurochs-office/ooxml/domain/table";
import { twips, halfPoints, docxStyleId, docxNumId, docxIlvl, docxAbstractNumId, docxRelId } from "@aurochs-office/docx/domain/types";
import type { DocxRelId, HeaderFooterType } from "@aurochs-office/docx/domain/types";
import { gridSpan } from "@aurochs-office/ooxml/domain/table";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type {
  RunSpec,
  ParagraphSpec,
  ParagraphBorderEdgeSpec,
  ParagraphBordersSpec,
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
  HeaderFooterContentSpec,
} from "./types";

// =============================================================================
// Run Conversion
// =============================================================================

function convertUnderlineSpec(underline: boolean | string): DocxRunProperties["u"] {
  if (typeof underline === "boolean") {
    return { val: underline ? "single" : "none" };
  }
  return { val: underline as "single" };
}

// =============================================================================
// Drawing Conversion
// =============================================================================

/**
 * Context for drawing conversion, holds relationship ID mapping.
 */
export type DrawingConversionContext = {
  /** Map from media filename to relationship ID */
  readonly mediaRIds: Map<string, string>;
  /** Next relationship ID counter */
  nextRId: number;
};

/**
 * Create a drawing conversion context.
 */
export function createDrawingContext(startRId: number = 1): DrawingConversionContext {
  return {
    mediaRIds: new Map(),
    nextRId: startRId,
  };
}

/**
 * Get or create relationship ID for a media file.
 */
function getMediaRId(ctx: DrawingConversionContext, mediaFile: string): string {
  const existing = ctx.mediaRIds.get(mediaFile);
  if (existing) {
    return existing;
  }
  const newRId = `rId${ctx.nextRId++}`;
  ctx.mediaRIds.set(mediaFile, newRId);
  return newRId;
}

/**
 * Convert drawing extent spec to domain type.
 */
function convertDrawingExtent(spec: { cx: number; cy: number }): DrawingExtent {
  return { cx: spec.cx, cy: spec.cy };
}

/**
 * Convert document properties spec to domain type.
 */
function convertDocPr(spec: { id: number; name: string; descr?: string }): NonVisualDrawingProps {
  return {
    id: spec.id,
    name: spec.name,
    ...(spec.descr !== undefined ? { descr: spec.descr } : {}),
  };
}

/**
 * Create a picture domain type for an image.
 */
function createPicture(rId: string, extent: DrawingExtent, docPr: NonVisualDrawingProps): DrawingPicture {
  return {
    nvPicPr: {
      cNvPr: docPr,
      cNvPicPr: {},
    },
    blipFill: {
      blip: { rEmbed: rId },
      stretch: true,
    },
    spPr: {
      xfrm: {
        off: { x: 0, y: 0 },
        ext: extent,
      },
    },
  };
}

/**
 * Convert inline drawing spec to domain type.
 */
function convertInlineDrawing(spec: InlineDrawingSpec, ctx: DrawingConversionContext): DocxInlineDrawing {
  const rId = getMediaRId(ctx, spec.mediaFile);
  const extent = convertDrawingExtent(spec.extent);
  const docPr = convertDocPr(spec.docPr);

  return {
    type: "inline",
    extent,
    docPr,
    pic: createPicture(rId, extent, docPr),
  };
}

/**
 * Convert anchor drawing spec to domain type.
 */
function convertAnchorDrawing(spec: AnchorDrawingSpec, ctx: DrawingConversionContext): DocxAnchorDrawing {
  const rId = getMediaRId(ctx, spec.mediaFile);
  const extent = convertDrawingExtent(spec.extent);
  const docPr = convertDocPr(spec.docPr);

  return {
    type: "anchor",
    extent,
    docPr,
    positionH: spec.positionH,
    positionV: spec.positionV,
    ...(spec.behindDoc !== undefined ? { behindDoc: spec.behindDoc } : {}),
    ...(spec.locked !== undefined ? { locked: spec.locked } : {}),
    ...(spec.wrap !== undefined ? { wrap: spec.wrap } : {}),
    pic: createPicture(rId, extent, docPr),
  };
}

/**
 * Convert drawing spec to domain type.
 */
export function convertDrawingSpec(spec: DrawingSpec, ctx: DrawingConversionContext): DocxDrawing {
  if (spec.type === "inline") {
    return convertInlineDrawing(spec, ctx);
  }
  return convertAnchorDrawing(spec, ctx);
}

/**
 * Convert run content spec to domain type.
 */
function convertRunContentSpec(spec: RunContentSpec, ctx: DrawingConversionContext): DocxRunContent {
  if (spec.type === "text") {
    return { type: "text", value: spec.text };
  }
  return {
    type: "drawing",
    drawing: convertDrawingSpec(spec.drawing, ctx),
  } as DocxDrawingContent;
}

function buildRunContent(spec: RunSpec, ctx: DrawingConversionContext): DocxRunContent[] {
  if (spec.contents) {
    return spec.contents.map((c) => convertRunContentSpec(c, ctx));
  }
  if (spec.text !== undefined) {
    return [{ type: "text", value: spec.text }];
  }
  return [];
}

function hasFontProperties(spec: RunSpec): boolean {
  return spec.fontFamily !== undefined ||
    spec.fontFamilyEastAsian !== undefined ||
    spec.fontFamilyComplexScript !== undefined ||
    spec.asciiTheme !== undefined;
}

function buildRFonts(spec: RunSpec): DocxRunProperties["rFonts"] | undefined {
  if (!hasFontProperties(spec)) {
    return undefined;
  }
  return {
    ...(spec.fontFamily !== undefined ? { ascii: spec.fontFamily, hAnsi: spec.fontFamily } : {}),
    ...(spec.fontFamilyEastAsian !== undefined ? { eastAsia: spec.fontFamilyEastAsian } : {}),
    ...(spec.fontFamilyComplexScript !== undefined ? { cs: spec.fontFamilyComplexScript } : {}),
    ...(spec.asciiTheme !== undefined ? { asciiTheme: spec.asciiTheme } : {}),
  };
}

/**
 * Convert a RunSpec to DocxRun domain type.
 */
export function convertRunSpec(spec: RunSpec, ctx?: DrawingConversionContext): DocxRun {
  const drawingCtx = ctx ?? createDrawingContext();
  const content = buildRunContent(spec, drawingCtx);
  const rFonts = buildRFonts(spec);

  const properties: DocxRunProperties = {
    ...(spec.bold !== undefined ? { b: spec.bold } : {}),
    ...(spec.boldCs !== undefined ? { bCs: spec.boldCs } : {}),
    ...(spec.italic !== undefined ? { i: spec.italic } : {}),
    ...(spec.italicCs !== undefined ? { iCs: spec.italicCs } : {}),
    ...(spec.strikethrough !== undefined ? { strike: spec.strikethrough } : {}),
    ...(spec.doubleStrikethrough !== undefined ? { dstrike: spec.doubleStrikethrough } : {}),
    ...(spec.smallCaps !== undefined ? { smallCaps: spec.smallCaps } : {}),
    ...(spec.allCaps !== undefined ? { caps: spec.allCaps } : {}),
    ...(spec.emboss !== undefined ? { emboss: spec.emboss } : {}),
    ...(spec.imprint !== undefined ? { imprint: spec.imprint } : {}),
    ...(spec.outline !== undefined ? { outline: spec.outline } : {}),
    ...(spec.shadow !== undefined ? { shadow: spec.shadow } : {}),
    ...(spec.fontSize !== undefined ? { sz: halfPoints(spec.fontSize) } : {}),
    ...(spec.fontSizeCs !== undefined ? { szCs: halfPoints(spec.fontSizeCs) } : {}),
    ...(rFonts !== undefined ? { rFonts } : {}),
    ...(spec.shading !== undefined ? { shd: { val: spec.shading.val, fill: spec.shading.fill } } : {}),
    ...(spec.color !== undefined ? { color: { val: spec.color } } : {}),
    ...(spec.highlight !== undefined ? { highlight: spec.highlight as DocxHighlightColor } : {}),
    ...(spec.vertAlign !== undefined ? { vertAlign: spec.vertAlign } : {}),
    ...(spec.underline !== undefined ? { u: convertUnderlineSpec(spec.underline) } : {}),
    ...(spec.letterSpacing !== undefined ? { spacing: twips(spec.letterSpacing) } : {}),
    ...(spec.kerning !== undefined ? { kern: halfPoints(spec.kerning) } : {}),
    ...(spec.position !== undefined ? { position: halfPoints(spec.position) } : {}),
    ...(spec.rtl !== undefined ? { rtl: spec.rtl } : {}),
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
export function convertParagraphSpec(spec: ParagraphSpec, ctx?: DrawingConversionContext): DocxParagraph {
  const drawingCtx = ctx ?? createDrawingContext();
  const properties: DocxParagraphProperties = {
    ...(spec.style !== undefined ? { pStyle: docxStyleId(spec.style) } : {}),
    ...(spec.alignment !== undefined ? { jc: spec.alignment } : {}),
    ...(spec.keepNext !== undefined ? { keepNext: spec.keepNext } : {}),
    ...(spec.keepLines !== undefined ? { keepLines: spec.keepLines } : {}),
    ...(spec.pageBreakBefore !== undefined ? { pageBreakBefore: spec.pageBreakBefore } : {}),
    ...(spec.spacing !== undefined ? { spacing: convertSpacing(spec.spacing) } : {}),
    ...(spec.indent !== undefined ? { ind: convertIndent(spec.indent) } : {}),
    ...(spec.numbering !== undefined ? { numPr: convertNumberingProperties(spec.numbering) } : {}),
    ...(spec.tabs !== undefined ? { tabs: convertTabStops(spec.tabs) } : {}),
    ...(spec.shading !== undefined ? { shd: { val: "clear", fill: spec.shading } } : {}),
    ...(spec.borders !== undefined ? { pBdr: convertParagraphBorders(spec.borders) } : {}),
    ...(spec.bidi !== undefined ? { bidi: spec.bidi } : {}),
    ...(spec.textDirection !== undefined ? { textDirection: spec.textDirection as "lrTb" | "tbRl" | "btLr" } : {}),
    ...(spec.widowControl !== undefined ? { widowControl: spec.widowControl } : {}),
    ...(spec.outlineLvl !== undefined ? { outlineLvl: spec.outlineLvl as DocxParagraphProperties["outlineLvl"] } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "paragraph",
    ...(hasProperties ? { properties } : {}),
    content: spec.runs.map((r) => convertRunSpec(r, drawingCtx)),
  };
}

function convertSpacing(spacing: NonNullable<ParagraphSpec["spacing"]>): DocxParagraphSpacing {
  return {
    ...(spacing.before !== undefined ? { before: twips(spacing.before) } : {}),
    ...(spacing.after !== undefined ? { after: twips(spacing.after) } : {}),
    ...(spacing.line !== undefined ? { line: spacing.line } : {}),
    ...(spacing.lineRule !== undefined ? { lineRule: spacing.lineRule } : {}),
    ...(spacing.beforeAutospacing !== undefined ? { beforeAutospacing: spacing.beforeAutospacing } : {}),
    ...(spacing.afterAutospacing !== undefined ? { afterAutospacing: spacing.afterAutospacing } : {}),
  };
}

function convertIndent(indent: NonNullable<ParagraphSpec["indent"]>): DocxParagraphIndent {
  return {
    ...(indent.left !== undefined ? { left: twips(indent.left) } : {}),
    ...(indent.right !== undefined ? { right: twips(indent.right) } : {}),
    ...(indent.firstLine !== undefined ? { firstLine: twips(indent.firstLine) } : {}),
    ...(indent.hanging !== undefined ? { hanging: twips(indent.hanging) } : {}),
    ...(indent.start !== undefined ? { start: twips(indent.start) } : {}),
    ...(indent.end !== undefined ? { end: twips(indent.end) } : {}),
  };
}

function convertParagraphBorderEdge(edge: ParagraphBorderEdgeSpec): DocxParagraphBorderEdge {
  return {
    val: edge.style as DocxParagraphBorderEdge["val"],
    ...(edge.size !== undefined ? { sz: edge.size as DocxParagraphBorderEdge["sz"] } : {}),
    ...(edge.color !== undefined ? { color: edge.color } : {}),
    ...(edge.space !== undefined ? { space: edge.space } : {}),
  };
}

function convertParagraphBorders(borders: ParagraphBordersSpec): DocxParagraphBorders {
  return {
    ...(borders.top !== undefined ? { top: convertParagraphBorderEdge(borders.top) } : {}),
    ...(borders.bottom !== undefined ? { bottom: convertParagraphBorderEdge(borders.bottom) } : {}),
    ...(borders.left !== undefined ? { left: convertParagraphBorderEdge(borders.left) } : {}),
    ...(borders.right !== undefined ? { right: convertParagraphBorderEdge(borders.right) } : {}),
    ...(borders.between !== undefined ? { between: convertParagraphBorderEdge(borders.between) } : {}),
  };
}

function convertTabStops(tabs: NonNullable<ParagraphSpec["tabs"]>): DocxTabStops {
  return {
    tabs: tabs.map((tab) => ({
      pos: twips(tab.pos),
      val: tab.val ?? "left",
    })),
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

function convertGridSpec(grid: TableSpec["grid"]): DocxTableGrid | undefined {
  if (!grid) {
    return undefined;
  }
  return { columns: grid.map((w) => ({ width: px(w) })) };
}

function convertCellMargins(margins: NonNullable<TableSpec["cellMargins"]>): TableCellMargins {
  return {
    ...(margins.top !== undefined ? { top: margins.top } : {}),
    ...(margins.right !== undefined ? { right: margins.right } : {}),
    ...(margins.bottom !== undefined ? { bottom: margins.bottom } : {}),
    ...(margins.left !== undefined ? { left: margins.left } : {}),
  };
}

/**
 * Convert a TableSpec to DocxTable domain type.
 */
export function convertTableSpec(spec: TableSpec, ctx?: DrawingConversionContext): DocxTable {
  const drawingCtx = ctx ?? createDrawingContext();
  const properties: DocxTableProperties = {
    ...(spec.style !== undefined ? { tblStyle: docxStyleId(spec.style) } : {}),
    ...(spec.width !== undefined ? { tblW: convertTableWidth(spec.width) } : {}),
    ...(spec.alignment !== undefined ? { jc: spec.alignment } : {}),
    ...(spec.borders !== undefined ? { tblBorders: convertTableBorders(spec.borders) } : {}),
    ...(spec.indent !== undefined ? { tblInd: convertTableWidth(spec.indent) } : {}),
    ...(spec.shading !== undefined ? { shd: { val: "clear" as const, fill: spec.shading } } : {}),
    ...(spec.cellMargins !== undefined ? { tblCellMar: convertCellMargins(spec.cellMargins) } : {}),
    ...(spec.layout !== undefined ? { tblLayout: spec.layout } : {}),
    ...(spec.bidiVisual !== undefined ? { bidiVisual: spec.bidiVisual } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;
  const grid = convertGridSpec(spec.grid);

  return {
    type: "table",
    ...(hasProperties ? { properties } : {}),
    ...(grid ? { grid } : {}),
    rows: spec.rows.map((r) => convertTableRow(r, drawingCtx)),
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

function convertTableRow(spec: TableRowSpec, ctx?: DrawingConversionContext): DocxTableRow {
  const drawingCtx = ctx ?? createDrawingContext();
  const properties: DocxTableRowProperties = {
    ...(spec.height !== undefined ? { trHeight: convertRowHeight(spec.height) } : {}),
    ...(spec.header !== undefined ? { tblHeader: spec.header } : {}),
    ...(spec.cantSplit !== undefined ? { cantSplit: spec.cantSplit } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "tableRow",
    ...(hasProperties ? { properties } : {}),
    cells: spec.cells.map((c) => convertTableCell(c, drawingCtx)),
  };
}

function convertRowHeight(height: NonNullable<TableRowSpec["height"]>): DocxRowHeight {
  return {
    val: twips(height.value),
    ...(height.rule !== undefined ? { hRule: height.rule } : {}),
  };
}

function convertTableCell(spec: TableCellSpec, ctx?: DrawingConversionContext): DocxTableCell {
  const drawingCtx = ctx ?? createDrawingContext();
  const properties: DocxTableCellProperties = {
    ...(spec.width !== undefined ? { tcW: convertTableWidth(spec.width) } : {}),
    ...(spec.gridSpan !== undefined ? { gridSpan: gridSpan(spec.gridSpan) } : {}),
    ...(spec.vMerge !== undefined ? { vMerge: spec.vMerge } : {}),
    ...(spec.shading !== undefined ? { shd: { val: "clear", fill: spec.shading } } : {}),
    ...(spec.vAlign !== undefined ? { vAlign: spec.vAlign } : {}),
    ...(spec.borders !== undefined ? { tcBorders: convertCellBorders(spec.borders) } : {}),
    ...(spec.textDirection !== undefined ? { textDirection: spec.textDirection } : {}),
    ...(spec.noWrap !== undefined ? { noWrap: spec.noWrap } : {}),
  };

  const hasProperties = Object.keys(properties).length > 0;

  return {
    type: "tableCell",
    ...(hasProperties ? { properties } : {}),
    content: spec.content.map((p) => convertParagraphSpec(p, drawingCtx)),
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
export function convertBlockContent(spec: BlockContentSpec, ctx?: DrawingConversionContext): DocxBlockContent {
  const drawingCtx = ctx ?? createDrawingContext();
  switch (spec.type) {
    case "paragraph":
      return convertParagraphSpec(spec, drawingCtx);
    case "table":
      return convertTableSpec(spec, drawingCtx);
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

function convertLevelIndent(indent: NonNullable<NumberingLevelSpec["indent"]>): DocxParagraphIndent {
  return {
    ...(indent.left !== undefined ? { left: twips(indent.left) } : {}),
    ...(indent.hanging !== undefined ? { hanging: twips(indent.hanging) } : {}),
  };
}

function convertNumberingLevel(spec: NumberingLevelSpec): DocxLevel {
  return {
    ilvl: docxIlvl(spec.ilvl),
    numFmt: spec.numFmt as DocxLevel["numFmt"],
    lvlText: { val: spec.lvlText },
    ...(spec.start !== undefined ? { start: spec.start } : {}),
    ...(spec.lvlJc !== undefined ? { lvlJc: spec.lvlJc } : {}),
    ...(spec.indent !== undefined ? { pPr: { ind: convertLevelIndent(spec.indent) } } : {}),
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

function convertStyleParagraphProperties(para: NonNullable<StyleSpec["paragraph"]>): DocxParagraphProperties {
  return {
    ...(para.alignment !== undefined ? { jc: para.alignment } : {}),
    ...(para.spacing !== undefined ? { spacing: convertSpacing(para.spacing) } : {}),
    ...(para.indent !== undefined ? { ind: convertIndent(para.indent) } : {}),
    ...(para.keepNext !== undefined ? { keepNext: para.keepNext } : {}),
    ...(para.keepLines !== undefined ? { keepLines: para.keepLines } : {}),
    ...(para.pageBreakBefore !== undefined ? { pageBreakBefore: para.pageBreakBefore } : {}),
  };
}

function buildStyleRFonts(run: NonNullable<StyleSpec["run"]>): DocxRunProperties["rFonts"] | undefined {
  const hasFonts = run.fontFamily !== undefined || run.fontFamilyEastAsian !== undefined ||
    run.fontFamilyComplexScript !== undefined || run.asciiTheme !== undefined;
  if (!hasFonts) {
    return undefined;
  }
  return {
    ...(run.fontFamily !== undefined ? { ascii: run.fontFamily, hAnsi: run.fontFamily } : {}),
    ...(run.fontFamilyEastAsian !== undefined ? { eastAsia: run.fontFamilyEastAsian } : {}),
    ...(run.fontFamilyComplexScript !== undefined ? { cs: run.fontFamilyComplexScript } : {}),
    ...(run.asciiTheme !== undefined ? { asciiTheme: run.asciiTheme } : {}),
  };
}

function convertStyleRunProperties(run: NonNullable<StyleSpec["run"]>): DocxRunProperties {
  const rFonts = buildStyleRFonts(run);

  return {
    ...(run.bold !== undefined ? { b: run.bold } : {}),
    ...(run.boldCs !== undefined ? { bCs: run.boldCs } : {}),
    ...(run.italic !== undefined ? { i: run.italic } : {}),
    ...(run.italicCs !== undefined ? { iCs: run.italicCs } : {}),
    ...(run.strikethrough !== undefined ? { strike: run.strikethrough } : {}),
    ...(run.doubleStrikethrough !== undefined ? { dstrike: run.doubleStrikethrough } : {}),
    ...(run.smallCaps !== undefined ? { smallCaps: run.smallCaps } : {}),
    ...(run.allCaps !== undefined ? { caps: run.allCaps } : {}),
    ...(run.emboss !== undefined ? { emboss: run.emboss } : {}),
    ...(run.imprint !== undefined ? { imprint: run.imprint } : {}),
    ...(run.outline !== undefined ? { outline: run.outline } : {}),
    ...(run.shadow !== undefined ? { shadow: run.shadow } : {}),
    ...(run.fontSize !== undefined ? { sz: halfPoints(run.fontSize) } : {}),
    ...(run.fontSizeCs !== undefined ? { szCs: halfPoints(run.fontSizeCs) } : {}),
    ...(rFonts !== undefined ? { rFonts } : {}),
    ...(run.shading !== undefined ? { shd: { val: run.shading.val, fill: run.shading.fill } } : {}),
    ...(run.color !== undefined ? { color: { val: run.color } } : {}),
    ...(run.highlight !== undefined ? { highlight: run.highlight as DocxHighlightColor } : {}),
    ...(run.vertAlign !== undefined ? { vertAlign: run.vertAlign } : {}),
    ...(run.underline !== undefined ? { u: convertUnderlineSpec(run.underline) } : {}),
    ...(run.letterSpacing !== undefined ? { spacing: twips(run.letterSpacing) } : {}),
    ...(run.kerning !== undefined ? { kern: halfPoints(run.kerning) } : {}),
    ...(run.position !== undefined ? { position: halfPoints(run.position) } : {}),
    ...(run.rtl !== undefined ? { rtl: run.rtl } : {}),
  };
}

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
    ...(spec.paragraph !== undefined ? { pPr: convertStyleParagraphProperties(spec.paragraph) } : {}),
    ...(spec.run !== undefined ? { rPr: convertStyleRunProperties(spec.run) } : {}),
  }));

  return { style };
}

// =============================================================================
// Section Conversion
// =============================================================================

/**
 * Result of section conversion including headers and footers.
 */
export type SectionConversionResult = {
  readonly sectPr: DocxSectionProperties;
  readonly headers: ReadonlyMap<DocxRelId, DocxHeader>;
  readonly footers: ReadonlyMap<DocxRelId, DocxFooter>;
};

/**
 * Convert HeaderFooterContentSpec to DocxHeader.
 */
function convertHeaderContent(spec: HeaderFooterContentSpec): DocxHeader {
  return {
    content: spec.content.map(convertBlockContent),
  };
}

/**
 * Convert HeaderFooterContentSpec to DocxFooter.
 */
function convertFooterContent(spec: HeaderFooterContentSpec): DocxFooter {
  return {
    content: spec.content.map(convertBlockContent),
  };
}

type HeaderFooterProcessResult = {
  readonly refs: DocxHeaderFooterRef[];
  readonly map: Map<DocxRelId, DocxHeader | DocxFooter>;
  readonly nextRId: number;
};

function processHeaderFooterSpecs<T extends DocxHeader | DocxFooter>(
  specs: Record<string, HeaderFooterContentSpec | undefined> | undefined,
  converter: (content: HeaderFooterContentSpec) => T,
  startRId: number
): HeaderFooterProcessResult {
  if (!specs) {
    return { refs: [], map: new Map(), nextRId: startRId };
  }
  const types: HeaderFooterType[] = ["default", "first", "even"];
  const refs: DocxHeaderFooterRef[] = [];
  const map = new Map<DocxRelId, T>();
  const count = types.reduce((acc, type) => {
    const content = specs[type];
    if (content) {
      const rId = docxRelId(`rId${startRId + acc}`);
      refs.push({ type, rId });
      map.set(rId, converter(content));
      return acc + 1;
    }
    return acc;
  }, 0);
  return { refs, map, nextRId: startRId + count };
}

/**
 * Convert SectionSpec to DocxSectionProperties domain type with headers/footers.
 */
export function convertSectionSpec(spec: SectionSpec, startRId: number = 1): SectionConversionResult {
  const headerResult = processHeaderFooterSpecs(spec.headers, convertHeaderContent, startRId);
  const footerResult = processHeaderFooterSpecs(spec.footers, convertFooterContent, headerResult.nextRId);

  const headers = headerResult.map as Map<DocxRelId, DocxHeader>;
  const footers = footerResult.map as Map<DocxRelId, DocxFooter>;

  const sectPr: DocxSectionProperties = {
    ...(spec.type !== undefined ? { type: spec.type } : {}),
    ...(spec.pageSize !== undefined ? { pgSz: convertPageSize(spec.pageSize) } : {}),
    ...(spec.margins !== undefined ? { pgMar: convertPageMargins(spec.margins) } : {}),
    ...(spec.columns !== undefined ? { cols: convertColumns(spec.columns) } : {}),
    ...(spec.pageNumbering !== undefined ? { pgNumType: convertPageNumberType(spec.pageNumbering) } : {}),
    ...(spec.titlePage !== undefined ? { titlePg: spec.titlePage } : {}),
    ...(headerResult.refs.length > 0 ? { headerReference: headerResult.refs } : {}),
    ...(footerResult.refs.length > 0 ? { footerReference: footerResult.refs } : {}),
  };

  return { sectPr, headers, footers };
}

function convertPageNumberType(pgNum: NonNullable<SectionSpec["pageNumbering"]>): DocxPageNumberType {
  return {
    ...(pgNum.format !== undefined ? { fmt: pgNum.format } : {}),
    ...(pgNum.start !== undefined ? { start: pgNum.start } : {}),
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
/**
 * Compute starting relationship ID based on presence of styles and numbering.
 */
function computeStartRId(spec: DocxBuildSpec): number {
  return 1 + (spec.styles ? 1 : 0) + (spec.numbering ? 1 : 0);
}

/**
 * Convert a DocxBuildSpec to DocxDocument domain type.
 */
export function convertDocument(spec: DocxBuildSpec): DocxDocument {
  const startRId = computeStartRId(spec);
  const sectionResult = spec.section !== undefined ? convertSectionSpec(spec.section, startRId) : undefined;

  const body: DocxBody = {
    content: spec.content.map(convertBlockContent),
    ...(sectionResult !== undefined ? { sectPr: sectionResult.sectPr } : {}),
  };

  // Merge headers and footers from section
  const headers = sectionResult?.headers.size ? sectionResult.headers : undefined;
  const footers = sectionResult?.footers.size ? sectionResult.footers : undefined;

  return {
    body,
    ...(spec.styles !== undefined ? { styles: convertStylesSpec(spec.styles) } : {}),
    ...(spec.numbering !== undefined ? { numbering: convertNumberingSpec(spec.numbering) } : {}),
    ...(headers !== undefined ? { headers } : {}),
    ...(footers !== undefined ? { footers } : {}),
  };
}
