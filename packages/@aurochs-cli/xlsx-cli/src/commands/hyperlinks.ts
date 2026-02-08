/**
 * @file hyperlinks command - display worksheet hyperlinks
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import { formatRange } from "@aurochs-office/xlsx/domain/cell/address";

// =============================================================================
// Types
// =============================================================================

export type HyperlinkJson = {
  readonly ref: string;
  readonly target?: string;
  readonly targetMode?: string;
  readonly display?: string;
  readonly location?: string;
  readonly tooltip?: string;
};

export type SheetHyperlinksJson = {
  readonly sheetName: string;
  readonly hyperlinks: readonly HyperlinkJson[];
};

export type HyperlinksData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetHyperlinksJson[];
};

// =============================================================================
// Serialization Helpers
// =============================================================================

function serializeHyperlink(h: XlsxHyperlink): HyperlinkJson {
  return {
    ref: formatRange(h.ref),
    ...(h.target && { target: h.target }),
    ...(h.targetMode && { targetMode: h.targetMode }),
    ...(h.display && { display: h.display }),
    ...(h.location && { location: h.location }),
    ...(h.tooltip && { tooltip: h.tooltip }),
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display hyperlinks from an XLSX file.
 */
export async function runHyperlinks(
  filePath: string,
  options: { sheet?: string } = {},
): Promise<Result<HyperlinksData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetHyperlinksJson[] = workbook.sheets
      .filter((sheet) => !options.sheet || sheet.name === options.sheet)
      .filter((sheet) => sheet.hyperlinks && sheet.hyperlinks.length > 0)
      .map((sheet) => ({
        sheetName: sheet.name,
        hyperlinks: sheet.hyperlinks!.map(serializeHyperlink),
      }));

    const totalCount = sheets.reduce((sum, s) => sum + s.hyperlinks.length, 0);

    return success({
      totalCount,
      sheets,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
