/**
 * @file tables command - display table definitions (ListObjects)
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { formatRange } from "../serializers/sheet-serializer";

// =============================================================================
// Types
// =============================================================================

export type TableColumnJson = {
  readonly id: number;
  readonly name: string;
};

export type TableStyleInfoJson = {
  readonly name: string;
  readonly showFirstColumn?: boolean;
  readonly showLastColumn?: boolean;
  readonly showRowStripes?: boolean;
  readonly showColumnStripes?: boolean;
};

export type TableItemJson = {
  readonly id: number;
  readonly name: string;
  readonly displayName?: string;
  readonly ref: string;
  readonly sheetName: string;
  readonly headerRowCount: number;
  readonly totalsRowCount: number;
  readonly columns: readonly TableColumnJson[];
  readonly styleInfo?: TableStyleInfoJson;
};

export type TablesData = {
  readonly count: number;
  readonly tables: readonly TableItemJson[];
};

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display table definitions from an XLSX file.
 */
export async function runTables(filePath: string): Promise<Result<TablesData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    if (!workbook.tables || workbook.tables.length === 0) {
      return success({
        count: 0,
        tables: [],
      });
    }

    const tables: TableItemJson[] = workbook.tables.map((table) => {
      const sheet = workbook.sheets[table.sheetIndex];
      const sheetName = sheet ? sheet.name : `Sheet ${table.sheetIndex + 1}`;

      return {
        id: table.id,
        name: table.name,
        ...(table.displayName && { displayName: table.displayName }),
        ref: formatRange(table.ref),
        sheetName,
        headerRowCount: table.headerRowCount,
        totalsRowCount: table.totalsRowCount,
        columns: table.columns.map((col) => ({
          id: col.id,
          name: col.name,
        })),
        ...(table.styleInfo && {
          styleInfo: {
            name: table.styleInfo.name,
            ...(table.styleInfo.showFirstColumn && { showFirstColumn: true }),
            ...(table.styleInfo.showLastColumn && { showLastColumn: true }),
            ...(table.styleInfo.showRowStripes && { showRowStripes: true }),
            ...(table.styleInfo.showColumnStripes && { showColumnStripes: true }),
          },
        }),
      };
    });

    return success({
      count: tables.length,
      tables,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
