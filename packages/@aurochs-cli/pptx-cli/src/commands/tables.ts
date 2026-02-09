/**
 * @file tables command - display table information from PPTX slides
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseSlide } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { extractTextFromBody } from "@aurochs-office/pptx/domain/text-utils";
import type { Table } from "@aurochs-office/pptx/domain/table/types";
import { getSlideNumbers, collectShapes } from "./utils";

export type PptxTableSummaryJson = {
  readonly slideNumber: number;
  readonly index: number;
  readonly rowCount: number;
  readonly colCount: number;
  readonly styleId?: string;
  readonly firstCellPreview?: string;
};

export type TablesData = {
  readonly count: number;
  readonly tables: readonly PptxTableSummaryJson[];
};

export type TablesOptions = {
  readonly slides?: string;
};

function getFirstCellPreview(table: Table): string | undefined {
  const firstCell = table.rows[0]?.cells[0];
  if (!firstCell?.textBody) {
    return undefined;
  }
  const text = extractTextFromBody(firstCell.textBody).trim();
  if (!text) {
    return undefined;
  }
  return text.length > 50 ? text.substring(0, 50) + "..." : text;
}

/**
 * Display table information from PPTX slides.
 */
export async function runTables(filePath: string, options: TablesOptions): Promise<Result<TablesData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    const slideNumbers = getSlideNumbers(options.slides, presentation.count);
    const tables: PptxTableSummaryJson[] = [];
    // eslint-disable-next-line no-restricted-syntax -- mutable counter incremented in loop
    let tableIndex = 0;

    for (const slideNumber of slideNumbers) {
      const apiSlide = presentation.getSlide(slideNumber);
      const domainSlide = parseSlide(apiSlide.content);
      const shapes = domainSlide?.shapes ?? [];

      const foundTables = collectShapes(shapes, (s) => {
        if (s.type === "graphicFrame" && s.content.type === "table") {
          return s.content.data.table;
        }
        return undefined;
      });

      for (const table of foundTables) {
        const firstCellPreview = getFirstCellPreview(table);
        const summary: PptxTableSummaryJson = {
          slideNumber,
          index: tableIndex,
          rowCount: table.rows.length,
          colCount: table.grid.columns.length,
          ...(table.properties.tableStyleId && { styleId: table.properties.tableStyleId }),
          ...(firstCellPreview ? { firstCellPreview } : {}),
        };
        tables.push(summary);
        tableIndex++;
      }
    }

    return success({ count: tables.length, tables });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
