/**
 * @file extract command - extract data from sheets
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { formatCellRef, columnLetterToIndex } from "@oxen-office/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";
import type { CellValue } from "@oxen-office/xlsx/domain/cell/types";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { getSheetRange } from "@oxen-office/xlsx/domain/sheet-utils";
import { formatCellValue } from "../serializers/cell-serializer";

// =============================================================================
// Types
// =============================================================================

export type ExtractData = {
  readonly format: "csv" | "json";
  readonly sheetName: string;
  readonly content: string;
};

export type ExtractOptions = {
  readonly sheet?: string;
  readonly format?: "csv" | "json";
};

// =============================================================================
// CSV Formatting
// =============================================================================

function escapeCSVValue(value: CellValue): string {
  const str = formatCellValue(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatAsCSV(data: readonly (readonly CellValue[])[]): string {
  return data.map((row) => row.map(escapeCSVValue).join(",")).join("\n");
}

// =============================================================================
// JSON Formatting
// =============================================================================

function cellValueToJsonValue(value: CellValue): string | number | boolean | null {
  switch (value.type) {
    case "string":
      return value.value;
    case "number":
      return value.value;
    case "boolean":
      return value.value;
    case "date":
      return value.value.toISOString();
    case "error":
      return value.value;
    case "empty":
      return null;
  }
}

function formatAsJSON(data: readonly (readonly CellValue[])[]): string {
  const jsonData = data.map((row) => row.map(cellValueToJsonValue));
  return JSON.stringify(jsonData, null, 2);
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Extract data from a sheet in an XLSX file.
 */
export async function runExtract(filePath: string, options: ExtractOptions = {}): Promise<Result<ExtractData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    // Get the target sheet
    const sheetName = options.sheet ?? workbook.sheets[0]?.name;
    if (!sheetName) {
      return error("NO_SHEETS", "Workbook has no sheets");
    }

    const sheet = workbook.sheets.find((s) => s.name === sheetName);
    if (!sheet) {
      const availableSheets = workbook.sheets.map((s) => s.name).join(", ");
      return error(
        "SHEET_NOT_FOUND",
        `Sheet "${sheetName}" not found. Available sheets: ${availableSheets}`,
      );
    }

    const range = getSheetRange(sheet);
    if (!range) {
      const format = options.format ?? "csv";
      return success({
        format,
        sheetName,
        content: format === "csv" ? "" : "[]",
      });
    }

    // Build a map for quick cell lookup
    const cellMap = new Map<string, CellValue>();
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        const ref = formatCellRef(cell.address);
        cellMap.set(ref, cell.value);
      }
    }

    // Extract data
    const startColIdx = columnLetterToIndex(range.startCol) as number;
    const endColIdx = columnLetterToIndex(range.endCol) as number;
    const data: CellValue[][] = [];

    for (let rowNum = range.startRow; rowNum <= range.endRow; rowNum++) {
      const row: CellValue[] = [];
      for (let colNum = startColIdx; colNum <= endColIdx; colNum++) {
        const ref = formatCellRef({ col: colIdx(colNum), row: rowIdx(rowNum), colAbsolute: false, rowAbsolute: false });
        const value = cellMap.get(ref) ?? { type: "empty" as const };
        row.push(value);
      }
      data.push(row);
    }

    const format = options.format ?? "csv";
    const content = format === "csv" ? formatAsCSV(data) : formatAsJSON(data);

    return success({
      format,
      sheetName,
      content,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
