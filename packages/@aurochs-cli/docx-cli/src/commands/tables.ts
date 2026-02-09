/**
 * @file tables command - display table information
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadDocument } from "./loader";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import { extractTextFromBlockContent } from "@aurochs-office/docx/domain/text-utils";

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

function getFirstCellPreview(table: DocxTable): string | undefined {
  const firstCell = table.rows[0]?.cells[0];
  if (!firstCell) {
    return undefined;
  }
  const text = firstCell.content
    .map((c) => extractTextFromBlockContent(c as Parameters<typeof extractTextFromBlockContent>[0]))
    .join(" ")
    .trim();
  if (!text) {
    return undefined;
  }
  return text.length > 50 ? `${text.slice(0, 47)}...` : text;
}

function serializeTable(table: DocxTable, index: number): TableSummaryJson {
  const rowCount = table.rows.length;
  const colCount = table.rows[0]?.cells.length ?? 0;
  const style = table.properties?.tblStyle as string | undefined;
  const firstCellPreview = getFirstCellPreview(table);

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
    const doc = await loadDocument(filePath);

    const tables = doc.body.content
      .filter((block): block is DocxTable => block.type === "table")
      .map((table, index) => serializeTable(table, index));

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
