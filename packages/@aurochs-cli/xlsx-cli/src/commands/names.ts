/**
 * @file names command - display defined names (named ranges)
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";

// =============================================================================
// Types
// =============================================================================

export type NameItemJson = {
  readonly name: string;
  readonly formula: string;
  readonly scope?: string;
  readonly hidden?: boolean;
};

export type NamesData = {
  readonly count: number;
  readonly names: readonly NameItemJson[];
};

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display defined names from an XLSX file.
 */
export async function runNames(filePath: string): Promise<Result<NamesData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    if (!workbook.definedNames || workbook.definedNames.length === 0) {
      return success({
        count: 0,
        names: [],
      });
    }

    const getScope = (localSheetId: number | undefined): string | undefined => {
      if (localSheetId === undefined) {
        return undefined;
      }
      return workbook.sheets[localSheetId]?.name ?? `Sheet ${localSheetId + 1}`;
    };

    const names: NameItemJson[] = workbook.definedNames.map((dn) => {
      const scope = getScope(dn.localSheetId);

      return {
        name: dn.name,
        formula: dn.formula,
        ...(scope && { scope }),
        ...(dn.hidden && { hidden: true }),
      };
    });

    return success({
      count: names.length,
      names,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
