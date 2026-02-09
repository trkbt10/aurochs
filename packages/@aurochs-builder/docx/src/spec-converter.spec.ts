import { describe, it, expect } from "vitest";
import {
  convertRunSpec,
  convertParagraphSpec,
  convertTableSpec,
  convertBlockContent,
  convertNumberingSpec,
  convertStylesSpec,
  convertSectionSpec,
  convertDocument,
} from "./spec-converter";
import type {
  RunSpec,
  ParagraphSpec,
  TableSpec,
  NumberingDefinitionSpec,
  StyleSpec,
  SectionSpec,
  DocxBuildSpec,
} from "./types";

// =============================================================================
// convertRunSpec
// =============================================================================

describe("convertRunSpec", () => {
  it("converts plain text run", () => {
    const run = convertRunSpec({ text: "Hello" });
    expect(run.type).toBe("run");
    expect(run.content).toEqual([{ type: "text", value: "Hello" }]);
    expect(run.properties).toBeUndefined();
  });

  it("converts bold and italic", () => {
    const run = convertRunSpec({ text: "Bold", bold: true, italic: true });
    expect(run.properties?.b).toBe(true);
    expect(run.properties?.i).toBe(true);
  });

  it("converts font size as half-points", () => {
    const run = convertRunSpec({ text: "Big", fontSize: 48 });
    expect(run.properties?.sz).toBe(48);
  });

  it("converts font family", () => {
    const run = convertRunSpec({ text: "Custom", fontFamily: "Arial" });
    expect(run.properties?.rFonts?.ascii).toBe("Arial");
    expect(run.properties?.rFonts?.hAnsi).toBe("Arial");
  });

  it("converts color", () => {
    const run = convertRunSpec({ text: "Red", color: "FF0000" });
    expect(run.properties?.color?.val).toBe("FF0000");
  });

  it("converts highlight", () => {
    const run = convertRunSpec({ text: "High", highlight: "yellow" });
    expect(run.properties?.highlight).toBe("yellow");
  });

  it("converts underline boolean true", () => {
    const run = convertRunSpec({ text: "Underlined", underline: true });
    expect(run.properties?.u?.val).toBe("single");
  });

  it("converts underline boolean false", () => {
    const run = convertRunSpec({ text: "Not underlined", underline: false });
    expect(run.properties?.u?.val).toBe("none");
  });

  it("converts underline string", () => {
    const run = convertRunSpec({ text: "Dashed", underline: "dash" });
    expect(run.properties?.u?.val).toBe("dash");
  });

  it("converts strikethrough", () => {
    const run = convertRunSpec({ text: "Strike", strikethrough: true });
    expect(run.properties?.strike).toBe(true);
  });

  it("converts vertAlign", () => {
    const run = convertRunSpec({ text: "Super", vertAlign: "superscript" });
    expect(run.properties?.vertAlign).toBe("superscript");
  });

  it("converts smallCaps and allCaps", () => {
    const run = convertRunSpec({ text: "Caps", smallCaps: true, allCaps: true });
    expect(run.properties?.smallCaps).toBe(true);
    expect(run.properties?.caps).toBe(true);
  });
});

// =============================================================================
// convertParagraphSpec
// =============================================================================

describe("convertParagraphSpec", () => {
  it("converts paragraph with runs", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      runs: [{ text: "Hello" }],
    });
    expect(para.type).toBe("paragraph");
    expect(para.content).toHaveLength(1);
    expect(para.content[0].type).toBe("run");
  });

  it("converts paragraph style", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      style: "Heading1",
      runs: [],
    });
    expect(para.properties?.pStyle).toBe("Heading1");
  });

  it("converts alignment", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      alignment: "center",
      runs: [],
    });
    expect(para.properties?.jc).toBe("center");
  });

  it("converts spacing", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      spacing: { before: 240, after: 120, line: 276, lineRule: "auto" },
      runs: [],
    });
    expect(para.properties?.spacing?.before).toBe(240);
    expect(para.properties?.spacing?.after).toBe(120);
    expect(para.properties?.spacing?.line).toBe(276);
    expect(para.properties?.spacing?.lineRule).toBe("auto");
  });

  it("converts indent", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      indent: { left: 720, right: 360, firstLine: 360, hanging: 180 },
      runs: [],
    });
    expect(para.properties?.ind?.left).toBe(720);
    expect(para.properties?.ind?.right).toBe(360);
    expect(para.properties?.ind?.firstLine).toBe(360);
    expect(para.properties?.ind?.hanging).toBe(180);
  });

  it("converts numbering", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      numbering: { numId: 1, ilvl: 0 },
      runs: [{ text: "Item" }],
    });
    expect(para.properties?.numPr?.numId).toBe(1);
    expect(para.properties?.numPr?.ilvl).toBe(0);
  });

  it("converts keepNext and keepLines", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      keepNext: true,
      keepLines: true,
      runs: [],
    });
    expect(para.properties?.keepNext).toBe(true);
    expect(para.properties?.keepLines).toBe(true);
  });

  it("converts pageBreakBefore", () => {
    const para = convertParagraphSpec({
      type: "paragraph",
      pageBreakBefore: true,
      runs: [],
    });
    expect(para.properties?.pageBreakBefore).toBe(true);
  });

  it("omits properties when empty", () => {
    const para = convertParagraphSpec({ type: "paragraph", runs: [] });
    expect(para.properties).toBeUndefined();
  });
});

// =============================================================================
// convertTableSpec
// =============================================================================

describe("convertTableSpec", () => {
  it("converts basic table with rows and cells", () => {
    const table = convertTableSpec({
      type: "table",
      rows: [{
        cells: [{
          content: [{ type: "paragraph", runs: [{ text: "Cell" }] }],
        }],
      }],
    });
    expect(table.type).toBe("table");
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].cells).toHaveLength(1);
    expect(table.rows[0].cells[0].content).toHaveLength(1);
  });

  it("converts table style", () => {
    const table = convertTableSpec({
      type: "table",
      style: "TableGrid",
      rows: [],
    });
    expect(table.properties?.tblStyle).toBe("TableGrid");
  });

  it("converts table width", () => {
    const table = convertTableSpec({
      type: "table",
      width: { value: 5000, type: "pct" },
      rows: [],
    });
    expect(table.properties?.tblW).toEqual({ value: 5000, type: "pct" });
  });

  it("converts table alignment", () => {
    const table = convertTableSpec({
      type: "table",
      alignment: "center",
      rows: [],
    });
    expect(table.properties?.jc).toBe("center");
  });

  it("converts table grid", () => {
    const table = convertTableSpec({
      type: "table",
      grid: [2880, 2880],
      rows: [],
    });
    expect(table.grid?.columns).toHaveLength(2);
    expect(table.grid?.columns[0].width).toBe(2880);
    expect(table.grid?.columns[1].width).toBe(2880);
  });

  it("converts table borders", () => {
    const table = convertTableSpec({
      type: "table",
      borders: {
        top: { style: "single", size: 4, color: "000000" },
        insideH: { style: "single" },
        insideV: { style: "single" },
      },
      rows: [],
    });
    expect(table.properties?.tblBorders?.top?.val).toBe("single");
    expect(table.properties?.tblBorders?.top?.sz).toBe(4);
    expect(table.properties?.tblBorders?.top?.color).toBe("000000");
    expect(table.properties?.tblBorders?.insideH?.val).toBe("single");
    expect(table.properties?.tblBorders?.insideV?.val).toBe("single");
  });

  it("converts row height", () => {
    const table = convertTableSpec({
      type: "table",
      rows: [{
        height: { value: 400, rule: "exact" },
        cells: [{ content: [{ type: "paragraph", runs: [] }] }],
      }],
    });
    expect(table.rows[0].properties?.trHeight?.val).toBe(400);
    expect(table.rows[0].properties?.trHeight?.hRule).toBe("exact");
  });

  it("converts header row", () => {
    const table = convertTableSpec({
      type: "table",
      rows: [{
        header: true,
        cells: [{ content: [{ type: "paragraph", runs: [] }] }],
      }],
    });
    expect(table.rows[0].properties?.tblHeader).toBe(true);
  });

  it("converts cell properties", () => {
    const table = convertTableSpec({
      type: "table",
      rows: [{
        cells: [{
          content: [{ type: "paragraph", runs: [] }],
          width: { value: 2880, type: "dxa" },
          gridSpan: 2,
          vMerge: "restart",
          shading: "CCCCCC",
          vAlign: "center",
        }],
      }],
    });
    const cell = table.rows[0].cells[0];
    expect(cell.properties?.tcW).toEqual({ value: 2880, type: "dxa" });
    expect(cell.properties?.gridSpan).toBe(2);
    expect(cell.properties?.vMerge).toBe("restart");
    expect(cell.properties?.shd?.fill).toBe("CCCCCC");
    expect(cell.properties?.vAlign).toBe("center");
  });

  it("converts cell borders", () => {
    const table = convertTableSpec({
      type: "table",
      rows: [{
        cells: [{
          content: [{ type: "paragraph", runs: [] }],
          borders: {
            top: { style: "single", size: 4 },
            bottom: { style: "double" },
          },
        }],
      }],
    });
    const cell = table.rows[0].cells[0];
    expect(cell.properties?.tcBorders?.top?.val).toBe("single");
    expect(cell.properties?.tcBorders?.top?.sz).toBe(4);
    expect(cell.properties?.tcBorders?.bottom?.val).toBe("double");
  });

  it("omits properties when empty", () => {
    const table = convertTableSpec({ type: "table", rows: [] });
    expect(table.properties).toBeUndefined();
    expect(table.grid).toBeUndefined();
  });
});

// =============================================================================
// convertBlockContent
// =============================================================================

describe("convertBlockContent", () => {
  it("converts paragraph block", () => {
    const block = convertBlockContent({ type: "paragraph", runs: [{ text: "Hello" }] });
    expect(block.type).toBe("paragraph");
  });

  it("converts table block", () => {
    const block = convertBlockContent({
      type: "table",
      rows: [{ cells: [{ content: [{ type: "paragraph", runs: [] }] }] }],
    });
    expect(block.type).toBe("table");
  });
});

// =============================================================================
// convertNumberingSpec
// =============================================================================

describe("convertNumberingSpec", () => {
  it("converts single numbering definition", () => {
    const numbering = convertNumberingSpec([{
      abstractNumId: 0,
      numId: 1,
      levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }],
    }]);
    expect(numbering.abstractNum).toHaveLength(1);
    expect(numbering.abstractNum[0].abstractNumId).toBe(0);
    expect(numbering.abstractNum[0].lvl).toHaveLength(1);
    expect(numbering.abstractNum[0].lvl[0].ilvl).toBe(0);
    expect(numbering.abstractNum[0].lvl[0].numFmt).toBe("decimal");
    expect(numbering.abstractNum[0].lvl[0].lvlText?.val).toBe("%1.");
    expect(numbering.abstractNum[0].lvl[0].start).toBe(1);
    expect(numbering.num).toHaveLength(1);
    expect(numbering.num[0].numId).toBe(1);
    expect(numbering.num[0].abstractNumId).toBe(0);
  });

  it("converts bullet numbering", () => {
    const numbering = convertNumberingSpec([{
      abstractNumId: 0,
      numId: 1,
      levels: [{
        ilvl: 0,
        numFmt: "bullet",
        lvlText: "\u2022",
        font: "Symbol",
      }],
    }]);
    const lvl = numbering.abstractNum[0].lvl[0];
    expect(lvl.numFmt).toBe("bullet");
    expect(lvl.lvlText?.val).toBe("\u2022");
    expect(lvl.rPr?.rFonts?.ascii).toBe("Symbol");
  });

  it("converts level with indent", () => {
    const numbering = convertNumberingSpec([{
      abstractNumId: 0,
      numId: 1,
      levels: [{
        ilvl: 0,
        numFmt: "decimal",
        lvlText: "%1.",
        indent: { left: 720, hanging: 360 },
      }],
    }]);
    const lvl = numbering.abstractNum[0].lvl[0];
    expect(lvl.pPr?.ind?.left).toBe(720);
    expect(lvl.pPr?.ind?.hanging).toBe(360);
  });

  it("converts level justification", () => {
    const numbering = convertNumberingSpec([{
      abstractNumId: 0,
      numId: 1,
      levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", lvlJc: "right" }],
    }]);
    expect(numbering.abstractNum[0].lvl[0].lvlJc).toBe("right");
  });

  it("converts multiple definitions", () => {
    const numbering = convertNumberingSpec([
      { abstractNumId: 0, numId: 1, levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }] },
      { abstractNumId: 1, numId: 2, levels: [{ ilvl: 0, numFmt: "bullet", lvlText: "-" }] },
    ]);
    expect(numbering.abstractNum).toHaveLength(2);
    expect(numbering.num).toHaveLength(2);
  });
});

// =============================================================================
// convertStylesSpec
// =============================================================================

describe("convertStylesSpec", () => {
  it("converts basic paragraph style", () => {
    const styles = convertStylesSpec([{
      type: "paragraph",
      styleId: "Heading1",
      name: "heading 1",
      basedOn: "Normal",
      next: "Normal",
    }]);
    expect(styles.style).toHaveLength(1);
    expect(styles.style[0].type).toBe("paragraph");
    expect(styles.style[0].styleId).toBe("Heading1");
    expect(styles.style[0].name?.val).toBe("heading 1");
    expect(styles.style[0].basedOn?.val).toBe("Normal");
    expect(styles.style[0].next?.val).toBe("Normal");
  });

  it("converts style with paragraph properties", () => {
    const styles = convertStylesSpec([{
      type: "paragraph",
      styleId: "MyStyle",
      name: "My Style",
      paragraph: {
        alignment: "center",
        spacing: { before: 240, after: 120 },
        keepNext: true,
      },
    }]);
    expect(styles.style[0].pPr?.jc).toBe("center");
    expect(styles.style[0].pPr?.spacing?.before).toBe(240);
    expect(styles.style[0].pPr?.spacing?.after).toBe(120);
    expect(styles.style[0].pPr?.keepNext).toBe(true);
  });

  it("converts style with run properties", () => {
    const styles = convertStylesSpec([{
      type: "character",
      styleId: "Strong",
      name: "Strong",
      run: { bold: true, fontSize: 24, color: "FF0000" },
    }]);
    expect(styles.style[0].rPr?.b).toBe(true);
    expect(styles.style[0].rPr?.sz).toBe(24);
    expect(styles.style[0].rPr?.color?.val).toBe("FF0000");
  });

  it("converts style with font family", () => {
    const styles = convertStylesSpec([{
      type: "paragraph",
      styleId: "Normal",
      name: "Normal",
      run: { fontFamily: "Calibri" },
    }]);
    expect(styles.style[0].rPr?.rFonts?.ascii).toBe("Calibri");
    expect(styles.style[0].rPr?.rFonts?.hAnsi).toBe("Calibri");
  });
});

// =============================================================================
// convertSectionSpec
// =============================================================================

describe("convertSectionSpec", () => {
  it("converts page size", () => {
    const sect = convertSectionSpec({
      pageSize: { w: 12240, h: 15840 },
    });
    expect(sect.pgSz?.w).toBe(12240);
    expect(sect.pgSz?.h).toBe(15840);
  });

  it("converts page size with orientation", () => {
    const sect = convertSectionSpec({
      pageSize: { w: 15840, h: 12240, orient: "landscape" },
    });
    expect(sect.pgSz?.orient).toBe("landscape");
  });

  it("converts page margins", () => {
    const sect = convertSectionSpec({
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720, gutter: 0 },
    });
    expect(sect.pgMar?.top).toBe(1440);
    expect(sect.pgMar?.right).toBe(1440);
    expect(sect.pgMar?.bottom).toBe(1440);
    expect(sect.pgMar?.left).toBe(1440);
    expect(sect.pgMar?.header).toBe(720);
    expect(sect.pgMar?.footer).toBe(720);
    expect(sect.pgMar?.gutter).toBe(0);
  });

  it("converts columns", () => {
    const sect = convertSectionSpec({
      columns: { num: 2, space: 720, equalWidth: true },
    });
    expect(sect.cols?.num).toBe(2);
    expect(sect.cols?.space).toBe(720);
    expect(sect.cols?.equalWidth).toBe(true);
  });

  it("returns empty section for empty spec", () => {
    const sect = convertSectionSpec({});
    expect(sect.pgSz).toBeUndefined();
    expect(sect.pgMar).toBeUndefined();
    expect(sect.cols).toBeUndefined();
  });
});

// =============================================================================
// convertDocument
// =============================================================================

describe("convertDocument", () => {
  it("converts minimal document", () => {
    const doc = convertDocument({
      output: "test.docx",
      content: [{ type: "paragraph", runs: [{ text: "Hello" }] }],
    });
    expect(doc.body.content).toHaveLength(1);
    expect(doc.body.content[0].type).toBe("paragraph");
    expect(doc.body.sectPr).toBeUndefined();
    expect(doc.styles).toBeUndefined();
    expect(doc.numbering).toBeUndefined();
  });

  it("converts document with section", () => {
    const doc = convertDocument({
      output: "test.docx",
      content: [],
      section: { pageSize: { w: 12240, h: 15840 } },
    });
    expect(doc.body.sectPr?.pgSz?.w).toBe(12240);
  });

  it("converts document with styles", () => {
    const doc = convertDocument({
      output: "test.docx",
      content: [],
      styles: [{ type: "paragraph", styleId: "Normal", name: "Normal" }],
    });
    expect(doc.styles?.style).toHaveLength(1);
  });

  it("converts document with numbering", () => {
    const doc = convertDocument({
      output: "test.docx",
      content: [],
      numbering: [{ abstractNumId: 0, numId: 1, levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }] }],
    });
    expect(doc.numbering?.abstractNum).toHaveLength(1);
    expect(doc.numbering?.num).toHaveLength(1);
  });

  it("converts full document", () => {
    const doc = convertDocument({
      output: "report.docx",
      section: {
        pageSize: { w: 12240, h: 15840 },
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
      styles: [
        { type: "paragraph", styleId: "Heading1", name: "heading 1", run: { bold: true, fontSize: 32 } },
      ],
      numbering: [
        { abstractNumId: 0, numId: 1, levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }] },
      ],
      content: [
        { type: "paragraph", style: "Heading1", runs: [{ text: "Title", bold: true }] },
        { type: "paragraph", runs: [{ text: "Body text" }] },
        {
          type: "table",
          grid: [4320, 4320],
          rows: [{
            cells: [
              { content: [{ type: "paragraph", runs: [{ text: "A1" }] }] },
              { content: [{ type: "paragraph", runs: [{ text: "B1" }] }] },
            ],
          }],
        },
      ],
    });
    expect(doc.body.content).toHaveLength(3);
    expect(doc.body.content[0].type).toBe("paragraph");
    expect(doc.body.content[1].type).toBe("paragraph");
    expect(doc.body.content[2].type).toBe("table");
    expect(doc.body.sectPr?.pgSz?.w).toBe(12240);
    expect(doc.styles?.style).toHaveLength(1);
    expect(doc.numbering?.abstractNum).toHaveLength(1);
  });
});
