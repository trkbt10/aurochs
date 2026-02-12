/**
 * @file preview command - ASCII grid and SVG visualization of sheet data
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { renderSheetAscii, type AsciiCell, type AsciiSheetRow } from "@aurochs-renderer/xlsx/ascii";
import { renderSheetToSvg } from "@aurochs-renderer/xlsx/svg";
import { getSheetRange } from "@aurochs-office/xlsx/domain/sheet-utils";
import type { XlsxWorksheet, XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { serializeCell } from "../serializers/cell-serializer";
import { columnLetterToIndex } from "@aurochs-office/xlsx/domain/cell/address";

// =============================================================================
// Types
// =============================================================================

export type PreviewFormat = "ascii" | "svg";

export type PreviewSheet = {
  readonly name: string;
  readonly ascii?: string;
  readonly svg?: string;
  readonly rows: readonly AsciiSheetRow[];
  readonly rowCount: number;
  readonly colCount: number;
};

export type PreviewData = {
  readonly format: PreviewFormat;
  readonly sheets: readonly PreviewSheet[];
};

export type PreviewOptions = {
  readonly format?: PreviewFormat;
  readonly width: number;
  readonly range?: string;
};

// =============================================================================
// Range Parsing
// =============================================================================

type ParsedRange = {
  readonly startCol: number;
  readonly startRow: number;
  readonly endCol: number;
  readonly endRow: number;
};

function parseRange(range: string): ParsedRange | undefined {
  const match = range.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
  if (!match) {
    return undefined;
  }
  const startCol = columnLetterToIndex(match[1]!.toUpperCase()) as number;
  const startRow = parseInt(match[2]!, 10);
  const endCol = match[3] ? (columnLetterToIndex(match[3].toUpperCase()) as number) : startCol;
  const endRow = match[4] ? parseInt(match[4], 10) : startRow;
  return { startCol, startRow, endCol, endRow };
}

function sheetRangeToTargetRange(sheetRange: ReturnType<typeof getSheetRange>): ParsedRange | undefined {
  if (!sheetRange) {
    return undefined;
  }
  return {
    startCol: columnLetterToIndex(sheetRange.startCol) as number,
    startRow: sheetRange.startRow,
    endCol: columnLetterToIndex(sheetRange.endCol) as number,
    endRow: sheetRange.endRow,
  };
}

function colIndexToLetter(colNum: number): string {
  if (colNum < 0) {
    return "";
  }
  const char = String.fromCharCode((colNum % 26) + 65);
  const remaining = Math.floor(colNum / 26) - 1;
  return colIndexToLetter(remaining) + char;
}

function resolveTargetRange(options: PreviewOptions, sheet: XlsxWorksheet): ParsedRange | undefined {
  if (options.range) {
    return parseRange(options.range);
  }
  return sheetRangeToTargetRange(getSheetRange(sheet));
}

// =============================================================================
// Command
// =============================================================================

/**
 * Render a sheet to SVG.
 */
function renderSheetSvg(params: {
  readonly workbook: XlsxWorkbook;
  readonly sheetIndex: number;
  readonly sheet: XlsxWorksheet;
}): PreviewSheet {
  const { workbook, sheetIndex, sheet } = params;
  const svgResult = renderSheetToSvg({ workbook, sheetIndex });

  return {
    name: sheet.name,
    svg: svgResult.svg,
    rows: [],
    rowCount: svgResult.rowCount,
    colCount: svgResult.colCount,
  };
}

/**
 * Render a sheet to ASCII.
 */
function renderSheetAsciiPreview(params: {
  readonly sheet: XlsxWorksheet;
  readonly options: PreviewOptions;
}): PreviewSheet {
  const { sheet, options } = params;
  const targetRange = resolveTargetRange(options, sheet);

  if (!targetRange) {
    return {
      name: sheet.name,
      ascii: `(empty sheet: ${sheet.name})`,
      rows: [],
      rowCount: 0,
      colCount: 0,
    };
  }

  const colCount = targetRange.endCol - targetRange.startCol + 1;

  // Build cell map for quick lookup
  const cellMap = new Map<string, ReturnType<typeof serializeCell>>();
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      const serialized = serializeCell(cell);
      cellMap.set(serialized.ref, serialized);
    }
  }

  // Build rows
  const asciiRows: AsciiSheetRow[] = [];
  for (let rowNum = targetRange.startRow; rowNum <= targetRange.endRow; rowNum++) {
    const cells: AsciiCell[] = [];
    for (let colNum = targetRange.startCol; colNum <= targetRange.endCol; colNum++) {
      const ref = `${colIndexToLetter(colNum)}${rowNum}`;
      const cell = cellMap.get(ref);

      if (cell && cell.type !== "empty") {
        cells.push({
          value: cell.value,
          type: cell.type as AsciiCell["type"],
        });
      } else {
        cells.push({ value: null, type: "empty" });
      }
    }
    asciiRows.push({ rowNumber: rowNum, cells });
  }

  const ascii = renderSheetAscii({
    name: sheet.name,
    rows: asciiRows,
    columnCount: colCount,
    width: options.width,
  });

  return {
    name: sheet.name,
    ascii,
    rows: asciiRows,
    rowCount: asciiRows.length,
    colCount,
  };
}

/**
 * Generate an ASCII grid or SVG preview of one or all sheets in an XLSX file.
 */
export async function runPreview(
  filePath: string,
  sheetName: string | undefined,
  options: PreviewOptions,
): Promise<Result<PreviewData>> {
  const format = options.format ?? "ascii";

  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheetsToRender = sheetName ? workbook.sheets.filter((s) => s.name === sheetName) : workbook.sheets;

    if (sheetName && sheetsToRender.length === 0) {
      const available = workbook.sheets.map((s) => s.name).join(", ");
      return error("SHEET_NOT_FOUND", `Sheet "${sheetName}" not found. Available sheets: ${available}`);
    }

    const results: PreviewSheet[] = [];

    for (const sheet of sheetsToRender) {
      const sheetIndex = workbook.sheets.indexOf(sheet);

      if (format === "svg") {
        results.push(renderSheetSvg({ workbook, sheetIndex, sheet }));
      } else {
        results.push(renderSheetAsciiPreview({ sheet, options }));
      }
    }

    return success({ format, sheets: results });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
