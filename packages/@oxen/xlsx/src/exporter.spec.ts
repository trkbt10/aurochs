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
} from "./exporter";
import { parseXlsxWorkbook } from "./parser/index";
import { loadZipPackage } from "@oxen/zip";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "./domain/workbook";
import type { Cell } from "./domain/cell/types";
import { createDefaultStyleSheet } from "./domain/style/types";
import { colIdx, rowIdx } from "./domain/types";
import { serializeElement } from "@oxen/xml";

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
function createWorksheet(
  name: string,
  sheetId: number,
  rows: readonly XlsxRow[],
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    rows,
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
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
    const row1 = createRow(1, [
      createStringCell(1, 1, "Hello"),
      createStringCell(2, 1, "World"),
    ]);
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
    const row = createRow(1, [
      createNumberCell(1, 1, 42),
      createNumberCell(2, 1, 100),
    ]);

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
    expect(xml).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    );
  });

  it("should include override for each worksheet", () => {
    const sheet1 = createWorksheet("Sheet1", 1, []);
    const sheet2 = createWorksheet("Sheet2", 2, []);
    const workbook = createTestWorkbook([sheet1, sheet2]);

    const element = generateContentTypes(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('PartName="/xl/worksheets/sheet1.xml"');
    expect(xml).toContain('PartName="/xl/worksheets/sheet2.xml"');
    expect(xml).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
    );
  });

  it("should include override for styles and sharedStrings", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateContentTypes(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('PartName="/xl/styles.xml"');
    expect(xml).toContain('PartName="/xl/sharedStrings.xml"');
    expect(xml).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
    );
    expect(xml).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
    );
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
    expect(xml).toContain(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
    );
  });

  it("should have correct namespace", () => {
    const element = generateRootRels();
    const xml = serializeElement(element);

    expect(xml).toContain(
      'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"',
    );
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
    expect(xml).toContain(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
    );
  });

  it("should include relationship for styles", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateWorkbookRels(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('Target="styles.xml"');
    expect(xml).toContain(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
    );
  });

  it("should include relationship for sharedStrings", () => {
    const sheet = createWorksheet("Sheet1", 1, []);
    const workbook = createTestWorkbook([sheet]);

    const element = generateWorkbookRels(workbook);
    const xml = serializeElement(element);

    expect(xml).toContain('Target="sharedStrings.xml"');
    expect(xml).toContain(
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
    );
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

    expect(xml).toContain(
      'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    );
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
    const row = createRow(1, [
      createNumberCell(1, 1, 10),
      createNumberCell(2, 1, 20),
    ]);
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
    const row = createRow(1, [
      createStringCell(1, 1, "Hello"),
      createStringCell(2, 1, "World"),
    ]);
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
    const sheet1 = createWorksheet("Sheet1", 1, [
      createRow(1, [createNumberCell(1, 1, 100)]),
    ]);
    const sheet2 = createWorksheet("Sheet2", 2, [
      createRow(1, [createStringCell(1, 1, "Test")]),
    ]);
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
    const row = createRow(1, [
      createNumberCell(1, 1, 42),
      createNumberCell(2, 1, 3.14),
    ]);
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
    const row = createRow(1, [
      createStringCell(1, 1, "Hello"),
      createStringCell(2, 1, "World"),
    ]);
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
    const row = createRow(1, [
      createBooleanCell(1, 1, true),
      createBooleanCell(2, 1, false),
    ]);
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
    const row = createRow(1, [
      createNumberCell(1, 1, 42),
      createStringCell(2, 1, "Test"),
    ]);
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
