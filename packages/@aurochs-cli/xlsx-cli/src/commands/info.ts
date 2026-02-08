/**
 * @file info command - display workbook metadata
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";

export type InfoData = {
  readonly sheetCount: number;
  readonly sheetNames: readonly string[];
  readonly sharedStringCount: number;
  readonly totalRows: number;
  readonly totalCells: number;
  readonly hasStyles: boolean;
  readonly fontCount: number;
  readonly fillCount: number;
  readonly borderCount: number;
  readonly numberFormatCount: number;
  readonly mergedCellCount: number;
};

/**
 * Get workbook metadata from an XLSX file.
 */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheetNames = workbook.sheets.map((sheet) => sheet.name);

    const totalRows = workbook.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
    const totalCells = workbook.sheets.reduce(
      (sum, sheet) => sum + sheet.rows.reduce((rowSum, row) => rowSum + row.cells.length, 0),
      0,
    );
    const mergedCellCount = workbook.sheets.reduce((sum, sheet) => sum + (sheet.mergeCells?.length ?? 0), 0);

    const styles = workbook.styles;
    const hasStyles = styles.cellXfs.length > 1 || styles.fonts.length > 1;

    return success({
      sheetCount: workbook.sheets.length,
      sheetNames,
      sharedStringCount: workbook.sharedStrings.length,
      totalRows,
      totalCells,
      hasStyles,
      fontCount: styles.fonts.length,
      fillCount: styles.fills.length,
      borderCount: styles.borders.length,
      numberFormatCount: styles.numberFormats.length,
      mergedCellCount,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
