/**
 * @file extract command - extract data from sheets
 *
 * Supports CSV, TSV, JSONL, and JSON output formats.
 * CSV/TSV output uses @aurochs-converters/interop-dsv-xlsx for proper
 * type-aware serialization (dates as ISO 8601, number formatting, etc.).
 * JSONL output converts the DsvDocument records into JSON objects.
 * JSON output preserves the internal cell value representation.
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { formatCellRef, columnLetterToIndex } from "@aurochs-office/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { getSheetRange } from "@aurochs-office/xlsx/domain/sheet-utils";
import { convertXlsxToDsv } from "@aurochs-converters/interop-dsv-xlsx";
import { buildDsv, buildJsonl } from "@aurochs/dsv";

// =============================================================================
// Types
// =============================================================================

export type ExtractFormat = "csv" | "tsv" | "jsonl" | "json";

export type ExtractData = {
  readonly format: ExtractFormat;
  readonly sheetName: string;
  readonly content: string;
};

export type ExtractOptions = {
  readonly sheet?: string;
  readonly format?: ExtractFormat;
};

// =============================================================================
// DSV-based formatting (CSV, TSV, JSONL)
// =============================================================================

/**
 * Convert DsvDocument records to an array of plain objects.
 * Each object maps header name → field value string.
 * When headers are absent, uses 0-based column index as key.
 */
function dsvRecordsToObjects(
  doc: import("@aurochs/dsv").DsvDocument,
): Record<string, unknown>[] {
  const headers = doc.headers;
  return doc.records.map((record) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < record.fields.length; i++) {
      const key = headers?.[i] ?? String(i);
      obj[key] = record.fields[i].value;
    }
    return obj;
  });
}

// =============================================================================
// JSON Formatting (internal representation)
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
 *
 * For CSV/TSV/JSONL formats, uses the converter pipeline:
 *   XlsxWorkbook → convertXlsxToDsv → DsvDocument → buildDsv/buildJsonl
 *
 * For JSON format, extracts raw cell values directly for internal representation.
 */
export async function runExtract(filePath: string, options: ExtractOptions = {}): Promise<Result<ExtractData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);
    const format: ExtractFormat = options.format ?? "csv";

    // Get the target sheet name
    const sheetName = options.sheet ?? workbook.sheets[0]?.name;
    if (!sheetName) {
      return error("NO_SHEETS", "Workbook has no sheets");
    }

    const sheetIndex = workbook.sheets.findIndex((s) => s.name === sheetName);
    if (sheetIndex === -1) {
      const availableSheets = workbook.sheets.map((s) => s.name).join(", ");
      return error("SHEET_NOT_FOUND", `Sheet "${sheetName}" not found. Available sheets: ${availableSheets}`);
    }

    // DSV-based formats: use converter pipeline
    if (format === "csv" || format === "tsv" || format === "jsonl") {
      const result = convertXlsxToDsv(workbook, {
        sheetIndex,
        firstRowAsHeaders: true,
      });

      let content: string;
      if (format === "jsonl") {
        const objects = dsvRecordsToObjects(result.data);
        content = buildJsonl(objects);
      } else {
        content = buildDsv(result.data, { dialect: format });
      }

      return success({ format, sheetName, content });
    }

    // JSON format: raw cell value extraction
    const sheet = workbook.sheets[sheetIndex];
    const range = getSheetRange(sheet);
    if (!range) {
      return success({ format, sheetName, content: "[]" });
    }

    const cellMap = new Map<string, CellValue>();
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        const ref = formatCellRef(cell.address);
        cellMap.set(ref, cell.value);
      }
    }

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

    const content = formatAsJSON(data);
    return success({ format, sheetName, content });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
