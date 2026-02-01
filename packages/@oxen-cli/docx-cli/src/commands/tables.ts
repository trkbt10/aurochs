/**
 * @file tables command - display table information
 */

import * as fs from "node:fs/promises";
import { loadDocx } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import type { DocxTable } from "@oxen-office/docx/domain/table";
import { extractTextFromBlockContent } from "@oxen-office/docx/domain/text-utils";

// =============================================================================
// Types
// =============================================================================

export type TableSummaryJson = {
  readonly index: number;
  readonly rowCount: number;
  readonly colCount: number;
  readonly style?: string;
  readonly firstCellPreview?: string;
};

export type TablesData = {
  readonly count: number;
  readonly tables: readonly TableSummaryJson[];
};

// =============================================================================
// Helpers
// =============================================================================

function serializeTable(table: DocxTable, index: number): TableSummaryJson {
  const rowCount = table.rows.length;
  const colCount = table.rows[0]?.cells.length ?? 0;
  const style = table.properties?.tblStyle as string | undefined;

  // Get first cell preview
  let firstCellPreview: string | undefined;
  const firstCell = table.rows[0]?.cells[0];
  if (firstCell) {
    const text = firstCell.content
      .map((c) => extractTextFromBlockContent(c as Parameters<typeof extractTextFromBlockContent>[0]))
      .join(" ")
      .trim();
    firstCellPreview = text.length > 50 ? `${text.slice(0, 47)}...` : text || undefined;
  }

  return {
    index,
    rowCount,
    colCount,
    ...(style && { style }),
    ...(firstCellPreview && { firstCellPreview }),
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display tables from a DOCX file.
 */
export async function runTables(filePath: string): Promise<Result<TablesData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const doc = await loadDocx(buffer);

    const tables: TableSummaryJson[] = [];
    let tableIndex = 0;

    for (const block of doc.body.content) {
      if (block.type === "table") {
        tables.push(serializeTable(block, tableIndex));
        tableIndex++;
      }
    }

    return success({
      count: tables.length,
      tables,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
