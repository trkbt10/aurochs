/**
 * @file list command - list sheets with summary
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { getSheetRange, type SheetRange } from "@oxen-office/xlsx/domain/sheet-utils";

function formatRangeString(range: SheetRange | undefined): string | undefined {
  if (!range) {
    return undefined;
  }
  return `${range.startCol}${range.startRow}:${range.endCol}${range.endRow}`;
}

export type SheetListItem = {
  readonly name: string;
  readonly rowCount: number;
  readonly cellCount: number;
  readonly range?: string;
  readonly mergedCellCount?: number;
  readonly formulaCount?: number;
  readonly hasAutoFilter?: boolean;
};

export type ListData = {
  readonly sheets: readonly SheetListItem[];
};

/**
 * List sheets in an XLSX file with summary information.
 */
export async function runList(filePath: string): Promise<Result<ListData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetListItem[] = workbook.sheets.map((sheet) => {
      const cellCount = sheet.rows.reduce((sum, row) => sum + row.cells.length, 0);
      const formulaCount = sheet.rows.reduce(
        (sum, row) => sum + row.cells.filter((cell) => cell.formula).length,
        0,
      );

      const rangeStr = formatRangeString(getSheetRange(sheet));

      return {
        name: sheet.name,
        rowCount: sheet.rows.length,
        cellCount,
        range: rangeStr,
        ...(sheet.mergeCells && sheet.mergeCells.length > 0 && { mergedCellCount: sheet.mergeCells.length }),
        ...(formulaCount > 0 && { formulaCount }),
        ...(sheet.autoFilter && { hasAutoFilter: true }),
      };
    });

    return success({ sheets });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
