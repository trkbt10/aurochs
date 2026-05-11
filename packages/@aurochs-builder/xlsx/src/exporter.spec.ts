/**
 * @file XLSX Exporter Tests
 *
 * Tests for the XLSX exporter module including:
 * - Content Types generation
 * - Root relationships generation
 * - Workbook relationships generation
 * - Shared strings generation
 * - Shared string table builder
 * - Complete export functionality
 * - Round-trip tests (export -> parse -> verify)
 */

import {
  exportXlsx,
  generateContentTypes,
  generateRootRels,
  generateWorkbookRels,
  generateSharedStrings,
  createSharedStringTableBuilder,
  collectSharedStrings,
  type MediaPart,
} from "./exporter";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";
import { loadZipPackage } from "@aurochs/zip";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx, sheetId } from "@aurochs-office/xlsx/domain/types";
import { serializeElement, parseXml } from "@aurochs/xml";

// =============================================================================
// Test Helper Functions
// =============================================================================

/**
 * Create a simple test cell with a number value.
 */
function createNumberCell(col: number, row: number, value: number): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value: { type: "number", value },
  };
}

/**
 * Create a simple test cell with a string value.
 */
function createStringCell(col: number, row: number, value: string): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value: { type: "string", value },
  };
}

/**
 * Create a simple test cell with a boolean value.
 */
function createBooleanCell(col: number, row: number, value: boolean): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value: { type: "boolean", value },
  };
}

/**
 * Create a simple test row.
 */
function createRow(rowNumber: number, cells: readonly Cell[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

/**
 * Create a simple test worksheet.
 */
function createWorksheet(name: string, id: number, rows: readonly XlsxRow[]): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId: sheetId(id),
    state: "visible",
    rows,
    xmlPath: `xl/worksheets/sheet${id}.xml`,
  };
}

/**
 * Create a simple test workbook.
 */
function createTestWorkbook(sheets: readonly XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

// =============================================================================
// Shared String Table Builder Tests
// =============================================================================

describe("createSharedStringTableBuilder", () => {
  it("should add strings and return indices", () => {
    const builder = createSharedStringTableBuilder();

    const idx1 = builder.addString("Hello");
    const idx2 = builder.addString("World");
    const idx3 = builder.addString("Hello"); // Duplicate

    expect(idx1).toBe(0);
    expect(idx2).toBe(1);
    expect(idx3).toBe(0); // Same as first "Hello"
  });

  it("should return undefined for unknown strings in getIndex", () => {
    const builder = createSharedStringTableBuilder();
    builder.addString("Hello");

    expect(builder.getIndex("Hello")).toBe(0);
    expect(builder.getIndex("World")).toBeUndefined();
  });

  it("should return all strings in order via getStrings", () => {
    const builder = createSharedStringTableBuilder();
    builder.addString("First");
    builder.addString("Second");
    builder.addString("Third");
    builder.addString("First"); // Duplicate

    expect(builder.getStrings()).toEqual(["First", "Second", "Third"]);
  });
});

describe("collectSharedStrings", () => {
  it("should collect all unique strings from workbook", () => {
    const row1 = createRow(1, [createStringCell(1, 1, "Hello"), createStringCell(2, 1, "World")]);
    const row2 = createRow(2, [
      createStringCell(1, 2, "Hello"), // Duplicate
      createStringCell(2, 2, "XLSX"),
    ]);

    const sheet = createWorksheet("Sheet1", 1, [row1, row2]);
    const workbook = createTestWorkbook([sheet]);

    const builder = collectSharedStrings(workbook);
    const strings = builder.getStrings();

    expect(strings).toEqual(["Hello", "World", "XLSX"]);
  });

  it("should handle workbook with no strings", () => {
    const row = createRow(1, [createNumberCell(1, 1, 42), createNumberCell(2, 1, 100)]);

    const sheet = createWorksheet("Sheet1", 1, [row]);
    const workbook = createTestWorkbook([sheet]);

    const builder = collectSharedStrings(workbook);
    expect(builder.getStrings()).toEqual([]);
  });
});

// =============================================================================
// Content Types Generation Tests
// =============================================================================

describe("generateContentTypes", () => {
  it("should generate content types with default extensions", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateContentTypes(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('Extension="rels"');
    expect(xml).toContain('Extension="xml"');
    expect(xml).toContain("application/vnd.openxmlformats-package.relationships+xml");
    expect(xml).toContain("application/xml");
  });

  it("should include override for workbook", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateContentTypes(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('PartName="/xl/workbook.xml"');
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml");
  });

  it("should include override for each worksheet", () => {
    const sheet1 = createWorksheet("Sheet1", 1, []);
    const sheet2 = createWorksheet("Sheet2", 2, []);
    const workbook = createTestWorkbook([sheet1, sheet2]);

    const element = generateContentTypes(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('PartName="/xl/worksheets/sheet1.xml"');
    expect(xml).toContain('PartName="/xl/worksheets/sheet2.xml"');
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml");
  });

  it("should include override for styles and sharedStrings", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateContentTypes(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('PartName="/xl/styles.xml"');
    expect(xml).toContain('PartName="/xl/sharedStrings.xml"');
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml");
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml");
  });
});

// =============================================================================
// Root Relationships Generation Tests
// =============================================================================

describe("generateRootRels", () => {
  it("should generate relationship to workbook", () => {
    const element = generateRootRels();
    const xml = serializeElement(element);

    expect(xml).toContain('Id="rId1"');
    expect(xml).toContain('Target="xl/workbook.xml"');
    expect(xml).toContain("http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument");
  });

  it("should have correct namespace", () => {
    const element = generateRootRels();
    const xml = serializeElement(element);

    expect(xml).toContain('xmlns="http://schemas.openxmlformats.org/package/2006/relationships"');
  });
});

// =============================================================================
// Workbook Relationships Generation Tests
// =============================================================================

describe("generateWorkbookRels", () => {
  it("should generate relationships for sheets", () => {
    const sheet1 = createWorksheet("Sheet1", 1, []);
    const sheet2 = createWorksheet("Sheet2", 2, []);
    const workbook = createTestWorkbook([sheet1, sheet2]);

    const element = generateWorkbookRels(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('Id="rId1"');
    expect(xml).toContain('Target="worksheets/sheet1.xml"');
    expect(xml).toContain('Id="rId2"');
    expect(xml).toContain('Target="worksheets/sheet2.xml"');
    expect(xml).toContain("http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet");
  });

  it("should include relationship for styles", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateWorkbookRels(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('Target="styles.xml"');
    expect(xml).toContain("http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles");
  });

  it("should include relationship for sharedStrings", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateWorkbookRels(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('Target="sharedStrings.xml"');
    expect(xml).toContain("http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings");
  });
});

// =============================================================================
// Shared Strings Generation Tests
// =============================================================================

describe("generateSharedStrings", () => {
  it("should generate sst element with count attributes", () => {
    const element = generateSharedStrings(["Hello", "World", "XLSX"]);
    const xml = serializeElement(element);

    expect(xml).toContain('count="3"');
    expect(xml).toContain('uniqueCount="3"');
  });

  it("should generate si/t elements for each string", () => {
    const element = generateSharedStrings(["Hello", "World"]);
    const xml = serializeElement(element);

    expect(xml).toContain("<si><t>Hello</t></si>");
    expect(xml).toContain("<si><t>World</t></si>");
  });

  it("should have correct namespace", () => {
    const element = generateSharedStrings(["Test"]);
    const xml = serializeElement(element);

    expect(xml).toContain('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"');
  });

  it("should handle empty array", () => {
    const element = generateSharedStrings([]);
    const xml = serializeElement(element);

    expect(xml).toContain('count="0"');
    expect(xml).toContain('uniqueCount="0"');
  });
});

// =============================================================================
// Export Function Tests
// =============================================================================

describe("exportXlsx", () => {
  it("should export a simple workbook with numbers", async () => {
    const row = createRow(1, [createNumberCell(1, 1, 10), createNumberCell(2, 1, 20)]);
    const sheet = createWorksheet("Sheet1", 1, [row]);
    const workbook = createTestWorkbook([sheet]);

    const xlsxData = await exportXlsx(workbook);

    expect(xlsxData).toBeInstanceOf(Uint8Array);
    expect(xlsxData.length).toBeGreaterThan(0);

    // Verify it's a valid ZIP
    const pkg = await loadZipPackage(xlsxData);
    expect(pkg.exists("[Content_Types].xml")).toBe(true);
    expect(pkg.exists("_rels/.rels")).toBe(true);
    expect(pkg.exists("xl/workbook.xml")).toBe(true);
    expect(pkg.exists("xl/_rels/workbook.xml.rels")).toBe(true);
    expect(pkg.exists("xl/styles.xml")).toBe(true);
    expect(pkg.exists("xl/sharedStrings.xml")).toBe(true);
    expect(pkg.exists("xl/worksheets/sheet1.xml")).toBe(true);
  });

  it("should export a workbook with strings", async () => {
    const row = createRow(1, [createStringCell(1, 1, "Hello"), createStringCell(2, 1, "World")]);
    const sheet = createWorksheet("Sheet1", 1, [row]);
    const workbook = createTestWorkbook([sheet]);

    const xlsxData = await exportXlsx(workbook);

    // Verify sharedStrings.xml contains the strings
    const pkg = await loadZipPackage(xlsxData);
    const sharedStringsXml = pkg.readText("xl/sharedStrings.xml");
    expect(sharedStringsXml).not.toBeNull();
    expect(sharedStringsXml).toContain("Hello");
    expect(sharedStringsXml).toContain("World");
  });

  it("should export a workbook with multiple sheets", async () => {
    const sheet1 = createWorksheet("Sheet1", 1, [createRow(1, [createNumberCell(1, 1, 100)])]);
    const sheet2 = createWorksheet("Sheet2", 2, [createRow(1, [createStringCell(1, 1, "Test")])]);
    const workbook = createTestWorkbook([sheet1, sheet2]);

    const xlsxData = await exportXlsx(workbook);
    const pkg = await loadZipPackage(xlsxData);

    expect(pkg.exists("xl/worksheets/sheet1.xml")).toBe(true);
    expect(pkg.exists("xl/worksheets/sheet2.xml")).toBe(true);

    // Check workbook.xml has both sheets
    const workbookXml = pkg.readText("xl/workbook.xml");
    expect(workbookXml).not.toBeNull();
    expect(workbookXml).toContain('name="Sheet1"');
    expect(workbookXml).toContain('name="Sheet2"');
  });

  it("should include XML declaration in all files", async () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const xlsxData = await exportXlsx(workbook);
    const pkg = await loadZipPackage(xlsxData);

    const contentTypesXml = pkg.readText("[Content_Types].xml");
    const workbookXml = pkg.readText("xl/workbook.xml");
    const stylesXml = pkg.readText("xl/styles.xml");
    expect(contentTypesXml).not.toBeNull();
    expect(workbookXml).not.toBeNull();
    expect(stylesXml).not.toBeNull();

    const expectedDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    expect(contentTypesXml).toContain(expectedDeclaration);
    expect(workbookXml).toContain(expectedDeclaration);
    expect(stylesXml).toContain(expectedDeclaration);
  });
});

// =============================================================================
// Round-Trip Tests
// =============================================================================

describe("Round-trip: export -> parse", () => {
  it("should preserve number values", async () => {
    const row = createRow(1, [createNumberCell(1, 1, 42), createNumberCell(2, 1, 3.14)]);
    const sheet = createWorksheet("Sheet1", 1, [row]);
    const original = createTestWorkbook([sheet]);

    // Export
    const xlsxData = await exportXlsx(original);

    // Parse
    const pkg = await loadZipPackage(xlsxData);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    // Verify
    expect(parsed.sheets.length).toBe(1);
    expect(parsed.sheets[0].name).toBe("Sheet1");
    expect(parsed.sheets[0].rows.length).toBe(1);
    expect(parsed.sheets[0].rows[0].cells.length).toBe(2);

    const cell1 = parsed.sheets[0].rows[0].cells[0];
    const cell2 = parsed.sheets[0].rows[0].cells[1];

    expect(cell1.value.type).toBe("number");
    expect(cell1.value.type === "number" && cell1.value.value).toBe(42);

    expect(cell2.value.type).toBe("number");
    expect(cell2.value.type === "number" && cell2.value.value).toBe(3.14);
  });

  it("should preserve string values via shared strings", async () => {
    const row = createRow(1, [createStringCell(1, 1, "Hello"), createStringCell(2, 1, "World")]);
    const sheet = createWorksheet("Sheet1", 1, [row]);
    const original = createTestWorkbook([sheet]);

    // Export
    const xlsxData = await exportXlsx(original);

    // Parse
    const pkg = await loadZipPackage(xlsxData);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    // Verify
    expect(parsed.sharedStrings).toContain("Hello");
    expect(parsed.sharedStrings).toContain("World");

    const cell1 = parsed.sheets[0].rows[0].cells[0];
    const cell2 = parsed.sheets[0].rows[0].cells[1];

    expect(cell1.value.type).toBe("string");
    expect(cell1.value.type === "string" && cell1.value.value).toBe("Hello");

    expect(cell2.value.type).toBe("string");
    expect(cell2.value.type === "string" && cell2.value.value).toBe("World");
  });

  it("should preserve boolean values", async () => {
    const row = createRow(1, [createBooleanCell(1, 1, true), createBooleanCell(2, 1, false)]);
    const sheet = createWorksheet("Sheet1", 1, [row]);
    const original = createTestWorkbook([sheet]);

    // Export
    const xlsxData = await exportXlsx(original);

    // Parse
    const pkg = await loadZipPackage(xlsxData);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    // Verify
    const cell1 = parsed.sheets[0].rows[0].cells[0];
    const cell2 = parsed.sheets[0].rows[0].cells[1];

    expect(cell1.value.type).toBe("boolean");
    expect(cell1.value.type === "boolean" && cell1.value.value).toBe(true);

    expect(cell2.value.type).toBe("boolean");
    expect(cell2.value.type === "boolean" && cell2.value.value).toBe(false);
  });

  it("should preserve sheet names", async () => {
    const sheet1 = createWorksheet("My Data", 1, []);
    const sheet2 = createWorksheet("Summary", 2, []);
    const original = createTestWorkbook([sheet1, sheet2]);

    // Export
    const xlsxData = await exportXlsx(original);

    // Parse
    const pkg = await loadZipPackage(xlsxData);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    // Verify
    expect(parsed.sheets.length).toBe(2);
    expect(parsed.sheets[0].name).toBe("My Data");
    expect(parsed.sheets[1].name).toBe("Summary");
  });

  it("should handle workbook with mixed cell types", async () => {
    const row = createRow(1, [
      createNumberCell(1, 1, 123),
      createStringCell(2, 1, "Text"),
      createBooleanCell(3, 1, true),
    ]);
    const sheet = createWorksheet("Mixed", 1, [row]);
    const original = createTestWorkbook([sheet]);

    // Export
    const xlsxData = await exportXlsx(original);

    // Parse
    const pkg = await loadZipPackage(xlsxData);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    // Verify
    const cells = parsed.sheets[0].rows[0].cells;
    expect(cells.length).toBe(3);

    expect(cells[0].value.type).toBe("number");
    expect(cells[1].value.type).toBe("string");
    expect(cells[2].value.type).toBe("boolean");
  });

  it("should handle multiple rows correctly", async () => {
    const row1 = createRow(1, [createNumberCell(1, 1, 1)]);
    const row2 = createRow(2, [createNumberCell(1, 2, 2)]);
    const row3 = createRow(3, [createNumberCell(1, 3, 3)]);
    const sheet = createWorksheet("Rows", 1, [row1, row2, row3]);
    const original = createTestWorkbook([sheet]);

    // Export
    const xlsxData = await exportXlsx(original);

    // Parse
    const pkg = await loadZipPackage(xlsxData);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    // Verify
    expect(parsed.sheets[0].rows.length).toBe(3);
    expect(parsed.sheets[0].rows[0].rowNumber).toBe(1);
    expect(parsed.sheets[0].rows[1].rowNumber).toBe(2);
    expect(parsed.sheets[0].rows[2].rowNumber).toBe(3);
  });

  it("should handle export -> parse -> export round-trip", async () => {
    const row = createRow(1, [createNumberCell(1, 1, 42), createStringCell(2, 1, "Test")]);
    const sheet = createWorksheet("Sheet1", 1, [row]);
    const original = createTestWorkbook([sheet]);

    // First export
    const xlsxData1 = await exportXlsx(original);

    // Parse
    const pkg1 = await loadZipPackage(xlsxData1);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg1.readText(path) ?? undefined;
    });

    // Second export
    const xlsxData2 = await exportXlsx(parsed);

    // Parse again
    const pkg2 = await loadZipPackage(xlsxData2);
    const reparsed = await parseXlsxWorkbook(async (path) => {
      return pkg2.readText(path) ?? undefined;
    });

    // Verify data is preserved
    expect(reparsed.sheets.length).toBe(1);
    expect(reparsed.sheets[0].name).toBe("Sheet1");
    expect(reparsed.sheets[0].rows.length).toBe(1);

    const cells = reparsed.sheets[0].rows[0].cells;
    expect(cells.length).toBe(2);

    expect(cells[0].value.type).toBe("number");
    expect(cells[0].value.type === "number" && cells[0].value.value).toBe(42);

    expect(cells[1].value.type).toBe("string");
    expect(cells[1].value.type === "string" && cells[1].value.value).toBe("Test");
  });
});

// =============================================================================
// Drawing Regression Tests
// =============================================================================
//
// Excel for Windows/Mac rejected aurochs 0.10.0–0.12.2 workbooks containing any
// XlsxDrawing with "We found a problem with some content … sheet1.xml part with
// XML error." Root cause: serializeWorksheet placed <drawing> between
// <hyperlinks> and <printOptions>, violating ECMA-376 §18.3.1.99 CT_Worksheet
// sequence which requires <drawing> AFTER pageMargins/pageSetup/headerFooter/
// rowBreaks/colBreaks. LibreOffice / ExcelJS / xmllint / aurochs's own parser
// were all lenient, so single-component tests didn't catch the regression.
//
// These tests assert the end-to-end OPC package: byte order in sheet1.xml,
// relationship wiring, content-type registrations, and media payload.
// =============================================================================

/** 1×1 transparent PNG (from the issue's repro). */
const PNG_1X1_TRANSPARENT = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

/** Build the minimal workbook from the issue: one cell + one twoCellAnchor picture. */
function createMinimalImageWorkbook(): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sharedStrings: [],
    styles: createDefaultStyleSheet(),
    sheets: [
      {
        dateSystem: "1900",
        name: "S",
        sheetId: sheetId(1),
        state: "visible",
        xmlPath: "xl/worksheets/sheet1.xml",
        columns: [{ min: colIdx(1), max: colIdx(2), width: 20 }],
        rows: [createRow(1, [createNumberCell(1, 1, 1)])],
        mergeCells: [],
        drawing: {
          anchors: [
            {
              type: "twoCellAnchor",
              editAs: "oneCell",
              from: { col: colIdx(1), colOff: 0, row: rowIdx(1), rowOff: 0 },
              to: { col: colIdx(2), colOff: 0, row: rowIdx(5), rowOff: 0 },
              content: {
                type: "picture",
                nvPicPr: { id: 1, name: "img" },
                blipRelId: "rId1",
              },
            },
          ],
        },
      },
    ],
  };
}

/** Build the per-sheet media map for the minimal workbook above. */
function createMinimalSheetMedia(): ReadonlyMap<number, ReadonlyMap<string, MediaPart>> {
  const media = new Map<string, MediaPart>();
  media.set("rId1", { data: PNG_1X1_TRANSPARENT, contentType: "image/png" });
  const sheetMedia = new Map<number, ReadonlyMap<string, MediaPart>>();
  sheetMedia.set(0, media);
  return sheetMedia;
}

describe("exportXlsx — drawing regression (Excel-strict OOXML compliance)", () => {
  it("places <drawing> after <pageMargins> in the emitted sheet1.xml bytes", async () => {
    // ECMA-376 §18.3.1.99 sequence: <drawing> must come AFTER pageMargins/
    // pageSetup/headerFooter/rowBreaks/colBreaks. Excel's strict validator
    // rejects sheet1.xml otherwise (the symptom in the bug report was a load
    // error pointing at the column where <pageMargins> begins).
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);
    const sheetXml = pkg.readText("xl/worksheets/sheet1.xml");
    expect(sheetXml).not.toBeNull();
    const xml = sheetXml as string;

    const pageMarginsPos = xml.indexOf("<pageMargins");
    const drawingPos = xml.indexOf("<drawing");
    expect(pageMarginsPos).toBeGreaterThan(-1);
    expect(drawingPos).toBeGreaterThan(-1);
    expect(drawingPos).toBeGreaterThan(pageMarginsPos);
  });

  it("emits <drawing r:id=\"...\"> matching the worksheet's drawing relationship", async () => {
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);

    const sheetXml = pkg.readText("xl/worksheets/sheet1.xml");
    expect(sheetXml).not.toBeNull();

    // Extract the r:id from <drawing r:id="...">.
    const match = /<drawing\s+r:id="([^"]+)"/.exec(sheetXml as string);
    expect(match).not.toBeNull();
    const drawingRelId = match![1];

    // The corresponding relationship must exist in sheet1.xml.rels.
    const relsXml = pkg.readText("xl/worksheets/_rels/sheet1.xml.rels");
    expect(relsXml).not.toBeNull();
    expect(relsXml).toContain(`Id="${drawingRelId}"`);
    expect(relsXml).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"',
    );
    expect(relsXml).toContain('Target="../drawings/drawing1.xml"');
  });

  it("wires the picture's blipRelId to a media file via drawing1.xml.rels", async () => {
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);

    // drawing1.xml must reference rId1 (the blipRelId set on the picture content).
    const drawingXml = pkg.readText("xl/drawings/drawing1.xml");
    expect(drawingXml).not.toBeNull();
    expect(drawingXml).toContain('r:embed="rId1"');

    // drawing1.xml.rels must resolve rId1 to ../media/image_s1_1.png.
    const drawingRelsXml = pkg.readText("xl/drawings/_rels/drawing1.xml.rels");
    expect(drawingRelsXml).not.toBeNull();
    expect(drawingRelsXml).toContain('Id="rId1"');
    expect(drawingRelsXml).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"',
    );
    expect(drawingRelsXml).toContain('Target="../media/image_s1_1.png"');
  });

  it("registers the drawing override and PNG default in [Content_Types].xml", async () => {
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);

    const contentTypesXml = pkg.readText("[Content_Types].xml");
    expect(contentTypesXml).not.toBeNull();

    // Drawing part override
    expect(contentTypesXml).toContain('PartName="/xl/drawings/drawing1.xml"');
    expect(contentTypesXml).toContain(
      'ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"',
    );

    // PNG default extension (so OPC consumers know how to interpret xl/media/*.png)
    expect(contentTypesXml).toContain('Extension="png"');
    expect(contentTypesXml).toContain('ContentType="image/png"');
  });

  it("writes the media payload as binary bytes at xl/media/image_s1_1.png", async () => {
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);

    const mediaBuf = pkg.readBinary("xl/media/image_s1_1.png");
    expect(mediaBuf).not.toBeNull();
    const bytes = new Uint8Array(mediaBuf as ArrayBuffer);
    expect(bytes.length).toBe(PNG_1X1_TRANSPARENT.length);
    // Verify the PNG signature survived the ZIP round-trip.
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
    // And full byte equality.
    for (let i = 0; i < PNG_1X1_TRANSPARENT.length; i++) {
      expect(bytes[i]).toBe(PNG_1X1_TRANSPARENT[i]);
    }
  });

  it("produces the complete set of OPC parts required for a drawing-bearing workbook", async () => {
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);
    const files = new Set(pkg.listFiles());

    // Every required part the issue called out must be present.
    expect(files.has("[Content_Types].xml")).toBe(true);
    expect(files.has("_rels/.rels")).toBe(true);
    expect(files.has("xl/workbook.xml")).toBe(true);
    expect(files.has("xl/_rels/workbook.xml.rels")).toBe(true);
    expect(files.has("xl/styles.xml")).toBe(true);
    expect(files.has("xl/sharedStrings.xml")).toBe(true);
    expect(files.has("xl/worksheets/sheet1.xml")).toBe(true);
    expect(files.has("xl/worksheets/_rels/sheet1.xml.rels")).toBe(true);
    expect(files.has("xl/drawings/drawing1.xml")).toBe(true);
    expect(files.has("xl/drawings/_rels/drawing1.xml.rels")).toBe(true);
    expect(files.has("xl/media/image_s1_1.png")).toBe(true);
  });

  it("emits sheet1.xml as well-formed XML that parses without errors", async () => {
    // The Excel error message in the bug report pointed at a column inside
    // sheet1.xml, so the file must at minimum be well-formed XML. This guards
    // against a future regression where misordering produces unparsable output.
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);
    const sheetXml = pkg.readText("xl/worksheets/sheet1.xml");
    expect(sheetXml).not.toBeNull();
    expect(() => parseXml(sheetXml as string)).not.toThrow();
  });

  it("survives export → parse round-trip: the drawing is preserved", async () => {
    // Confirms the fixed ordering doesn't break the parser path either.
    const data = await exportXlsx(createMinimalImageWorkbook(), {
      sheetMedia: createMinimalSheetMedia(),
    });
    const pkg = await loadZipPackage(data);
    const parsed = await parseXlsxWorkbook(async (path) => {
      return pkg.readText(path) ?? undefined;
    });

    expect(parsed.sheets).toHaveLength(1);
    const sheet = parsed.sheets[0];
    expect(sheet.drawing).toBeDefined();
    expect(sheet.drawing!.anchors).toHaveLength(1);

    const anchor = sheet.drawing!.anchors[0];
    expect(anchor.type).toBe("twoCellAnchor");
    expect(anchor.content?.type).toBe("picture");
  });

  it("does not emit <drawing> when the worksheet has no drawing", async () => {
    // The previous broken ordering still happened to work without a drawing,
    // but we pin the negative case so a future refactor can't accidentally
    // emit a dangling <drawing> reference.
    const sheet = createWorksheet("Sheet1", 1, [createRow(1, [createNumberCell(1, 1, 42)])]);
    const workbook = createTestWorkbook([sheet]);
    const data = await exportXlsx(workbook);
    const pkg = await loadZipPackage(data);

    const sheetXml = pkg.readText("xl/worksheets/sheet1.xml");
    expect(sheetXml).not.toBeNull();
    expect(sheetXml).not.toContain("<drawing");

    // And no drawing parts should exist in the package.
    const files = pkg.listFiles();
    expect(files.some((f) => f.startsWith("xl/drawings/"))).toBe(false);
    expect(files.some((f) => f.startsWith("xl/media/"))).toBe(false);
  });
});
