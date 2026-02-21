/**
 * @file High-level content extraction API for XLSX
 *
 * Provides structured extraction of text content from Excel workbooks.
 */

import type { ContentSegment, ExtractionResult } from "@aurochs-office/ooxml";
import type { Workbook, WorkbookSheet } from "../workbook-parser";
import { extractTextFromSheet } from "../text-utils";

/**
 * Sheet segment with XLSX-specific metadata.
 */
export type SheetSegment = ContentSegment<"sheet"> & {
  readonly metadata: {
    /** Sheet name */
    readonly sheetName: string;
    /** Number of rows with data */
    readonly rowCount: number;
    /** Total number of cells with data */
    readonly cellCount: number;
  };
};

/**
 * Result of sheet extraction.
 */
export type SheetExtractionResult = ExtractionResult<"sheet"> & {
  readonly segments: readonly SheetSegment[];
};

/**
 * Count total cells in a sheet.
 */
function countCells(sheet: WorkbookSheet): number {
  return Array.from(sheet.rows.values()).reduce((count, row) => count + row.cells.size, 0);
}

/**
 * Extract content segments from a workbook.
 *
 * Returns one segment per sheet containing the sheet's text content.
 *
 * @example
 * ```typescript
 * import { parseWorkbook } from "aurochs/xlsx/parser";
 * import { extractSheetSegments } from "aurochs/xlsx/extract";
 *
 * const workbook = await parseWorkbook(xlsxBuffer);
 * const result = extractSheetSegments(workbook);
 *
 * for (const segment of result.segments) {
 *   console.log(`Sheet "${segment.metadata.sheetName}":`);
 *   console.log(`  ${segment.metadata.rowCount} rows, ${segment.metadata.cellCount} cells`);
 *   console.log(segment.text);
 * }
 * ```
 */
export function extractSheetSegments(workbook: Workbook): SheetExtractionResult {
  const sheetsArray = Array.from(workbook.sheets.values());

  const { segments } = sheetsArray.reduce<{ segments: SheetSegment[]; offset: number }>(
    (acc, sheet, index) => {
      const text = extractTextFromSheet(sheet);
      const rowCount = sheet.rows.size;
      const cellCount = countCells(sheet);

      const start = acc.offset;
      const end = acc.offset + text.length;

      return {
        segments: [
          ...acc.segments,
          {
            id: `sheet-${index}`,
            type: "sheet" as const,
            text,
            sourceRange: { start, end },
            metadata: {
              sheetName: sheet.name,
              rowCount,
              cellCount,
            },
          },
        ],
        offset: end + 1, // +1 for segment separator
      };
    },
    { segments: [], offset: 0 }
  );

  const totalText = segments.map((s) => s.text).join("\n");

  return {
    segments,
    totalText,
    sourceLength: totalText.length,
  };
}
