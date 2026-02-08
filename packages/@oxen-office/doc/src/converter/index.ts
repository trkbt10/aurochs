/**
 * @file Converts DocDocument domain model → DocxDocument for export
 */

import type {
  DocxDocument,
  DocxBody,
  DocxBlockContent,
  DocxParagraph,
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorders,
  DocxParagraphBorderEdge,
  DocxNumberingProperties,
  DocxRun,
  DocxRunProperties,
  DocxRunFonts,
  DocxText,
  DocxSectionProperties,
  DocxPageSize,
  DocxPageMargins,
  DocxColumns,
  DocxTable,
  DocxTableRow,
  DocxTableCell,
  DocxTableCellProperties,
  DocxTableRowProperties,
  DocxCellBorders,
  DocxTableBorderEdge,
  DocxShading,
  DocxShadingPattern,
  DocxTabStops,
  DocxLineNumbering,
  DocxPageNumberType,
  DocxVerticalJc,
  DocxOutlineLevel,
  DocxHighlightColor,
} from "@oxen-office/docx";
import type { ParagraphAlignment } from "@oxen-office/ooxml/domain/text";
import type { UnderlineStyle } from "@oxen-office/ooxml/domain/text";
import type { WordBorderStyle } from "@oxen-office/ooxml/domain/border";
import type { SectionBreakType } from "@oxen-office/docx";
import { halfPoints, twips, docxNumId, docxIlvl } from "@oxen-office/docx";
import { eighthPt } from "@oxen-office/ooxml/domain/border";
import type {
  DocDocument,
  DocParagraph,
  DocTextRun,
  DocSection,
  DocTable,
  DocTableRow,
  DocTableCell,
  DocUnderlineStyle,
  DocSectionBreakType,
  DocAlignment,
  DocBorder,
  DocBorderStyle,
  DocParagraphBorders,
  DocShading,
  DocTabStop,
  DocTableBorders,
  DocLineNumbering,
} from "../domain/types";

// --- Alignment ---

function convertAlignment(align: DocAlignment | undefined): ParagraphAlignment | undefined {
  if (!align) return undefined;
  if (align === "justify") return "both";
  if (align === "distribute") return "distribute";
  return align;
}

// --- Underline ---

const UNDERLINE_MAP: Record<DocUnderlineStyle, UnderlineStyle> = {
  single: "single",
  wordsOnly: "words",
  double: "double",
  dotted: "dotted",
  thick: "thick",
  dash: "dash",
  dotDash: "dotDash",
  dotDotDash: "dotDotDash",
  wave: "wave",
};

// --- Section break type ---

const SECTION_BREAK_MAP: Record<DocSectionBreakType, SectionBreakType> = {
  continuous: "continuous",
  newColumn: "nextColumn",
  newPage: "nextPage",
  evenPage: "evenPage",
  oddPage: "oddPage",
};

// --- Highlight color ---

// DOC ico → DOCX highlight color name
const HIGHLIGHT_COLOR_MAP: Record<string, DocxHighlightColor> = {
  "000000": "black",
  "0000FF": "blue",
  "00FFFF": "cyan",
  "00FF00": "green",
  "FF00FF": "magenta",
  "FF0000": "red",
  "FFFF00": "yellow",
  "FFFFFF": "white",
  "000080": "darkBlue",
  "008080": "darkCyan",
  "008000": "darkGreen",
  "800080": "darkMagenta",
  "800000": "darkRed",
  "808000": "darkYellow",
  "808080": "darkGray",
  "C0C0C0": "lightGray",
};

function convertHighlight(color: string | undefined): DocxHighlightColor | undefined {
  if (!color) return undefined;
  return HIGHLIGHT_COLOR_MAP[color.toUpperCase()];
}

// --- Border style ---

const BORDER_STYLE_MAP: Record<DocBorderStyle, WordBorderStyle> = {
  none: "none",
  single: "single",
  thick: "thick",
  double: "double",
  dotted: "dotted",
  dashed: "dashed",
  dotDash: "dotDash",
  dotDotDash: "dotDotDash",
  triple: "triple",
  thinThickSmall: "thinThickSmallGap",
  thickThinSmall: "thickThinSmallGap",
  thinThickThinSmall: "thinThickThinSmallGap",
  thinThickMedium: "thinThickMediumGap",
  thickThinMedium: "thickThinMediumGap",
  thinThickThinMedium: "thinThickThinMediumGap",
  thinThickLarge: "thinThickLargeGap",
  thickThinLarge: "thickThinLargeGap",
  thinThickThinLarge: "thinThickThinLargeGap",
  wave: "wave",
  doubleWave: "doubleWave",
  dashSmall: "dashSmallGap",
  dashDotStroked: "dashDotStroked",
  emboss3D: "threeDEmboss",
  engrave3D: "threeDEngrave",
};

function convertBorderEdge(border: DocBorder): DocxParagraphBorderEdge {
  return {
    val: border.style ? BORDER_STYLE_MAP[border.style] : "single",
    ...(border.width ? { sz: eighthPt(border.width) } : {}),
    ...(border.color ? { color: border.color } : {}),
  };
}

function convertParagraphBorders(borders: DocParagraphBorders): DocxParagraphBorders {
  return {
    ...(borders.top ? { top: convertBorderEdge(borders.top) } : {}),
    ...(borders.left ? { left: convertBorderEdge(borders.left) } : {}),
    ...(borders.bottom ? { bottom: convertBorderEdge(borders.bottom) } : {}),
    ...(borders.right ? { right: convertBorderEdge(borders.right) } : {}),
    ...(borders.between ? { between: convertBorderEdge(borders.between) } : {}),
    ...(borders.bar ? { bar: convertBorderEdge(borders.bar) } : {}),
  };
}

function convertTableBorderEdge(border: DocBorder): DocxTableBorderEdge {
  return {
    val: border.style ? BORDER_STYLE_MAP[border.style] : "single",
    ...(border.width ? { sz: eighthPt(border.width) } : {}),
    ...(border.color ? { color: border.color } : {}),
  };
}

function convertTableBorders(borders: DocTableBorders): DocxCellBorders {
  return {
    ...(borders.top ? { top: convertTableBorderEdge(borders.top) } : {}),
    ...(borders.left ? { left: convertTableBorderEdge(borders.left) } : {}),
    ...(borders.bottom ? { bottom: convertTableBorderEdge(borders.bottom) } : {}),
    ...(borders.right ? { right: convertTableBorderEdge(borders.right) } : {}),
    ...(borders.insideH ? { insideH: convertTableBorderEdge(borders.insideH) } : {}),
    ...(borders.insideV ? { insideV: convertTableBorderEdge(borders.insideV) } : {}),
  };
}

// --- Shading ---

const SHADING_PATTERN_MAP: Record<number, DocxShadingPattern> = {
  0: "clear",
  1: "solid",
  2: "pct5",
  3: "pct10",
  4: "pct20",
  5: "pct25",
  6: "pct30",
  7: "pct40",
  8: "pct50",
  9: "pct60",
  10: "pct70",
  11: "pct75",
  12: "pct80",
  13: "pct90",
  14: "horzStripe",
  15: "vertStripe",
  16: "reverseDiagStripe",
  17: "diagStripe",
  18: "horzCross",
  19: "diagCross",
  20: "thinHorzStripe",
  21: "thinVertStripe",
  22: "thinReverseDiagStripe",
  23: "thinDiagStripe",
  24: "thinHorzCross",
  25: "thinDiagCross",
};

function convertShading(shd: DocShading): DocxShading {
  return {
    val: SHADING_PATTERN_MAP[shd.pattern ?? 0] ?? "clear",
    ...(shd.foreColor ? { color: shd.foreColor } : {}),
    ...(shd.backColor ? { fill: shd.backColor } : {}),
  };
}

// --- Tab stops ---

function convertTabStops(tabs: readonly DocTabStop[]): DocxTabStops {
  return {
    tabs: tabs.map((tab) => ({
      val: tab.alignment,
      pos: twips(tab.position),
      ...(tab.leader ? { leader: tab.leader } : {}),
    })),
  };
}

// --- Line numbering ---

const LINE_NUMBER_RESTART_MAP: Record<string, "newPage" | "newSection" | "continuous"> = {
  perPage: "newPage",
  perSection: "newSection",
  continuous: "continuous",
};

function convertLineNumbering(ln: DocLineNumbering): DocxLineNumbering {
  return {
    ...(ln.countBy !== undefined ? { countBy: ln.countBy } : {}),
    ...(ln.start !== undefined ? { start: ln.start } : {}),
    ...(ln.restart ? { restart: LINE_NUMBER_RESTART_MAP[ln.restart] } : {}),
    ...(ln.distance !== undefined ? { distance: twips(ln.distance) } : {}),
  };
}

// --- Vertical alignment ---

function convertVerticalAlign(va: "top" | "center" | "bottom" | "justified"): DocxVerticalJc {
  if (va === "justified") return "both";
  return va;
}

// --- Run properties ---

function convertRunProperties(run: DocTextRun): DocxRunProperties | undefined {
  const rFonts: DocxRunFonts = {
    ...(run.fontName ? { ascii: run.fontName, hAnsi: run.fontName } : {}),
    ...(run.fontNameEastAsia ? { eastAsia: run.fontNameEastAsia } : {}),
    ...(run.fontNameComplex || run.fontNameBiDi ? { cs: run.fontNameComplex ?? run.fontNameBiDi } : {}),
  };
  const hasRFonts = Object.keys(rFonts).length > 0;

  const underlineStyle = run.underlineStyle ? UNDERLINE_MAP[run.underlineStyle] : run.underline ? "single" : undefined;
  const highlight = convertHighlight(run.highlight);

  const props: DocxRunProperties = {
    ...(run.bold ? { b: true, bCs: true } : {}),
    ...(run.italic ? { i: true, iCs: true } : {}),
    ...(underlineStyle ? { u: { val: underlineStyle, ...(run.underlineColor ? { color: run.underlineColor } : {}) } } : {}),
    ...(run.strike ? { strike: true } : {}),
    ...(run.dstrike ? { dstrike: true } : {}),
    ...(run.caps ? { caps: true } : {}),
    ...(run.smallCaps ? { smallCaps: true } : {}),
    ...(run.hidden ? { vanish: true } : {}),
    ...(run.outline ? { outline: true } : {}),
    ...(run.shadow ? { shadow: true } : {}),
    ...(run.emboss ? { emboss: true } : {}),
    ...(run.imprint ? { imprint: true } : {}),
    ...(run.superscript ? { vertAlign: "superscript" as const } : {}),
    ...(run.subscript ? { vertAlign: "subscript" as const } : {}),
    ...(run.fontSize ? { sz: halfPoints(run.fontSize * 2), szCs: halfPoints(run.fontSize * 2) } : {}),
    ...(hasRFonts ? { rFonts } : {}),
    ...(run.color ? { color: { val: run.color } } : {}),
    ...(highlight ? { highlight } : {}),
    ...(run.spacing ? { spacing: twips(run.spacing) } : {}),
  };

  return Object.keys(props).length > 0 ? props : undefined;
}

// --- Run ---

function convertRun(run: DocTextRun): DocxRun {
  const textContent: DocxText = { type: "text", value: run.text, space: "preserve" };
  const properties = convertRunProperties(run);
  return {
    type: "run",
    ...(properties ? { properties } : {}),
    content: [textContent],
  };
}

// --- Paragraph properties ---

function convertParagraphProperties(para: DocParagraph): DocxParagraphProperties | undefined {
  const jc = convertAlignment(para.alignment);

  // Indentation
  const hasIndent = para.indentLeft !== undefined || para.indentRight !== undefined || para.firstLineIndent !== undefined;
  const ind: DocxParagraphIndent | undefined = hasIndent
    ? {
        ...(para.indentLeft !== undefined ? { left: twips(para.indentLeft) } : {}),
        ...(para.indentRight !== undefined ? { right: twips(para.indentRight) } : {}),
        ...(para.firstLineIndent !== undefined
          ? para.firstLineIndent >= 0
            ? { firstLine: twips(para.firstLineIndent) }
            : { hanging: twips(-para.firstLineIndent) }
          : {}),
      }
    : undefined;

  // Spacing
  const hasSpacing =
    para.spaceBefore !== undefined || para.spaceAfter !== undefined ||
    para.lineSpacing !== undefined || para.spaceBeforeAuto || para.spaceAfterAuto;
  const spacing: DocxParagraphSpacing | undefined = hasSpacing
    ? {
        ...(para.spaceBefore !== undefined ? { before: twips(para.spaceBefore) } : {}),
        ...(para.spaceAfter !== undefined ? { after: twips(para.spaceAfter) } : {}),
        ...(para.lineSpacing
          ? para.lineSpacing.multi
            ? { line: para.lineSpacing.value, lineRule: "auto" as const }
            : { line: para.lineSpacing.value, lineRule: "exact" as const }
          : {}),
        ...(para.spaceBeforeAuto ? { beforeAutospacing: true } : {}),
        ...(para.spaceAfterAuto ? { afterAutospacing: true } : {}),
      }
    : undefined;

  // Numbering
  const hasNumPr = para.listIndex !== undefined;
  const numPr: DocxNumberingProperties | undefined = hasNumPr
    ? {
        numId: docxNumId(para.listIndex!),
        ...(para.listLevel !== undefined ? { ilvl: docxIlvl(para.listLevel) } : {}),
      }
    : undefined;

  // Outline level
  const OUTLINE_LEVELS: readonly DocxOutlineLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const outlineLvl: DocxOutlineLevel | undefined =
    para.outlineLevel !== undefined && para.outlineLevel >= 0 && para.outlineLevel <= 9
      ? OUTLINE_LEVELS[para.outlineLevel]
      : undefined;

  // Borders
  const pBdr = para.borders ? convertParagraphBorders(para.borders) : undefined;

  // Shading
  const shd = para.shading ? convertShading(para.shading) : undefined;

  // Tabs
  const tabs = para.tabs && para.tabs.length > 0 ? convertTabStops(para.tabs) : undefined;

  const props: DocxParagraphProperties = {
    ...(jc ? { jc } : {}),
    ...(ind ? { ind } : {}),
    ...(spacing ? { spacing } : {}),
    ...(numPr ? { numPr } : {}),
    ...(para.keepTogether ? { keepLines: true } : {}),
    ...(para.keepWithNext ? { keepNext: true } : {}),
    ...(para.pageBreakBefore ? { pageBreakBefore: true } : {}),
    ...(para.widowControl !== undefined ? { widowControl: para.widowControl } : {}),
    ...(outlineLvl !== undefined ? { outlineLvl } : {}),
    ...(pBdr ? { pBdr } : {}),
    ...(shd ? { shd } : {}),
    ...(tabs ? { tabs } : {}),
  };

  return Object.keys(props).length > 0 ? props : undefined;
}

// --- Paragraph ---

function convertParagraph(para: DocParagraph): DocxParagraph {
  const properties = convertParagraphProperties(para);
  return {
    type: "paragraph",
    ...(properties ? { properties } : {}),
    content: para.runs.map(convertRun),
  };
}

// --- Table ---

function convertTableCell(cell: DocTableCell, rowBorders?: DocTableBorders): DocxTableCell {
  const tcBorders = rowBorders ? convertTableBorders(rowBorders) : undefined;
  const cellShd: DocxShading | undefined = cell.backgroundColor
    ? { val: "clear", fill: cell.backgroundColor }
    : undefined;

  const hasCellProps =
    cell.width !== undefined ||
    cell.verticalMerge !== undefined ||
    cell.verticalAlign !== undefined ||
    cell.horizontalMerge !== undefined ||
    tcBorders !== undefined ||
    cellShd !== undefined;

  const properties: DocxTableCellProperties | undefined = hasCellProps
    ? {
        ...(cell.width !== undefined ? { tcW: { value: cell.width, type: "dxa" as const } } : {}),
        ...(cell.verticalMerge ? { vMerge: cell.verticalMerge } : {}),
        ...(cell.verticalAlign ? { vAlign: cell.verticalAlign } : {}),
        ...(cell.horizontalMerge ? { hMerge: cell.horizontalMerge } : {}),
        ...(tcBorders ? { tcBorders } : {}),
        ...(cellShd ? { shd: cellShd } : {}),
      }
    : undefined;

  return {
    type: "tableCell",
    ...(properties ? { properties } : {}),
    content: cell.paragraphs.map(convertParagraph),
  };
}

function convertTableRow(row: DocTableRow): DocxTableRow {
  const hasRowProps = row.height !== undefined || row.header;
  const properties: DocxTableRowProperties | undefined = hasRowProps
    ? {
        ...(row.height !== undefined ? { trHeight: { val: twips(row.height), hRule: "atLeast" as const } } : {}),
        ...(row.header ? { tblHeader: true } : {}),
      }
    : undefined;

  return {
    type: "tableRow",
    ...(properties ? { properties } : {}),
    cells: row.cells.map((cell) => convertTableCell(cell, row.borders)),
  };
}

function convertTable(table: DocTable): DocxTable {
  return {
    type: "table",
    rows: table.rows.map(convertTableRow),
  };
}

// --- Section properties ---

function convertSectionProperties(section: DocSection): DocxSectionProperties {
  const hasPgSz = section.pageWidth !== undefined || section.pageHeight !== undefined || section.orientation !== undefined;
  const pgSz: DocxPageSize | undefined = hasPgSz
    ? {
        w: twips(section.pageWidth ?? 12240),
        h: twips(section.pageHeight ?? 15840),
        ...(section.orientation ? { orient: section.orientation } : {}),
      }
    : undefined;

  const hasPgMar =
    section.marginTop !== undefined ||
    section.marginBottom !== undefined ||
    section.marginLeft !== undefined ||
    section.marginRight !== undefined;
  const pgMar: DocxPageMargins | undefined = hasPgMar
    ? {
        top: twips(section.marginTop ?? 1440),
        right: twips(section.marginRight ?? 1440),
        bottom: twips(section.marginBottom ?? 1440),
        left: twips(section.marginLeft ?? 1440),
        ...(section.gutter !== undefined ? { gutter: twips(section.gutter) } : {}),
        ...(section.headerDistance !== undefined ? { header: twips(section.headerDistance) } : {}),
        ...(section.footerDistance !== undefined ? { footer: twips(section.footerDistance) } : {}),
      }
    : undefined;

  const hasCols = section.columns !== undefined || section.columnSpacing !== undefined;
  const cols: DocxColumns | undefined = hasCols
    ? {
        ...(section.columns !== undefined ? { num: section.columns } : {}),
        ...(section.columnSpacing !== undefined ? { space: twips(section.columnSpacing) } : {}),
      }
    : undefined;

  const breakType = section.breakType ? SECTION_BREAK_MAP[section.breakType] : undefined;

  // Line numbering
  const lnNumType = section.lineNumbering ? convertLineNumbering(section.lineNumbering) : undefined;

  // Page numbering
  const hasPgNumType = section.pageNumberFormat !== undefined || section.pageNumberStart !== undefined;
  const pgNumType: DocxPageNumberType | undefined = hasPgNumType
    ? {
        ...(section.pageNumberFormat ? { fmt: section.pageNumberFormat } : {}),
        ...(section.pageNumberStart !== undefined ? { start: section.pageNumberStart } : {}),
      }
    : undefined;

  // Vertical alignment
  const vAlign = section.verticalAlign ? convertVerticalAlign(section.verticalAlign) : undefined;

  return {
    ...(breakType ? { type: breakType } : {}),
    ...(pgSz ? { pgSz } : {}),
    ...(pgMar ? { pgMar } : {}),
    ...(cols ? { cols } : {}),
    ...(section.titlePage ? { titlePg: true } : {}),
    ...(lnNumType ? { lnNumType } : {}),
    ...(pgNumType ? { pgNumType } : {}),
    ...(vAlign ? { vAlign } : {}),
  };
}

// --- Document ---

function convertBlockContent(item: DocParagraph | DocTable): DocxBlockContent {
  if ("rows" in item) {
    return convertTable(item);
  }
  return convertParagraph(item);
}

/** Convert a DocDocument to a DocxDocument suitable for export. */
export function convertDocToDocx(doc: DocDocument): DocxDocument {
  // Use content (mixed paragraphs + tables) if available, otherwise fall back to paragraphs
  const source: readonly (DocParagraph | DocTable)[] = doc.content ?? doc.paragraphs;
  const content: DocxBlockContent[] = source.map(convertBlockContent);

  // Attach section properties to last paragraph of each section
  if (doc.sections && doc.sections.length > 0) {
    const lastSection = doc.sections[doc.sections.length - 1];
    const sectPr = convertSectionProperties(lastSection);

    // Attach to the last paragraph in content
    if (content.length > 0) {
      const lastPara = content[content.length - 1];
      if (lastPara.type === "paragraph") {
        const paraProps = lastPara.properties ?? {};
        content[content.length - 1] = {
          ...lastPara,
          properties: { ...paraProps, sectPr },
        };
      }
    }
  }

  const body: DocxBody = { content };

  return { body };
}
