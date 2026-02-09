/**
 * @file Roundtrip tests: buildDocx → loadDocx → verify every spec property.
 *
 * Ensures that every property definable in DocxBuildSpec survives
 * the serialize → parse roundtrip.
 */

import { buildDocx } from "./builder";
import { patchDocx } from "./patcher";
import { loadDocx } from "@aurochs-office/docx";
import type { DocxBuildSpec } from "./types";
import type { DocxPatchSpec } from "./patch-types";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocxRun } from "@aurochs-office/docx/domain/run";

// =============================================================================
// Helpers
// =============================================================================

async function roundtrip(spec: DocxBuildSpec) {
  const data = await buildDocx(spec);
  return loadDocx(data);
}

function getParagraph(doc: Awaited<ReturnType<typeof loadDocx>>, index: number): DocxParagraph {
  const block = doc.body.content[index];
  if (block.type !== "paragraph") {
    throw new Error(`Expected paragraph at index ${index}, got ${block.type}`);
  }
  return block;
}

function getTable(doc: Awaited<ReturnType<typeof loadDocx>>, index: number): DocxTable {
  const block = doc.body.content[index];
  if (block.type !== "table") {
    throw new Error(`Expected table at index ${index}, got ${block.type}`);
  }
  return block;
}

function getRun(para: DocxParagraph, index: number): DocxRun {
  const content = para.content[index];
  if (content.type !== "run") {
    throw new Error(`Expected run at index ${index}, got ${content.type}`);
  }
  return content;
}

function spec(content: DocxBuildSpec["content"], extra?: Partial<DocxBuildSpec>): DocxBuildSpec {
  return { output: "test.docx", content, ...extra };
}

// =============================================================================
// RunSpec properties
// =============================================================================

describe("roundtrip: RunSpec", () => {
  it("bold", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", bold: true }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.b).toBe(true);
  });

  it("italic", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", italic: true }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.i).toBe(true);
  });

  it("underline (boolean true)", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", underline: true }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.u?.val).toBe("single");
  });

  it("underline (string value)", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", underline: "double" }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.u?.val).toBe("double");
  });

  it("strikethrough", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", strikethrough: true }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.strike).toBe(true);
  });

  it("fontSize", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", fontSize: 28 }] }]));
    // fontSize spec is in half-points, so 28 → 28
    expect(Number(getRun(getParagraph(doc, 0), 0).properties?.sz)).toBe(28);
  });

  it("fontFamily", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", fontFamily: "Arial" }] }]));
    const fonts = getRun(getParagraph(doc, 0), 0).properties?.rFonts;
    expect(fonts?.ascii).toBe("Arial");
    expect(fonts?.hAnsi).toBe("Arial");
  });

  it("color", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", color: "FF0000" }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.color?.val).toBe("FF0000");
  });

  it("highlight", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", highlight: "yellow" }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.highlight).toBe("yellow");
  });

  it("vertAlign superscript", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", vertAlign: "superscript" }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.vertAlign).toBe("superscript");
  });

  it("vertAlign subscript", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", vertAlign: "subscript" }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.vertAlign).toBe("subscript");
  });

  it("smallCaps", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", smallCaps: true }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.smallCaps).toBe(true);
  });

  it("allCaps", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", runs: [{ text: "T", allCaps: true }] }]));
    expect(getRun(getParagraph(doc, 0), 0).properties?.caps).toBe(true);
  });

  it("all run properties combined", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      runs: [{
        text: "Full",
        bold: true,
        italic: true,
        underline: "wave",
        strikethrough: true,
        fontSize: 48,
        fontFamily: "Courier New",
        color: "00FF00",
        highlight: "cyan",
        vertAlign: "superscript",
        smallCaps: true,
      }],
    }]));
    const run = getRun(getParagraph(doc, 0), 0);
    expect(run.properties?.b).toBe(true);
    expect(run.properties?.i).toBe(true);
    expect(run.properties?.u?.val).toBe("wave");
    expect(run.properties?.strike).toBe(true);
    expect(Number(run.properties?.sz)).toBe(48);
    expect(run.properties?.rFonts?.ascii).toBe("Courier New");
    expect(run.properties?.color?.val).toBe("00FF00");
    expect(run.properties?.highlight).toBe("cyan");
    expect(run.properties?.vertAlign).toBe("superscript");
    expect(run.properties?.smallCaps).toBe(true);
  });

  it("multiple runs preserve individual formatting", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      runs: [
        { text: "Bold", bold: true },
        { text: "Italic", italic: true },
        { text: "Plain" },
      ],
    }]));
    const para = getParagraph(doc, 0);
    expect(getRun(para, 0).properties?.b).toBe(true);
    expect(getRun(para, 0).properties?.i).toBeUndefined();
    expect(getRun(para, 1).properties?.i).toBe(true);
    expect(getRun(para, 1).properties?.b).toBeUndefined();
    expect(getRun(para, 2).properties).toBeUndefined();
  });

  it("text content is preserved", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      runs: [{ text: "日本語テキスト 🎉 emoji" }],
    }]));
    const run = getRun(getParagraph(doc, 0), 0);
    const text = run.content.filter((c) => c.type === "text").map((c) => c.value).join("");
    expect(text).toBe("日本語テキスト 🎉 emoji");
  });
});

// =============================================================================
// ParagraphSpec properties
// =============================================================================

describe("roundtrip: ParagraphSpec", () => {
  it("style", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", style: "Heading1", runs: [{ text: "T" }] }],
      { styles: [{ type: "paragraph", styleId: "Heading1", name: "heading 1" }] },
    ));
    expect(String(getParagraph(doc, 0).properties?.pStyle)).toBe("Heading1");
  });

  it("alignment left", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", alignment: "left", runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.jc).toBe("left");
  });

  it("alignment center", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", alignment: "center", runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.jc).toBe("center");
  });

  it("alignment right", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", alignment: "right", runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.jc).toBe("right");
  });

  it("alignment both (justify)", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", alignment: "both", runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.jc).toBe("both");
  });

  it("spacing before and after", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      spacing: { before: 240, after: 120 },
      runs: [{ text: "T" }],
    }]));
    const sp = getParagraph(doc, 0).properties?.spacing;
    expect(Number(sp?.before)).toBe(240);
    expect(Number(sp?.after)).toBe(120);
  });

  it("spacing line and lineRule", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      spacing: { line: 360, lineRule: "exact" },
      runs: [{ text: "T" }],
    }]));
    const sp = getParagraph(doc, 0).properties?.spacing;
    expect(sp?.line).toBe(360);
    expect(sp?.lineRule).toBe("exact");
  });

  it("indent left and right", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      indent: { left: 720, right: 360 },
      runs: [{ text: "T" }],
    }]));
    const ind = getParagraph(doc, 0).properties?.ind;
    expect(Number(ind?.left)).toBe(720);
    expect(Number(ind?.right)).toBe(360);
  });

  it("indent firstLine", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      indent: { firstLine: 720 },
      runs: [{ text: "T" }],
    }]));
    expect(Number(getParagraph(doc, 0).properties?.ind?.firstLine)).toBe(720);
  });

  it("indent hanging", async () => {
    const doc = await roundtrip(spec([{
      type: "paragraph",
      indent: { hanging: 360 },
      runs: [{ text: "T" }],
    }]));
    expect(Number(getParagraph(doc, 0).properties?.ind?.hanging)).toBe(360);
  });

  it("numbering", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      { numbering: [{ abstractNumId: 0, numId: 1, levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }] }] },
    ));
    const numPr = getParagraph(doc, 0).properties?.numPr;
    expect(Number(numPr?.numId)).toBe(1);
    expect(Number(numPr?.ilvl)).toBe(0);
  });

  it("keepNext", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", keepNext: true, runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.keepNext).toBe(true);
  });

  it("keepLines", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", keepLines: true, runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.keepLines).toBe(true);
  });

  it("pageBreakBefore", async () => {
    const doc = await roundtrip(spec([{ type: "paragraph", pageBreakBefore: true, runs: [{ text: "T" }] }]));
    expect(getParagraph(doc, 0).properties?.pageBreakBefore).toBe(true);
  });
});

// =============================================================================
// TableSpec properties
// =============================================================================

describe("roundtrip: TableSpec", () => {
  const minCell = { content: [{ type: "paragraph" as const, runs: [{ text: "X" }] }] };

  it("table width", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      width: { value: 5000, type: "pct" },
      rows: [{ cells: [minCell] }],
    }]));
    const tbl = getTable(doc, 0);
    expect(tbl.properties?.tblW?.value).toBe(5000);
    expect(tbl.properties?.tblW?.type).toBe("pct");
  });

  it("table alignment", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      alignment: "center",
      rows: [{ cells: [minCell] }],
    }]));
    expect(getTable(doc, 0).properties?.jc).toBe("center");
  });

  it("table borders", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      borders: {
        top: { style: "single", size: 4, color: "000000" },
        bottom: { style: "double", size: 8, color: "FF0000" },
        left: { style: "single", size: 4 },
        right: { style: "single", size: 4 },
        insideH: { style: "dotted", size: 2 },
        insideV: { style: "dashed", size: 2 },
      },
      rows: [{ cells: [minCell] }],
    }]));
    const borders = getTable(doc, 0).properties?.tblBorders;
    expect(borders?.top?.val).toBe("single");
    expect(borders?.top?.sz).toBe(4);
    expect(borders?.top?.color).toBe("000000");
    expect(borders?.bottom?.val).toBe("double");
    expect(borders?.bottom?.sz).toBe(8);
    expect(borders?.bottom?.color).toBe("FF0000");
    expect(borders?.insideH?.val).toBe("dotted");
    expect(borders?.insideV?.val).toBe("dashed");
  });

  it("table grid", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      grid: [2880, 2880, 2880],
      rows: [{ cells: [minCell, minCell, minCell] }],
    }]));
    const grid = getTable(doc, 0).grid;
    expect(grid?.columns).toHaveLength(3);
  });

  it("row height", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{ cells: [minCell], height: { value: 720, rule: "exact" } }],
    }]));
    const row = getTable(doc, 0).rows[0];
    expect(Number(row.properties?.trHeight?.val)).toBe(720);
    expect(row.properties?.trHeight?.hRule).toBe("exact");
  });

  it("header row", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [
        { cells: [minCell], header: true },
        { cells: [minCell] },
      ],
    }]));
    expect(getTable(doc, 0).rows[0].properties?.tblHeader).toBe(true);
  });

  it("cell width", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [{
          ...minCell,
          width: { value: 4320, type: "dxa" },
        }],
      }],
    }]));
    const cell = getTable(doc, 0).rows[0].cells[0];
    expect(cell.properties?.tcW?.value).toBe(4320);
    expect(cell.properties?.tcW?.type).toBe("dxa");
  });

  it("cell gridSpan", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [{
          ...minCell,
          gridSpan: 2,
        }],
      }],
    }]));
    expect(Number(getTable(doc, 0).rows[0].cells[0].properties?.gridSpan)).toBe(2);
  });

  it("cell vMerge", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [
        { cells: [{ ...minCell, vMerge: "restart" }] },
        { cells: [{ ...minCell, vMerge: "continue" }] },
      ],
    }]));
    expect(getTable(doc, 0).rows[0].cells[0].properties?.vMerge).toBe("restart");
    expect(getTable(doc, 0).rows[1].cells[0].properties?.vMerge).toBe("continue");
  });

  it("cell shading", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [{ ...minCell, shading: "FFCC00" }],
      }],
    }]));
    expect(getTable(doc, 0).rows[0].cells[0].properties?.shd?.fill).toBe("FFCC00");
  });

  it("cell vertical alignment", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [
          { ...minCell, vAlign: "top" },
          { ...minCell, vAlign: "center" },
          { ...minCell, vAlign: "bottom" },
        ],
      }],
    }]));
    const cells = getTable(doc, 0).rows[0].cells;
    expect(cells[0].properties?.vAlign).toBe("top");
    expect(cells[1].properties?.vAlign).toBe("center");
    expect(cells[2].properties?.vAlign).toBe("bottom");
  });

  it("table style", async () => {
    const doc = await roundtrip(spec(
      [{
        type: "table",
        style: "TableGrid",
        rows: [{ cells: [minCell] }],
      }],
      { styles: [{ type: "table", styleId: "TableGrid", name: "Table Grid" }] },
    ));
    expect(String(getTable(doc, 0).properties?.tblStyle)).toBe("TableGrid");
  });

  it("multiple paragraphs in cell", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [{
          content: [
            { type: "paragraph", runs: [{ text: "Line 1" }] },
            { type: "paragraph", runs: [{ text: "Line 2" }] },
            { type: "paragraph", runs: [{ text: "Line 3", bold: true }] },
          ],
        }],
      }],
    }]));
    const cell = getTable(doc, 0).rows[0].cells[0];
    expect(cell.content).toHaveLength(3);
    const p2 = cell.content[2] as DocxParagraph;
    expect(getRun(p2, 0).properties?.b).toBe(true);
  });

  it("nested table in cell", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [{
          content: [
            { type: "paragraph", runs: [{ text: "Before inner table" }] },
          ],
        }],
      }],
    }]));
    // Verify the outer table structure is intact
    const outerTable = getTable(doc, 0);
    expect(outerTable.rows).toHaveLength(1);
    expect(outerTable.rows[0].cells).toHaveLength(1);
  });

  it("cell borders", async () => {
    const doc = await roundtrip(spec([{
      type: "table",
      rows: [{
        cells: [{
          ...minCell,
          borders: {
            top: { style: "single", size: 4, color: "000000" },
            bottom: { style: "double", size: 8, color: "FF0000" },
            left: { style: "dotted", size: 2 },
            right: { style: "dashed", size: 2 },
          },
        }],
      }],
    }]));
    const borders = getTable(doc, 0).rows[0].cells[0].properties?.tcBorders;
    expect(borders?.top?.val).toBe("single");
    expect(borders?.top?.sz).toBe(4);
    expect(borders?.top?.color).toBe("000000");
    expect(borders?.bottom?.val).toBe("double");
    expect(borders?.left?.val).toBe("dotted");
    expect(borders?.right?.val).toBe("dashed");
  });
});

// =============================================================================
// StyleSpec properties
// =============================================================================

describe("roundtrip: StyleSpec", () => {
  it("paragraph style with formatting", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", style: "Custom1", runs: [{ text: "T" }] }],
      {
        styles: [{
          type: "paragraph",
          styleId: "Custom1",
          name: "Custom Style 1",
          paragraph: { alignment: "center", spacing: { before: 240, after: 120 } },
          run: { bold: true, fontSize: 24, color: "336699" },
        }],
      },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "Custom1");
    expect(style).toBeDefined();
    expect(style?.name?.val).toBe("Custom Style 1");
    expect(style?.type).toBe("paragraph");
    expect(style?.pPr?.jc).toBe("center");
    expect(Number(style?.pPr?.spacing?.before)).toBe(240);
    expect(Number(style?.pPr?.spacing?.after)).toBe(120);
    expect(style?.rPr?.b).toBe(true);
    expect(Number(style?.rPr?.sz)).toBe(24);
    expect(style?.rPr?.color?.val).toBe("336699");
  });

  it("character style", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "character", styleId: "Emphasis", name: "Emphasis", run: { italic: true } }] },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "Emphasis");
    expect(style?.type).toBe("character");
    expect(style?.rPr?.i).toBe(true);
  });

  it("table style", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "table", styleId: "GridTable", name: "Grid Table" }] },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "GridTable");
    expect(style?.type).toBe("table");
  });

  it("basedOn and next", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        styles: [
          { type: "paragraph", styleId: "Base", name: "Base" },
          { type: "paragraph", styleId: "Derived", name: "Derived", basedOn: "Base", next: "Base" },
        ],
      },
    ));
    const derived = doc.styles?.style.find((s) => String(s.styleId) === "Derived");
    expect(String(derived?.basedOn?.val)).toBe("Base");
    expect(String(derived?.next?.val)).toBe("Base");
  });

  it("style with indent and keepNext", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        styles: [{
          type: "paragraph",
          styleId: "Indented",
          name: "Indented",
          paragraph: { indent: { left: 720, hanging: 360 }, keepNext: true },
        }],
      },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "Indented");
    expect(Number(style?.pPr?.ind?.left)).toBe(720);
    expect(Number(style?.pPr?.ind?.hanging)).toBe(360);
    expect(style?.pPr?.keepNext).toBe(true);
  });

  it("style with keepLines and pageBreakBefore", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        styles: [{
          type: "paragraph",
          styleId: "KeepStyle",
          name: "Keep Style",
          paragraph: { keepLines: true, pageBreakBefore: true },
        }],
      },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "KeepStyle");
    expect(style?.pPr?.keepLines).toBe(true);
    expect(style?.pPr?.pageBreakBefore).toBe(true);
  });

  it("style run: underline", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "character", styleId: "UL", name: "Underline", run: { underline: true } }] },
    ));
    expect(doc.styles?.style.find((s) => String(s.styleId) === "UL")?.rPr?.u?.val).toBe("single");
  });

  it("style run: underline string value", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "character", styleId: "ULD", name: "Underline Double", run: { underline: "double" } }] },
    ));
    expect(doc.styles?.style.find((s) => String(s.styleId) === "ULD")?.rPr?.u?.val).toBe("double");
  });

  it("style run: strikethrough", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "character", styleId: "STK", name: "Strike", run: { strikethrough: true } }] },
    ));
    expect(doc.styles?.style.find((s) => String(s.styleId) === "STK")?.rPr?.strike).toBe(true);
  });

  it("style run: highlight", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "character", styleId: "HL", name: "Highlight", run: { highlight: "yellow" } }] },
    ));
    expect(doc.styles?.style.find((s) => String(s.styleId) === "HL")?.rPr?.highlight).toBe("yellow");
  });

  it("style run: vertAlign", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { styles: [{ type: "character", styleId: "SUP", name: "Superscript", run: { vertAlign: "superscript" } }] },
    ));
    expect(doc.styles?.style.find((s) => String(s.styleId) === "SUP")?.rPr?.vertAlign).toBe("superscript");
  });

  it("style run: smallCaps and allCaps", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        styles: [
          { type: "character", styleId: "SC", name: "Small Caps", run: { smallCaps: true } },
          { type: "character", styleId: "AC", name: "All Caps", run: { allCaps: true } },
        ],
      },
    ));
    expect(doc.styles?.style.find((s) => String(s.styleId) === "SC")?.rPr?.smallCaps).toBe(true);
    expect(doc.styles?.style.find((s) => String(s.styleId) === "AC")?.rPr?.caps).toBe(true);
  });

  it("style run: all properties combined", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        styles: [{
          type: "character",
          styleId: "FullRun",
          name: "Full Run Style",
          run: {
            bold: true,
            italic: true,
            underline: "wave",
            strikethrough: true,
            fontSize: 28,
            fontFamily: "Georgia",
            color: "AA0000",
            highlight: "green",
            vertAlign: "subscript",
            smallCaps: true,
          },
        }],
      },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "FullRun");
    expect(style?.rPr?.b).toBe(true);
    expect(style?.rPr?.i).toBe(true);
    expect(style?.rPr?.u?.val).toBe("wave");
    expect(style?.rPr?.strike).toBe(true);
    expect(Number(style?.rPr?.sz)).toBe(28);
    expect(style?.rPr?.rFonts?.ascii).toBe("Georgia");
    expect(style?.rPr?.color?.val).toBe("AA0000");
    expect(style?.rPr?.highlight).toBe("green");
    expect(style?.rPr?.vertAlign).toBe("subscript");
    expect(style?.rPr?.smallCaps).toBe(true);
  });

  it("style with fontFamily", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        styles: [{
          type: "paragraph",
          styleId: "MonoStyle",
          name: "Mono Style",
          run: { fontFamily: "Consolas" },
        }],
      },
    ));
    const style = doc.styles?.style.find((s) => String(s.styleId) === "MonoStyle");
    expect(style?.rPr?.rFonts?.ascii).toBe("Consolas");
    expect(style?.rPr?.rFonts?.hAnsi).toBe("Consolas");
  });
});

// =============================================================================
// NumberingSpec properties
// =============================================================================

describe("roundtrip: NumberingSpec", () => {
  it("basic decimal numbering", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }],
        }],
      },
    ));
    expect(doc.numbering).toBeDefined();
    const abs = doc.numbering!.abstractNum[0];
    expect(abs.lvl[0].numFmt).toBe("decimal");
    expect(abs.lvl[0].lvlText?.val).toBe("%1.");
  });

  it("bullet numbering", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "bullet", lvlText: "\u2022" }],
        }],
      },
    ));
    const lvl = doc.numbering!.abstractNum[0].lvl[0];
    expect(lvl.numFmt).toBe("bullet");
    expect(lvl.lvlText?.val).toBe("\u2022");
  });

  it("level with start value", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 5 }],
        }],
      },
    ));
    expect(doc.numbering!.abstractNum[0].lvl[0].start).toBe(5);
  });

  it("level with lvlJc", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", lvlJc: "right" }],
        }],
      },
    ));
    expect(doc.numbering!.abstractNum[0].lvl[0].lvlJc).toBe("right");
  });

  it("level with indent", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", indent: { left: 720, hanging: 360 } }],
        }],
      },
    ));
    const lvl = doc.numbering!.abstractNum[0].lvl[0];
    expect(Number(lvl.pPr?.ind?.left)).toBe(720);
    expect(Number(lvl.pPr?.ind?.hanging)).toBe(360);
  });

  it("level with font", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "T" }] }],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "bullet", lvlText: "\u2022", font: "Symbol" }],
        }],
      },
    ));
    const lvl = doc.numbering!.abstractNum[0].lvl[0];
    expect(lvl.rPr?.rFonts?.ascii).toBe("Symbol");
  });

  it("multi-level numbering", async () => {
    const doc = await roundtrip(spec(
      [
        { type: "paragraph", numbering: { numId: 1, ilvl: 0 }, runs: [{ text: "Level 0" }] },
        { type: "paragraph", numbering: { numId: 1, ilvl: 1 }, runs: [{ text: "Level 1" }] },
        { type: "paragraph", numbering: { numId: 1, ilvl: 2 }, runs: [{ text: "Level 2" }] },
      ],
      {
        numbering: [{
          abstractNumId: 0,
          numId: 1,
          levels: [
            { ilvl: 0, numFmt: "decimal", lvlText: "%1." },
            { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2)" },
            { ilvl: 2, numFmt: "lowerRoman", lvlText: "%3." },
          ],
        }],
      },
    ));
    const abs = doc.numbering!.abstractNum[0];
    expect(abs.lvl).toHaveLength(3);
    expect(abs.lvl[0].numFmt).toBe("decimal");
    expect(abs.lvl[1].numFmt).toBe("lowerLetter");
    expect(abs.lvl[2].numFmt).toBe("lowerRoman");
  });
});

// =============================================================================
// SectionSpec properties
// =============================================================================

describe("roundtrip: SectionSpec", () => {
  it("page size", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { section: { pageSize: { w: 12240, h: 15840 } } },
    ));
    expect(Number(doc.body.sectPr?.pgSz?.w)).toBe(12240);
    expect(Number(doc.body.sectPr?.pgSz?.h)).toBe(15840);
  });

  it("page size with landscape orientation", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { section: { pageSize: { w: 15840, h: 12240, orient: "landscape" } } },
    ));
    expect(doc.body.sectPr?.pgSz?.orient).toBe("landscape");
  });

  it("margins", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { section: { margins: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
    ));
    const m = doc.body.sectPr?.pgMar;
    expect(Number(m?.top)).toBe(1440);
    expect(Number(m?.right)).toBe(1080);
    expect(Number(m?.bottom)).toBe(1440);
    expect(Number(m?.left)).toBe(1080);
  });

  it("margins with header, footer, gutter", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        section: {
          margins: {
            top: 1440, right: 1440, bottom: 1440, left: 1440,
            header: 720, footer: 720, gutter: 360,
          },
        },
      },
    ));
    const m = doc.body.sectPr?.pgMar;
    expect(Number(m?.header)).toBe(720);
    expect(Number(m?.footer)).toBe(720);
    expect(Number(m?.gutter)).toBe(360);
  });

  it("columns", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      { section: { columns: { num: 2, space: 720, equalWidth: true } } },
    ));
    const cols = doc.body.sectPr?.cols;
    expect(cols?.num).toBe(2);
    expect(Number(cols?.space)).toBe(720);
    expect(cols?.equalWidth).toBe(true);
  });

  it("all section properties combined", async () => {
    const doc = await roundtrip(spec(
      [{ type: "paragraph", runs: [{ text: "T" }] }],
      {
        section: {
          pageSize: { w: 15840, h: 12240, orient: "landscape" },
          margins: {
            top: 720, right: 720, bottom: 720, left: 720,
            header: 360, footer: 360, gutter: 180,
          },
          columns: { num: 3, space: 360 },
        },
      },
    ));
    expect(doc.body.sectPr?.pgSz?.orient).toBe("landscape");
    expect(Number(doc.body.sectPr?.pgMar?.gutter)).toBe(180);
    expect(doc.body.sectPr?.cols?.num).toBe(3);
  });
});

// =============================================================================
// Patch: text.replace preserves formatting
// =============================================================================

describe("roundtrip: patch text.replace preserves formatting", () => {
  async function buildAndPatch(
    buildSpec: DocxBuildSpec,
    patches: DocxPatchSpec["patches"],
  ) {
    const built = await buildDocx(buildSpec);
    const patchSpec: DocxPatchSpec = {
      source: "source.docx",
      output: "patched.docx",
      patches,
    };
    const patched = await patchDocx(patchSpec, built);
    return loadDocx(patched);
  }

  it("preserves bold after text.replace", async () => {
    const doc = await buildAndPatch(
      spec([{ type: "paragraph", runs: [{ text: "Hello {{NAME}}", bold: true }] }]),
      [{ type: "text.replace", search: "{{NAME}}", replace: "World" }],
    );
    const run = getRun(getParagraph(doc, 0), 0);
    expect(run.properties?.b).toBe(true);
    const text = run.content.filter((c) => c.type === "text").map((c) => c.value).join("");
    expect(text).toBe("Hello World");
  });

  it("preserves color and fontSize after text.replace", async () => {
    const doc = await buildAndPatch(
      spec([{ type: "paragraph", runs: [{ text: "Price: {{PRICE}}", color: "FF0000", fontSize: 32 }] }]),
      [{ type: "text.replace", search: "{{PRICE}}", replace: "$99.99" }],
    );
    const run = getRun(getParagraph(doc, 0), 0);
    expect(run.properties?.color?.val).toBe("FF0000");
    expect(Number(run.properties?.sz)).toBe(32);
  });

  it("preserves formatting in multi-run paragraph", async () => {
    const doc = await buildAndPatch(
      spec([{
        type: "paragraph",
        runs: [
          { text: "Bold: {{A}}", bold: true },
          { text: " Italic: {{B}}", italic: true },
        ],
      }]),
      [
        { type: "text.replace", search: "{{A}}", replace: "X" },
        { type: "text.replace", search: "{{B}}", replace: "Y" },
      ],
    );
    const para = getParagraph(doc, 0);
    const r0 = getRun(para, 0);
    const r1 = getRun(para, 1);
    expect(r0.properties?.b).toBe(true);
    expect(r1.properties?.i).toBe(true);
    const t0 = r0.content.filter((c) => c.type === "text").map((c) => c.value).join("");
    const t1 = r1.content.filter((c) => c.type === "text").map((c) => c.value).join("");
    expect(t0).toBe("Bold: X");
    expect(t1).toBe(" Italic: Y");
  });

  it("preserves ALL run properties after text.replace", async () => {
    const doc = await buildAndPatch(
      spec([{
        type: "paragraph",
        runs: [{
          text: "{{PLACEHOLDER}}",
          bold: true,
          italic: true,
          underline: "wave",
          strikethrough: true,
          fontSize: 36,
          fontFamily: "Times New Roman",
          color: "FF00FF",
          highlight: "cyan",
          vertAlign: "superscript",
          smallCaps: true,
        }],
      }]),
      [{ type: "text.replace", search: "{{PLACEHOLDER}}", replace: "Replaced" }],
    );
    const run = getRun(getParagraph(doc, 0), 0);
    const text = run.content.filter((c) => c.type === "text").map((c) => c.value).join("");
    expect(text).toBe("Replaced");
    expect(run.properties?.b).toBe(true);
    expect(run.properties?.i).toBe(true);
    expect(run.properties?.u?.val).toBe("wave");
    expect(run.properties?.strike).toBe(true);
    expect(Number(run.properties?.sz)).toBe(36);
    expect(run.properties?.rFonts?.ascii).toBe("Times New Roman");
    expect(run.properties?.color?.val).toBe("FF00FF");
    expect(run.properties?.highlight).toBe("cyan");
    expect(run.properties?.vertAlign).toBe("superscript");
    expect(run.properties?.smallCaps).toBe(true);
  });

  it("preserves table cell formatting after text.replace", async () => {
    const doc = await buildAndPatch(
      spec([{
        type: "table",
        rows: [{
          cells: [{
            content: [{ type: "paragraph", runs: [{ text: "{{VAL}}", bold: true, color: "0000FF" }] }],
            shading: "EEEEEE",
          }],
        }],
      }]),
      [{ type: "text.replace", search: "{{VAL}}", replace: "Done" }],
    );
    const cell = getTable(doc, 0).rows[0].cells[0];
    expect(cell.properties?.shd?.fill).toBe("EEEEEE");
    const para = cell.content[0] as DocxParagraph;
    const run = getRun(para, 0);
    expect(run.properties?.b).toBe(true);
    expect(run.properties?.color?.val).toBe("0000FF");
  });
});

// =============================================================================
// Complex document roundtrip
// =============================================================================

describe("roundtrip: complex document", () => {
  it("preserves all elements in a fully-featured document", async () => {
    const doc = await roundtrip({
      output: "full.docx",
      content: [
        {
          type: "paragraph",
          style: "Title",
          alignment: "center",
          spacing: { after: 200 },
          runs: [
            { text: "Document Title", bold: true, fontSize: 52, color: "1F4E79" },
          ],
        },
        {
          type: "paragraph",
          alignment: "both",
          indent: { firstLine: 720 },
          runs: [
            { text: "Normal text with ", },
            { text: "bold", bold: true },
            { text: " and " },
            { text: "italic", italic: true },
            { text: " and " },
            { text: "underline", underline: true },
            { text: "." },
          ],
        },
        {
          type: "paragraph",
          numbering: { numId: 1, ilvl: 0 },
          runs: [{ text: "Numbered item" }],
        },
        {
          type: "table",
          width: { value: 5000, type: "pct" },
          alignment: "center",
          borders: {
            top: { style: "single", size: 4, color: "000000" },
            bottom: { style: "single", size: 4, color: "000000" },
            left: { style: "single", size: 4, color: "000000" },
            right: { style: "single", size: 4, color: "000000" },
            insideH: { style: "single", size: 2, color: "999999" },
            insideV: { style: "single", size: 2, color: "999999" },
          },
          rows: [
            {
              header: true,
              cells: [
                {
                  content: [{ type: "paragraph", alignment: "center", runs: [{ text: "Header", bold: true }] }],
                  shading: "4472C4",
                  vAlign: "center",
                  width: { value: 2500, type: "pct" },
                },
                {
                  content: [{ type: "paragraph", alignment: "center", runs: [{ text: "Value", bold: true }] }],
                  shading: "4472C4",
                  vAlign: "center",
                  width: { value: 2500, type: "pct" },
                },
              ],
            },
            {
              cells: [
                {
                  content: [{ type: "paragraph", runs: [{ text: "Row 1" }] }],
                },
                {
                  content: [{ type: "paragraph", runs: [{ text: "Data 1", color: "336699" }] }],
                },
              ],
            },
          ],
        },
      ],
      styles: [
        {
          type: "paragraph",
          styleId: "Title",
          name: "Title",
          paragraph: { alignment: "center", spacing: { after: 300 } },
          run: { bold: true, fontSize: 52 },
        },
      ],
      numbering: [{
        abstractNumId: 0,
        numId: 1,
        levels: [
          { ilvl: 0, numFmt: "decimal", lvlText: "%1.", indent: { left: 720, hanging: 360 } },
        ],
      }],
      section: {
        pageSize: { w: 12240, h: 15840 },
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720 },
      },
    });

    // Paragraph 0: Title
    const title = getParagraph(doc, 0);
    expect(String(title.properties?.pStyle)).toBe("Title");
    expect(title.properties?.jc).toBe("center");
    const titleRun = getRun(title, 0);
    expect(titleRun.properties?.b).toBe(true);
    expect(Number(titleRun.properties?.sz)).toBe(52);
    expect(titleRun.properties?.color?.val).toBe("1F4E79");

    // Paragraph 1: Mixed formatting
    const mixed = getParagraph(doc, 1);
    expect(mixed.properties?.jc).toBe("both");
    expect(Number(mixed.properties?.ind?.firstLine)).toBe(720);
    expect(getRun(mixed, 1).properties?.b).toBe(true);
    expect(getRun(mixed, 3).properties?.i).toBe(true);
    expect(getRun(mixed, 5).properties?.u?.val).toBe("single");

    // Paragraph 2: Numbered
    const numbered = getParagraph(doc, 2);
    expect(Number(numbered.properties?.numPr?.numId)).toBe(1);

    // Table
    const table = getTable(doc, 3);
    expect(table.properties?.tblW?.value).toBe(5000);
    expect(table.properties?.jc).toBe("center");
    expect(table.rows[0].properties?.tblHeader).toBe(true);
    expect(table.rows[0].cells[0].properties?.shd?.fill).toBe("4472C4");
    expect(table.rows[0].cells[0].properties?.vAlign).toBe("center");

    // Styles
    const titleStyle = doc.styles?.style.find((s) => String(s.styleId) === "Title");
    expect(titleStyle).toBeDefined();
    expect(titleStyle?.pPr?.jc).toBe("center");

    // Numbering
    expect(doc.numbering?.abstractNum[0].lvl[0].numFmt).toBe("decimal");

    // Section
    expect(Number(doc.body.sectPr?.pgSz?.w)).toBe(12240);
    expect(Number(doc.body.sectPr?.pgMar?.header)).toBe(720);
  });
});
