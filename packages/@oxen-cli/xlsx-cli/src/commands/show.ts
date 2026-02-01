/**
 * @file show command - display sheet content
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { formatCellRef, columnLetterToIndex, indexToColumnLetter } from "@oxen-office/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { getSheetRange, type SheetRange } from "@oxen-office/xlsx/domain/sheet-utils";
import { serializeCell, type CellJson } from "../serializers/cell-serializer";

// =============================================================================
// Types
// =============================================================================

export type CellData = {
  readonly ref: string;
  readonly type: "string" | "number" | "boolean" | "date" | "error" | "empty";
  readonly value: string | number | boolean | null;
  readonly formula?: string;
};

export type RowData = {
  readonly rowNumber: number;
  readonly cells: readonly CellData[];
};

export type ShowData = {
  readonly sheetName: string;
  readonly range?: string;
  readonly rows: readonly RowData[];
  readonly mergedCells?: readonly string[];
};

export type ShowOptions = {
  readonly range?: string; // Range like "A1:C10"
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
  // Match patterns like "A1:C10" or "A1"
  const match = range.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
  if (!match) {
    return undefined;
  }

  const startCol = columnLetterToIndex(match[1].toUpperCase()) as number;
  const startRow = parseInt(match[2], 10);
  const endCol = match[3] ? (columnLetterToIndex(match[3].toUpperCase()) as number) : startCol;
  const endRow = match[4] ? parseInt(match[4], 10) : startRow;

  return { startCol, startRow, endCol, endRow };
}

function sheetRangeToParsedRange(sheetRange: SheetRange | undefined): ParsedRange | undefined {
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

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display content of a specific sheet in an XLSX file.
 */
export async function runShow(filePath: string, sheetName: string, options: ShowOptions = {}): Promise<Result<ShowData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheet = workbook.sheets.find((s) => s.name === sheetName);
    if (!sheet) {
      const availableSheets = workbook.sheets.map((s) => s.name).join(", ");
      return error(
        "SHEET_NOT_FOUND",
        `Sheet "${sheetName}" not found. Available sheets: ${availableSheets}`,
      );
    }

    // Determine range to show
    const sheetRange = getSheetRange(sheet);
    const targetRange = options.range ? parseRange(options.range) : sheetRangeToParsedRange(sheetRange);

    if (!targetRange) {
      return success({
        sheetName,
        rows: [],
      });
    }

    // Build a map for quick cell lookup
    const cellMap = new Map<string, CellJson>();
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        const serialized = serializeCell(cell);
        cellMap.set(serialized.ref, serialized);
      }
    }

    // Extract rows in range
    const rows: RowData[] = [];

    for (let rowNum = targetRange.startRow; rowNum <= targetRange.endRow; rowNum++) {
      const cells: CellData[] = [];

      for (let colNum = targetRange.startCol; colNum <= targetRange.endCol; colNum++) {
        const ref = formatCellRef({ col: colIdx(colNum), row: rowIdx(rowNum), colAbsolute: false, rowAbsolute: false });
        const cell = cellMap.get(ref);
        if (cell && cell.type !== "empty") {
          cells.push({
            ref,
            type: cell.type,
            value: cell.value,
            ...(cell.formula && { formula: cell.formula }),
          });
        }
      }

      if (cells.length > 0) {
        rows.push({ rowNumber: rowNum, cells });
      }
    }

    const startColLetter = indexToColumnLetter(colIdx(targetRange.startCol));
    const endColLetter = indexToColumnLetter(colIdx(targetRange.endCol));
    const rangeStr = `${startColLetter}${targetRange.startRow}:${endColLetter}${targetRange.endRow}`;

    // Serialize merged cells
    const mergedCells = sheet.mergeCells?.map((range) => {
      const start = formatCellRef(range.start);
      const end = formatCellRef(range.end);
      return `${start}:${end}`;
    });

    return success({
      sheetName,
      range: rangeStr,
      rows,
      ...(mergedCells && mergedCells.length > 0 && { mergedCells }),
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
