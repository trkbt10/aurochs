/**
 * @file validation command - display data validation rules
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type { XlsxDataValidation } from "@aurochs-office/xlsx/domain/data-validation";

// =============================================================================
// Types
// =============================================================================

export type ValidationRuleJson = {
  readonly sqref: string;
  readonly type?: string;
  readonly operator?: string;
  readonly formula1?: string;
  readonly formula2?: string;
  readonly allowBlank?: boolean;
  readonly showDropDown?: boolean;
  readonly errorStyle?: string;
  readonly promptTitle?: string;
  readonly prompt?: string;
  readonly errorTitle?: string;
  readonly error?: string;
};

export type SheetValidationJson = {
  readonly sheetName: string;
  readonly validations: readonly ValidationRuleJson[];
};

export type ValidationData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetValidationJson[];
};

// =============================================================================
// Serialization Helpers
// =============================================================================

function serializeValidation(v: XlsxDataValidation): ValidationRuleJson {
  return {
    sqref: v.sqref,
    ...(v.type && { type: v.type }),
    ...(v.operator && { operator: v.operator }),
    ...(v.formula1 && { formula1: v.formula1 }),
    ...(v.formula2 && { formula2: v.formula2 }),
    ...(v.allowBlank !== undefined && { allowBlank: v.allowBlank }),
    ...(v.showDropDown !== undefined && { showDropDown: v.showDropDown }),
    ...(v.errorStyle && { errorStyle: v.errorStyle }),
    ...(v.promptTitle && { promptTitle: v.promptTitle }),
    ...(v.prompt && { prompt: v.prompt }),
    ...(v.errorTitle && { errorTitle: v.errorTitle }),
    ...(v.error && { error: v.error }),
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display data validation rules from an XLSX file.
 */
export async function runValidation(
  filePath: string,
  options: { sheet?: string } = {},
): Promise<Result<ValidationData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetValidationJson[] = workbook.sheets
      .filter((sheet) => !options.sheet || sheet.name === options.sheet)
      .filter((sheet) => sheet.dataValidations && sheet.dataValidations.length > 0)
      .map((sheet) => ({
        sheetName: sheet.name,
        validations: sheet.dataValidations!.map(serializeValidation),
      }));

    const totalCount = sheets.reduce((sum, s) => sum + s.validations.length, 0);

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
