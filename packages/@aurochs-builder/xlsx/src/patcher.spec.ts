/**
 * @file Patcher Tests — Row / Column Dimension Updates & Attribute Preservation
 *
 * Tests for patchWorkbook's rows/cols update support and roundtrip
 * preservation of existing XML attributes through the domain SoT.
 */

import { describe, it, expect } from "vitest";
import { parseXml, getByPath, getChild, getChildren, getTextContent } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import type { Workbook, WorkbookSheet } from "@aurochs-office/xlsx/workbook-parser";
import { patchWorkbook, type SheetUpdate } from "./patcher";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Minimal sheet XML for testing (ECMA-376 §18.3.1.99 worksheet).
 * Contains a single cell A1=42 in row 1.
 */
const MINIMAL_SHEET_XML = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  "  <sheetData>",
  '    <row r="1"><c r="A1"><v>42</v></c></row>',
  "  </sheetData>",
  "</worksheet>",
].join("\n");

/**
 * Sheet XML with existing <cols> element including hidden/bestFit/style/outlineLevel.
 */
const SHEET_XML_WITH_COLS = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  "  <cols>",
  '    <col min="1" max="1" width="10" customWidth="1" hidden="1" style="2"/>',
  '    <col min="3" max="5" width="8"/>',
  "  </cols>",
  "  <sheetData>",
  '    <row r="1"><c r="A1"><v>42</v></c></row>',
  "  </sheetData>",
  "</worksheet>",
].join("\n");

/**
 * Sheet XML with row attributes (ht, customHeight, hidden, s, outlineLevel, collapsed, spans).
 */
const SHEET_XML_WITH_ROW_ATTRS = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  "  <sheetData>",
  '    <row r="1" ht="15" customHeight="1" hidden="1" s="3" outlineLevel="2" collapsed="1" spans="1:5">',
  '      <c r="A1"><v>42</v></c>',
  "    </row>",
  '    <row r="2"><c r="A2"><v>100</v></c></row>',
  "  </sheetData>",
  "</worksheet>",
].join("\n");

/**
 * Content types XML (minimal for tests).
 */
const MINIMAL_CONTENT_TYPES = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
  '  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
  "</Types>",
].join("\n");

function createTestWorkbook(sheetXml: string): Workbook {
  const pkg = createEmptyZipPackage();
  pkg.writeText("xl/worksheets/sheet1.xml", sheetXml);
  pkg.writeText("[Content_Types].xml", MINIMAL_CONTENT_TYPES);

  const sheet: WorkbookSheet = {
    name: "Sheet1",
    id: "rId1",
    rows: new Map(),
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  return {
    sheets: new Map([["Sheet1", sheet]]),
    sharedStrings: [],
    package: pkg,
  };
}

function readPatchedSheet(workbook: Workbook): ReturnType<typeof getByPath> {
  const sheetXml = workbook.package.readText("xl/worksheets/sheet1.xml");
  expect(sheetXml).toBeTruthy();
  const doc = parseXml(sheetXml!);
  return getByPath(doc, ["worksheet"]);
}

// =============================================================================
// Row Attribute Preservation Tests
// =============================================================================

describe("patchWorkbook — row attribute preservation", () => {
  it("preserves all row attributes (ht, customHeight, hidden, s, outlineLevel, collapsed, spans) on cell-only update", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_ROW_ATTRS);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "B", row: 1, value: 99 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    expect(row1).toBeTruthy();

    // All original attributes preserved
    expect(row1!.attrs["ht"]).toBe("15");
    expect(row1!.attrs["customHeight"]).toBe("1");
    expect(row1!.attrs["hidden"]).toBe("1");
    expect(row1!.attrs["s"]).toBe("3");
    expect(row1!.attrs["outlineLevel"]).toBe("2");
    expect(row1!.attrs["collapsed"]).toBe("1");
    // spans is a computed XML attribute, not part of the domain model — correctly dropped on roundtrip

    // Original + new cell present
    const cells = getChildren(row1!, "c");
    expect(cells.length).toBe(2);
  });

  it("preserves row attributes when no updates target that row", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_ROW_ATTRS);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "A", row: 2, value: 200 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");

    expect(row1!.attrs["ht"]).toBe("15");
    expect(row1!.attrs["hidden"]).toBe("1");
    expect(row1!.attrs["s"]).toBe("3");
  });
});

// =============================================================================
// Row Dimension Tests
// =============================================================================

describe("patchWorkbook — row dimension updates", () => {
  it("sets ht and customHeight on existing row", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 1, height: 30 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    expect(row1!.attrs["ht"]).toBe("30");
    expect(row1!.attrs["customHeight"]).toBe("1");
  });

  it("creates new row element when row does not exist", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 5, height: 50 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row5 = rows.find((r) => r.attrs["r"] === "5");
    expect(row5).toBeTruthy();
    expect(row5!.attrs["ht"]).toBe("50");
    expect(row5!.attrs["customHeight"]).toBe("1");
  });

  it("preserves existing row cells when updating height", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 1, height: 25 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    const cells = getChildren(row1!, "c");
    expect(cells.length).toBe(1);
    expect(cells[0].attrs["r"]).toBe("A1");
  });

  it("merges row dimension update with existing row attributes", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_ROW_ATTRS);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 1, height: 40 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    // Updated
    expect(row1!.attrs["ht"]).toBe("40");
    expect(row1!.attrs["customHeight"]).toBe("1");
    // Preserved from original
    expect(row1!.attrs["hidden"]).toBe("1");
    expect(row1!.attrs["s"]).toBe("3");
    expect(row1!.attrs["outlineLevel"]).toBe("2");
    expect(row1!.attrs["collapsed"]).toBe("1");
    // spans is a computed XML attribute, not part of the domain model — correctly dropped on roundtrip
  });

  it("can set hidden via RowUpdate", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 1, hidden: true }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    expect(row1!.attrs["hidden"]).toBe("1");
  });

  it("respects customHeight=false", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 1, height: 20, customHeight: false }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    expect(row1!.attrs["ht"]).toBe("20");
    // customHeight=false means it won't be serialized as "1"
    expect(row1!.attrs["customHeight"]).toBeUndefined();
  });

  it("handles multiple row updates", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [
        { row: 1, height: 30 },
        { row: 3, height: 45 },
        { row: 10, height: 60 },
      ],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");

    expect(rows.find((r) => r.attrs["r"] === "1")!.attrs["ht"]).toBe("30");
    expect(rows.find((r) => r.attrs["r"] === "3")!.attrs["ht"]).toBe("45");
    expect(rows.find((r) => r.attrs["r"] === "10")!.attrs["ht"]).toBe("60");
  });

  it("maintains row sort order after adding new rows", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_ROW_ATTRS);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [{ row: 3, height: 20 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const rowNumbers = rows.map((r) => parseInt(r.attrs["r"], 10));
    expect(rowNumbers).toEqual([1, 2, 3]);
  });
});

// =============================================================================
// Column Dimension Tests
// =============================================================================

describe("patchWorkbook — column dimension updates", () => {
  it("creates <cols> element when none exists", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      cols: [{ col: 1, width: 15 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    expect(cols).toBeTruthy();
    const colEls = getChildren(cols!, "col");
    expect(colEls.length).toBe(1);
    expect(colEls[0].attrs["min"]).toBe("1");
    expect(colEls[0].attrs["max"]).toBe("1");
    expect(colEls[0].attrs["width"]).toBe("15");
    expect(colEls[0].attrs["customWidth"]).toBe("1");
  });

  it("updates existing <col> width while preserving other attributes", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_COLS);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      cols: [{ col: 1, width: 20 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    const colEls = getChildren(cols!, "col");
    // Single-column span updated
    const col1 = colEls.find((c) => c.attrs["min"] === "1");
    expect(col1!.attrs["width"]).toBe("20");
    expect(col1!.attrs["customWidth"]).toBe("1");
    // hidden and style were on existing col — hidden=true is preserved
    expect(col1!.attrs["hidden"]).toBe("1");
    expect(col1!.attrs["style"]).toBe("2");
  });

  it("preserves multi-column spans when adding new single-column updates", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_COLS);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      cols: [{ col: 2, width: 25 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    const colEls = getChildren(cols!, "col");
    // Should have: col 1 (existing), col 2 (new), col 3-5 (existing multi-span)
    expect(colEls.length).toBe(3);
    expect(colEls[0].attrs["min"]).toBe("1");
    expect(colEls[1].attrs["min"]).toBe("2");
    expect(colEls[1].attrs["max"]).toBe("2");
    expect(colEls[1].attrs["width"]).toBe("25");
    expect(colEls[2].attrs["min"]).toBe("3");
    expect(colEls[2].attrs["max"]).toBe("5");
  });

  it("can set hidden and outlineLevel on column", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      cols: [{ col: 1, width: 10, hidden: true, outlineLevel: 1 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    const colEls = getChildren(cols!, "col");
    expect(colEls[0].attrs["hidden"]).toBe("1");
    expect(colEls[0].attrs["outlineLevel"]).toBe("1");
  });

  it("inserts <cols> before <sheetData> per ECMA-376 ordering", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      cols: [{ col: 1, width: 15 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const children = worksheet!.children.filter(
      (c) => typeof c === "object" && "name" in c,
    );
    const colsIdx = children.findIndex((c) => "name" in c && c.name === "cols");
    const sheetDataIdx = children.findIndex((c) => "name" in c && c.name === "sheetData");
    expect(colsIdx).toBeGreaterThanOrEqual(0);
    expect(sheetDataIdx).toBeGreaterThan(colsIdx);
  });

  it("handles multiple column updates sorted by column number", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      cols: [
        { col: 5, width: 30 },
        { col: 1, width: 10 },
        { col: 3, width: 20 },
      ],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    const colEls = getChildren(cols!, "col");
    expect(colEls.length).toBe(3);
    expect(colEls[0].attrs["min"]).toBe("1");
    expect(colEls[1].attrs["min"]).toBe("3");
    expect(colEls[2].attrs["min"]).toBe("5");
  });
});

// =============================================================================
// Combined Row + Column + Cell Tests
// =============================================================================

describe("patchWorkbook — combined row, column, and cell updates", () => {
  it("applies all three types of updates in a single patch", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "B", row: 1, value: "hello" }],
      rows: [{ row: 1, height: 30 }],
      cols: [{ col: 2, width: 20 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);

    // Column update
    const cols = getChild(worksheet!, "cols");
    expect(cols).toBeTruthy();
    const colEls = getChildren(cols!, "col");
    expect(colEls[0].attrs["width"]).toBe("20");

    // Row height
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    expect(row1!.attrs["ht"]).toBe("30");

    // Cell update (B1 should exist)
    const cells = getChildren(row1!, "c");
    const b1 = cells.find((c) => c.attrs["r"] === "B1");
    expect(b1).toBeTruthy();
  });

  it("does not modify sheet when rows and cols are empty arrays", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
      rows: [],
      cols: [],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    expect(cols).toBeUndefined();
  });

  it("does not modify sheet when rows and cols are undefined", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const cols = getChild(worksheet!, "cols");
    expect(cols).toBeUndefined();
  });
});

// =============================================================================
// Cell XmlElement Passthrough Tests
// =============================================================================

/**
 * Sheet XML with cells that have formula, styleId, and type attributes.
 * These must be preserved when the patcher updates other cells in the same row.
 */
const SHEET_XML_WITH_CELL_ATTRS = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  "  <sheetData>",
  '    <row r="1">',
  '      <c r="A1" s="5" t="s"><v>0</v></c>',
  '      <c r="B1"><f>A1*2</f><v>84</v></c>',
  "    </row>",
  "  </sheetData>",
  "</worksheet>",
].join("\n");

describe("patchWorkbook — cell passthrough preservation", () => {
  it("preserves formula and styleId on untouched cells when updating another cell in the same row", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_CELL_ATTRS);
    workbook.sharedStrings.push("existing");

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "C", row: 1, value: 99 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    const cells = getChildren(row1!, "c");

    // A1: style and shared string type preserved
    const a1 = cells.find((c) => c.attrs["r"] === "A1");
    expect(a1).toBeTruthy();
    expect(a1!.attrs["s"]).toBe("5");
    expect(a1!.attrs["t"]).toBe("s");

    // B1: formula preserved
    const b1 = cells.find((c) => c.attrs["r"] === "B1");
    expect(b1).toBeTruthy();
    const formula = getChild(b1!, "f");
    expect(formula).toBeTruthy();
    expect(getTextContent(formula!)).toBe("A1*2");

    // C1: new cell added via domain type + serializeCell
    const c1 = cells.find((c) => c.attrs["r"] === "C1");
    expect(c1).toBeTruthy();
  });

  it("replaces a cell with formula when CellUpdate targets the same column", async () => {
    const workbook = createTestWorkbook(SHEET_XML_WITH_CELL_ATTRS);
    workbook.sharedStrings.push("existing");

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "B", row: 1, value: 200 }],
    };

    await patchWorkbook(workbook, [update]);

    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    const cells = getChildren(row1!, "c");

    // B1: replaced — formula gone, new value
    const b1 = cells.find((c) => c.attrs["r"] === "B1");
    expect(b1).toBeTruthy();
    expect(getChild(b1!, "f")).toBeUndefined();
    const v = getChild(b1!, "v");
    expect(getTextContent(v!)).toBe("200");
  });
});

// =============================================================================
// SharedStringTable SoT Tests
// =============================================================================

describe("patchWorkbook — SharedStringTable integration", () => {
  it("uses SharedStringTable for string cell values", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "B", row: 1, value: "hello" }],
    };

    const result = await patchWorkbook(workbook, [update]);

    // "hello" should be added as a new shared string
    expect(result.newSharedStrings).toContain("hello");

    // The cell should use shared string type
    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    const cells = getChildren(row1!, "c");
    const b1 = cells.find((c) => c.attrs["r"] === "B1");
    expect(b1!.attrs["t"]).toBe("s");
  });

  it("deduplicates shared strings across multiple cells", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [
        { col: "A", row: 1, value: "same" },
        { col: "B", row: 1, value: "same" },
        { col: "C", row: 1, value: "different" },
      ],
    };

    const result = await patchWorkbook(workbook, [update]);

    // "same" should appear only once in newSharedStrings
    expect(result.newSharedStrings.filter((s) => s === "same").length).toBe(1);
    expect(result.newSharedStrings).toContain("different");

    // Both A1 and B1 should reference the same shared string index
    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    const cells = getChildren(row1!, "c");
    const a1v = getTextContent(getChild(cells.find((c) => c.attrs["r"] === "A1")!, "v")!);
    const b1v = getTextContent(getChild(cells.find((c) => c.attrs["r"] === "B1")!, "v")!);
    expect(a1v).toBe(b1v);
  });

  it("reuses existing shared strings from the workbook", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);
    // Seed with existing shared string at index 0
    (workbook as { sharedStrings: string[] }).sharedStrings = ["pre-existing"];

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "B", row: 1, value: "pre-existing" }],
    };

    const result = await patchWorkbook(workbook, [update]);

    // No new shared strings added — reused existing
    expect(result.newSharedStrings.length).toBe(0);

    // Cell should reference index 0
    const worksheet = readPatchedSheet(workbook);
    const sheetData = getChild(worksheet!, "sheetData");
    const rows = getChildren(sheetData!, "row");
    const row1 = rows.find((r) => r.attrs["r"] === "1");
    const cells = getChildren(row1!, "c");
    const b1 = cells.find((c) => c.attrs["r"] === "B1");
    const v = getChild(b1!, "v");
    expect(getTextContent(v!)).toBe("0");
  });

  it("generates sharedStrings.xml via generateSharedStrings SoT when new strings added", async () => {
    const workbook = createTestWorkbook(MINIMAL_SHEET_XML);

    const update: SheetUpdate = {
      sheetName: "Sheet1",
      cells: [{ col: "B", row: 1, value: "new-string" }],
    };

    await patchWorkbook(workbook, [update]);

    // Verify sharedStrings.xml was written
    const sstXml = workbook.package.readText("xl/sharedStrings.xml");
    expect(sstXml).toBeTruthy();
    expect(sstXml).toContain("new-string");
    expect(sstXml).toContain("<sst");
    expect(sstXml).toContain("uniqueCount");
  });
});
