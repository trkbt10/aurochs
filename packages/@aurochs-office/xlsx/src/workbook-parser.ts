/**
 * @file XLSX Workbook Parser
 *
 * Parses embedded Excel workbook (xlsx) files.
 * Used for reading chart data source workbooks in PPTX.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

import { parseXml, getByPath, getChildren, getChild, getTextContent, type XmlElement } from "@aurochs/xml";
import { loadZipPackage, type ZipPackage } from "@aurochs/zip";
import { indexToColumnLetter, columnLetterToIndex } from "./domain/cell/address";
import { colIdx } from "./domain/types";
import { parseSharedStrings as parseSharedStringsFromElement } from "./parser/shared-strings";
import { parseRelationships } from "./parser/index";

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed workbook structure
 */
export type Workbook = {
  /** Map of sheet name to sheet data */
  readonly sheets: Map<string, WorkbookSheet>;
  /** Shared strings table (for cells with t="s") */
  readonly sharedStrings: readonly string[];
  /** The underlying ZipPackage (for reading/writing) */
  readonly package: ZipPackage;
};

/**
 * Worksheet data
 */
export type WorkbookSheet = {
  /** Sheet name */
  readonly name: string;
  /** Sheet ID (rId reference) */
  readonly id: string;
  /** Rows (sparse, keyed by 1-based row number) */
  readonly rows: Map<number, WorkbookRow>;
  /** Sheet XML path within the xlsx */
  readonly xmlPath: string;
};

/**
 * Row data
 */
export type WorkbookRow = {
  /** Row number (1-based) */
  readonly rowNumber: number;
  /** Cells (keyed by column letter) */
  readonly cells: Map<string, WorkbookCell>;
};

/**
 * Cell data
 */
export type WorkbookCell = {
  /** Cell reference (e.g., "A1") */
  readonly ref: string;
  /** Cell type: s = shared string, n = number, str = string, b = boolean */
  readonly type: "s" | "n" | "str" | "b" | "inlineStr" | undefined;
  /** Raw value (for s type, this is the shared string index) */
  readonly rawValue: string;
  /** Resolved value (for s type, this is the actual string) */
  readonly value: string | number | boolean;
};

// =============================================================================
// Parsing
// =============================================================================

/**
 * Load and parse an embedded xlsx workbook.
 *
 * @param xlsxBuffer - The xlsx file as ArrayBuffer
 * @returns Parsed Workbook
 */
export async function parseWorkbook(xlsxBuffer: ArrayBuffer): Promise<Workbook> {
  const pkg = await loadZipPackage(xlsxBuffer);

  // Parse shared strings
  const sharedStrings = parseSharedStringsFromPackage(pkg);

  // Parse workbook.xml to get sheet names and paths
  const sheets = await parseSheets(pkg, sharedStrings);

  return {
    sheets,
    sharedStrings,
    package: pkg,
  };
}

/**
 * Parse shared strings from xl/sharedStrings.xml
 */
function parseSharedStringsFromPackage(pkg: ZipPackage): readonly string[] {
  const ssText = pkg.readText("xl/sharedStrings.xml");
  if (!ssText) {
    return [];
  }

  const ssXml = parseXml(ssText);
  const sstElement = getByPath(ssXml, ["sst"]);
  if (!sstElement) {
    return [];
  }

  return parseSharedStringsFromElement(sstElement);
}

/**
 * Parse workbook.xml and sheets
 */
async function parseSheets(pkg: ZipPackage, sharedStrings: readonly string[]): Promise<Map<string, WorkbookSheet>> {
  const sheets = new Map<string, WorkbookSheet>();

  // Read workbook.xml
  const wbText = pkg.readText("xl/workbook.xml");
  if (!wbText) {
    return sheets;
  }

  const wbXml = parseXml(wbText);
  const sheetsElement = getByPath(wbXml, ["workbook", "sheets"]);
  if (!sheetsElement) {
    return sheets;
  }

  // Read workbook relationships
  const relsMap = parseRelationshipsFromPackage(pkg, "xl/_rels/workbook.xml.rels");

  // Parse each sheet
  const sheetElements = getChildren(sheetsElement, "sheet");
  for (const sheetEl of sheetElements) {
    const name = sheetEl.attrs["name"];
    const rId = sheetEl.attrs["r:id"];

    if (!name || !rId) {
      continue;
    }

    // Resolve sheet path from relationships
    const target = relsMap.get(rId);
    if (!target) {
      continue;
    }

    // Sheet paths are relative to xl/, so resolve
    const xmlPath = target.startsWith("/") ? target.substring(1) : `xl/${target}`;

    const sheetData = parseSheet({ pkg, name, id: rId, xmlPath, sharedStrings });
    if (sheetData) {
      sheets.set(name, sheetData);
    }
  }

  return sheets;
}

/**
 * Parse relationship elements to map from a relationships XML string
 */
function parseRelationshipsFromPackage(pkg: ZipPackage, relsPath: string): ReadonlyMap<string, string> {
  const relsText = pkg.readText(relsPath);
  if (!relsText) {
    return new Map();
  }

  const relsXml = parseXml(relsText);
  const relsElement = getByPath(relsXml, ["Relationships"]);
  if (!relsElement) {
    return new Map();
  }

  return parseRelationships(relsElement);
}

/**
 * Parse a single worksheet
 */
/**
 * Supported sheet root element names.
 *
 * - "worksheet" for regular worksheets (xl/worksheets/sheetN.xml)
 * - "macrosheet" for Excel macro sheets (xl/macrosheets/sheetN.xml)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 * @see MS-OFFMACRO2 Section 2.2.1.5 (Macro Sheet)
 */
const SHEET_ROOT_ELEMENTS = ["worksheet", "macrosheet"] as const;

/**
 * Find sheetData element from either worksheet or macrosheet root.
 */
function findSheetDataElement(sheetXml: ReturnType<typeof parseXml>): ReturnType<typeof getByPath> {
  for (const rootName of SHEET_ROOT_ELEMENTS) {
    const sheetData = getByPath(sheetXml, [rootName, "sheetData"]);
    if (sheetData) {
      return sheetData;
    }
  }
  return undefined;
}

function parseSheet(params: {
  readonly pkg: ZipPackage;
  readonly name: string;
  readonly id: string;
  readonly xmlPath: string;
  readonly sharedStrings: readonly string[];
}): WorkbookSheet | undefined {
  const { pkg, name, id, xmlPath, sharedStrings } = params;
  const sheetText = pkg.readText(xmlPath);
  if (!sheetText) {
    return undefined;
  }

  const sheetXml = parseXml(sheetText);
  const sheetDataEl = findSheetDataElement(sheetXml);
  if (!sheetDataEl) {
    return { name, id, rows: new Map(), xmlPath };
  }

  const rows = new Map<number, WorkbookRow>();
  const rowElements = getChildren(sheetDataEl, "row");

  for (const rowEl of rowElements) {
    const rowNumStr = rowEl.attrs["r"];
    if (!rowNumStr) {
      continue;
    }

    const rowNumber = parseInt(rowNumStr, 10);
    const cells = new Map<string, WorkbookCell>();

    const cellElements = getChildren(rowEl, "c");
    for (const cellEl of cellElements) {
      const cell = parseCell(cellEl, sharedStrings);
      if (cell) {
        const colMatch = cell.ref.match(/^([A-Z]+)/);
        if (colMatch) {
          cells.set(colMatch[1], cell);
        }
      }
    }

    rows.set(rowNumber, { rowNumber, cells });
  }

  return { name, id, rows, xmlPath };
}

/**
 * Parse a single cell
 */
function parseCell(cellEl: XmlElement, sharedStrings: readonly string[]): WorkbookCell | undefined {
  const ref = cellEl.attrs["r"];
  if (!ref) {
    return undefined;
  }

  const type = cellEl.attrs["t"] as WorkbookCell["type"];
  const vElement = getChild(cellEl, "v");
  const rawValue = vElement ? (getTextContent(vElement) ?? "") : "";

  // Resolve value based on type
  const resolveValue = (): string | number | boolean => {
    if (type === "s") {
      const index = parseInt(rawValue, 10);
      return sharedStrings[index] ?? "";
    }
    if (type === "b") {
      return rawValue === "1" || rawValue === "true";
    }
    if (type === "str") {
      return rawValue;
    }
    if (type === "inlineStr") {
      const isElement = getChild(cellEl, "is");
      const tElement = isElement ? getChild(isElement, "t") : null;
      return tElement ? (getTextContent(tElement) ?? "") : "";
    }
    const num = parseFloat(rawValue);
    return Number.isNaN(num) ? rawValue : num;
  };
  const value = resolveValue();

  return { ref, type, rawValue, value };
}

/**
 * Get cell value from sheet by column and row.
 *
 * @param sheet - Worksheet
 * @param col - Column letter (e.g., "A")
 * @param row - Row number (1-based)
 * @returns Cell value or undefined
 */
export function getCellValue(sheet: WorkbookSheet, col: string, row: number): string | number | boolean | undefined {
  const rowData = sheet.rows.get(row);
  if (!rowData) {
    return undefined;
  }

  const cell = rowData.cells.get(col.toUpperCase());
  return cell?.value;
}

/**
 * Get a range of values from a sheet (column direction).
 *
 * @param sheet - Worksheet
 * @param col - Column letter
 * @param startRow - Start row (1-based)
 * @param endRow - End row (1-based)
 * @returns Array of values
 */
export function getColumnValues(params: {
  readonly sheet: WorkbookSheet;
  readonly col: string;
  readonly startRow: number;
  readonly endRow: number;
}): readonly (string | number | boolean | undefined)[] {
  const { sheet, col, startRow, endRow } = params;
  const values: (string | number | boolean | undefined)[] = [];
  for (let row = startRow; row <= endRow; row++) {
    values.push(getCellValue(sheet, col, row));
  }
  return values;
}

/**
 * Get a range of values from a sheet (row direction).
 *
 * @param sheet - Worksheet
 * @param row - Row number (1-based)
 * @param startCol - Start column letter
 * @param endCol - End column letter
 * @returns Array of values
 */
export function getRowValues(params: {
  readonly sheet: WorkbookSheet;
  readonly row: number;
  readonly startCol: string;
  readonly endCol: string;
}): readonly (string | number | boolean | undefined)[] {
  const { sheet, row, startCol, endCol } = params;
  const startIndex = columnLetterToIndex(startCol) as number;
  const endIndex = columnLetterToIndex(endCol) as number;

  const values: (string | number | boolean | undefined)[] = [];
  for (let col = startIndex; col <= endIndex; col++) {
    values.push(getCellValue(sheet, indexToColumnLetter(colIdx(col)), row));
  }
  return values;
}
