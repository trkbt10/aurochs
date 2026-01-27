/**
 * @file XLSX Workbook Patcher
 *
 * Updates embedded Excel workbook (xlsx) data.
 * Used for synchronizing chart data changes to embedded workbooks.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

import {
  parseXml,
  getByPath,
  getChildren,
  getChild,
  isXmlElement,
  createElement,
  createText,
  type XmlElement,
  type XmlNode,
} from "@oxen/xml";
import { serializeDocument } from "@oxen/xml";
import type { ZipPackage } from "@oxen/zip";
import type { Workbook, WorkbookSheet } from "./workbook-parser";
import { indexToColumnLetter } from "./domain/cell/address";
import { colIdx } from "./domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Cell value to write
 */
export type CellUpdate = {
  /** Column letter (e.g., "A") */
  readonly col: string;
  /** Row number (1-based) */
  readonly row: number;
  /** Value to write */
  readonly value: string | number;
};

/**
 * Sheet update specification
 */
export type SheetUpdate = {
  /** Sheet name */
  readonly sheetName: string;
  /** Cell updates */
  readonly cells: readonly CellUpdate[];
  /** If provided, update the sheet dimension (e.g., "A1:B10") */
  readonly dimension?: string;
};

/**
 * Result of patching a workbook
 */
export type WorkbookPatchResult = {
  /** Updated xlsx as ArrayBuffer */
  readonly xlsxBuffer: ArrayBuffer;
  /** List of sheets that were updated */
  readonly updatedSheets: readonly string[];
  /** New shared strings added */
  readonly newSharedStrings: readonly string[];
};

// =============================================================================
// Patching
// =============================================================================

/**
 * Patch a workbook with cell updates.
 *
 * @param workbook - Parsed workbook
 * @param updates - Sheet updates to apply
 * @returns Patch result with updated xlsx buffer
 */
export async function patchWorkbook(
  workbook: Workbook,
  updates: readonly SheetUpdate[],
): Promise<WorkbookPatchResult> {
  const pkg = workbook.package;
  const updatedSheets: string[] = [];
  const newSharedStrings: string[] = [];

  // Build mutable shared strings list
  const sharedStrings = [...workbook.sharedStrings];

  for (const update of updates) {
    const sheet = workbook.sheets.get(update.sheetName);
    if (!sheet) {
      throw new Error(`patchWorkbook: sheet "${update.sheetName}" not found`);
    }

    // Collect string values that need to be in shared strings
    const stringValues = update.cells
      .filter((c) => typeof c.value === "string")
      .map((c) => c.value as string);

    // Add new strings to shared strings if not already present
    for (const str of stringValues) {
      if (!sharedStrings.includes(str)) {
        sharedStrings.push(str);
        newSharedStrings.push(str);
      }
    }

    // Patch the sheet XML
    patchSheetXml(pkg, sheet, update.cells, sharedStrings, update.dimension);
    updatedSheets.push(update.sheetName);
  }

  // Update shared strings XML if we added new ones
  if (newSharedStrings.length > 0) {
    patchSharedStringsXml(pkg, sharedStrings);
  }

  // Generate updated xlsx
  const xlsxBuffer = await pkg.toArrayBuffer();

  return {
    xlsxBuffer,
    updatedSheets,
    newSharedStrings,
  };
}

/**
 * Patch a single sheet's XML with cell updates.
 */
function patchSheetXml(
  pkg: ZipPackage,
  sheet: WorkbookSheet,
  cells: readonly CellUpdate[],
  sharedStrings: readonly string[],
  dimension?: string,
): void {
  const sheetText = pkg.readText(sheet.xmlPath);
  if (!sheetText) {
    throw new Error(`patchSheetXml: sheet XML not found at ${sheet.xmlPath}`);
  }

  const sheetXml = parseXml(sheetText);
  const worksheetEl = getByPath(sheetXml, ["worksheet"]);
  if (!worksheetEl) {
    throw new Error(`patchSheetXml: worksheet element not found in ${sheet.xmlPath}`);
  }

  const worksheetWithDimension = dimension ? updateDimension(worksheetEl, dimension) : worksheetEl;
  const { worksheet: updatedWorksheet, sheetData: sheetDataEl } = ensureSheetDataElement(worksheetWithDimension);

  // Apply cell updates
  const updatedSheetData = applyCellUpdates(sheetDataEl, cells, sharedStrings);

  // Replace sheetData in worksheet
  const newChildren = updatedWorksheet.children.map((child) => {
    if (isXmlElement(child) && child.name === "sheetData") {
      return updatedSheetData;
    }
    return child;
  });

  const finalWorksheet = createElement(updatedWorksheet.name, updatedWorksheet.attrs, newChildren);

  // Serialize and write back
  const serialized = serializeDocument({ children: [finalWorksheet] }, { declaration: true, standalone: true });
  pkg.writeText(sheet.xmlPath, serialized);
}

/**
 * Update the dimension element in worksheet.
 */
function updateDimension(worksheet: XmlElement, dimension: string): XmlElement {
  const dimEl = getChild(worksheet, "dimension");
  if (dimEl) {
    // Update existing
    return replaceChild(worksheet, "dimension", createElement("dimension", { ref: dimension }));
  }
  // Add dimension after sheetViews or at start
  return insertChildAfter(worksheet, "sheetViews", createElement("dimension", { ref: dimension }));
}

function ensureSheetDataElement(worksheet: XmlElement): { readonly worksheet: XmlElement; readonly sheetData: XmlElement } {
  const existing = getChild(worksheet, "sheetData");
  if (existing) {
    return { worksheet, sheetData: existing };
  }
  const sheetData = createElement("sheetData", {}, []);
  const updatedWorksheet = appendChildElement(worksheet, sheetData);
  return { worksheet: updatedWorksheet, sheetData };
}

/**
 * Apply cell updates to sheetData element.
 */
function applyCellUpdates(
  sheetData: XmlElement,
  cells: readonly CellUpdate[],
  sharedStrings: readonly string[],
): XmlElement {
  // Group updates by row
  const byRow = new Map<number, CellUpdate[]>();
  for (const cell of cells) {
    const existing = byRow.get(cell.row) ?? [];
    existing.push(cell);
    byRow.set(cell.row, existing);
  }

  // Get existing rows
  const existingRows = getChildren(sheetData, "row");
  const rowMap = new Map<number, XmlElement>();
  for (const row of existingRows) {
    const rStr = row.attrs["r"];
    if (rStr) {
      rowMap.set(parseInt(rStr, 10), row);
    }
  }

  // Update or create rows
  for (const [rowNum, updates] of byRow) {
    const existingRow = rowMap.get(rowNum);
    const newRow = applyRowUpdates(existingRow, rowNum, updates, sharedStrings);
    rowMap.set(rowNum, newRow);
  }

  // Sort rows by row number and create new sheetData
  const sortedRows = Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);

  // Preserve non-row children and append rows
  const nonRowChildren = sheetData.children.filter(
    (child) => !isXmlElement(child) || child.name !== "row",
  );

  return createElement("sheetData", sheetData.attrs, [...nonRowChildren, ...sortedRows]);
}

/**
 * Apply updates to a single row.
 */
function applyRowUpdates(
  existingRow: XmlElement | undefined,
  rowNum: number,
  updates: readonly CellUpdate[],
  sharedStrings: readonly string[],
): XmlElement {
  // Get existing cells
  const cellMap = new Map<string, XmlElement>();
  if (existingRow) {
    const existingCells = getChildren(existingRow, "c");
    for (const cell of existingCells) {
      const ref = cell.attrs["r"];
      if (ref) {
        const colMatch = ref.match(/^([A-Z]+)/);
        if (colMatch) {
          cellMap.set(colMatch[1], cell);
        }
      }
    }
  }

  // Apply updates
  for (const update of updates) {
    const col = update.col.toUpperCase();
    const ref = `${col}${rowNum}`;
    const newCell = createCellElement(ref, update.value, sharedStrings);
    cellMap.set(col, newCell);
  }

  // Sort cells by column and create row
  const sortedCells = Array.from(cellMap.entries())
    .sort(([a], [b]) => columnLetterToIndex(a) - columnLetterToIndex(b))
    .map(([, cell]) => cell);

  const rowAttrs: Record<string, string> = { r: String(rowNum) };
  if (existingRow?.attrs["spans"]) {
    rowAttrs["spans"] = existingRow.attrs["spans"];
  }

  return createElement("row", rowAttrs, sortedCells);
}

/**
 * Create a cell element for a value.
 */
function createCellElement(
  ref: string,
  value: string | number,
  sharedStrings: readonly string[],
): XmlElement {
  if (typeof value === "number") {
    // Numeric cell
    return createElement("c", { r: ref }, [createElement("v", {}, [createText(String(value))])]);
  }

  // String cell - use shared string
  const ssIndex = sharedStrings.indexOf(value);
  if (ssIndex !== -1) {
    return createElement("c", { r: ref, t: "s" }, [
      createElement("v", {}, [createText(String(ssIndex))]),
    ]);
  }

  // Inline string fallback (shouldn't happen if we added to shared strings)
  return createElement("c", { r: ref, t: "inlineStr" }, [
    createElement("is", {}, [createElement("t", {}, [createText(value)])]),
  ]);
}

/**
 * Patch shared strings XML.
 */
function patchSharedStringsXml(pkg: ZipPackage, sharedStrings: readonly string[]): void {
  const siElements = sharedStrings.map((str) =>
    createElement("si", {}, [createElement("t", {}, [createText(str)])]),
  );

  const sstElement = createElement(
    "sst",
    {
      xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      count: String(sharedStrings.length),
      uniqueCount: String(sharedStrings.length),
    },
    siElements,
  );

  const serialized = serializeDocument({ children: [sstElement] }, { declaration: true, standalone: true });
  pkg.writeText("xl/sharedStrings.xml", serialized);
}

// =============================================================================
// Helper Functions
// =============================================================================

function replaceChild(parent: XmlElement, childName: string, newChild: XmlElement): XmlElement {
  const newChildren = parent.children.map((child) => {
    if (isXmlElement(child) && child.name === childName) {
      return newChild;
    }
    return child;
  });
  return createElement(parent.name, parent.attrs, newChildren);
}

function appendChildElement(parent: XmlElement, child: XmlElement): XmlElement {
  return createElement(parent.name, parent.attrs, [...parent.children, child]);
}

function insertChildAfter(parent: XmlElement, afterName: string, child: XmlElement): XmlElement {
  const reduced = parent.children.reduce(
    (acc, existing): { readonly children: readonly XmlNode[]; readonly inserted: boolean } => {
      const nextChildren = [...acc.children, existing];
      if (!acc.inserted && isXmlElement(existing) && existing.name === afterName) {
        return { children: [...nextChildren, child], inserted: true };
      }
      return { children: nextChildren, inserted: acc.inserted };
    },
    { children: [] as readonly XmlNode[], inserted: false },
  );

  if (reduced.inserted) {
    return createElement(parent.name, parent.attrs, [...reduced.children]);
  }
  return createElement(parent.name, parent.attrs, [child, ...reduced.children]);
}

function columnLetterToIndex(col: string): number {
  const upper = col.toUpperCase();
  return [...upper].reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0);
}

// =============================================================================
// High-Level API
// =============================================================================

/**
 * Update chart data in a workbook.
 *
 * This is a convenience function for the common case of updating
 * categories in column A and values in subsequent columns.
 *
 * @param workbook - Parsed workbook
 * @param sheetName - Sheet to update
 * @param categories - Category values (written to column A starting at row 2)
 * @param seriesData - Array of series values (each written to columns B, C, D, etc.)
 * @param headerRow - Row for series names (default: 1)
 * @param seriesNames - Names for each series (written to header row)
 * @returns Updated xlsx buffer
 */
export async function updateChartDataInWorkbook(
  workbook: Workbook,
  sheetName: string,
  categories: readonly string[],
  seriesData: readonly (readonly number[])[],
  headerRow: number = 1,
  seriesNames?: readonly string[],
): Promise<ArrayBuffer> {
  const cells: CellUpdate[] = [];
  const startRow = headerRow + 1;

  // Write category header (optional)
  // cells.push({ col: "A", row: headerRow, value: "Category" });

  // Write series names to header row
  if (seriesNames) {
    for (let i = 0; i < seriesNames.length; i++) {
      cells.push({
        col: indexToColumnLetter(colIdx(i + 2)), // B, C, D, ...
        row: headerRow,
        value: seriesNames[i],
      });
    }
  }

  // Write categories to column A
  for (let i = 0; i < categories.length; i++) {
    cells.push({
      col: "A",
      row: startRow + i,
      value: categories[i],
    });
  }

  // Write series values to columns B, C, D, ...
  for (let seriesIdx = 0; seriesIdx < seriesData.length; seriesIdx++) {
    const values = seriesData[seriesIdx];
    const col = indexToColumnLetter(colIdx(seriesIdx + 2)); // B, C, D, ...

    for (let i = 0; i < values.length; i++) {
      cells.push({
        col,
        row: startRow + i,
        value: values[i],
      });
    }
  }

  // Calculate dimension
  const lastRow = startRow + categories.length - 1;
  const lastCol = indexToColumnLetter(colIdx(seriesData.length + 1));
  const dimension = `A${headerRow}:${lastCol}${lastRow}`;

  const result = await patchWorkbook(workbook, [
    { sheetName, cells, dimension },
  ]);

  return result.xlsxBuffer;
}
