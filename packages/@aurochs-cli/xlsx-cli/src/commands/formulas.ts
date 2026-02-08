/**
 * @file formulas command - display and evaluate formulas
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { createFormulaEvaluator } from "@aurochs-office/xlsx/formula/evaluator";
import { formatCellRef } from "@aurochs-office/xlsx/domain/cell/address";
import type { FormulaScalar } from "@aurochs-office/xlsx/formula/types";

// =============================================================================
// Types
// =============================================================================

export type FormulaItemJson = {
  readonly ref: string;
  readonly formula: string;
  readonly storedValue: string | number | boolean | null;
  readonly calculatedValue?: string | number | boolean | null;
};

export type SheetFormulasJson = {
  readonly sheetName: string;
  readonly formulas: readonly FormulaItemJson[];
};

export type FormulasData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetFormulasJson[];
};

export type FormulasOptions = {
  readonly sheet?: string;
  readonly evaluate?: boolean;
};

// =============================================================================
// Helpers
// =============================================================================

function formatScalarValue(value: FormulaScalar): string | number | boolean | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object" && "type" in value && value.type === "error") {
    return value.value;
  }
  return String(value);
}

function formatCellValue(value: { type: string; value?: unknown }): string | number | boolean | null {
  switch (value.type) {
    case "string":
      return value.value as string;
    case "number":
      return value.value as number;
    case "boolean":
      return value.value as boolean;
    case "error":
      return value.value as string;
    case "date":
      return (value.value as Date).toISOString();
    case "empty":
      return null;
    default:
      return null;
  }
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display formulas from an XLSX file with optional evaluation.
 */
function evaluateFormula(
  evaluator: ReturnType<typeof createFormulaEvaluator> | undefined,
  sheetIndex: number,
  address: { col: number; row: number },
): string | number | boolean | null | undefined {
  if (!evaluator) {
    return undefined;
  }
  try {
    const result = evaluator.evaluateCell(sheetIndex, address);
    return formatScalarValue(result);
    // eslint-disable-next-line no-restricted-syntax -- Formula evaluation can fail for many reasons (missing references, unsupported functions, etc.)
  } catch {
    return "#ERROR!";
  }
}

/**
 * Display formulas from an XLSX file with optional evaluation.
 */
export async function runFormulas(filePath: string, options: FormulasOptions = {}): Promise<Result<FormulasData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const evaluator = options.evaluate ? createFormulaEvaluator(workbook) : undefined;

    const sheets: SheetFormulasJson[] = workbook.sheets
      .map((sheet, sheetIndex) => ({ sheet, sheetIndex }))
      .filter(({ sheet }) => !options.sheet || sheet.name === options.sheet)
      .map(({ sheet, sheetIndex }) => {
        const formulas: FormulaItemJson[] = sheet.rows.flatMap((row) =>
          row.cells
            .filter((cell) => cell.formula)
            .map((cell) => {
              const calculatedValue = evaluateFormula(evaluator, sheetIndex, cell.address);
              return {
                ref: formatCellRef(cell.address),
                formula: cell.formula!.expression,
                storedValue: formatCellValue(cell.value),
                ...(calculatedValue !== undefined && { calculatedValue }),
              };
            }),
        );

        return { sheetName: sheet.name, formulas };
      })
      .filter(({ formulas }) => formulas.length > 0);

    const totalCount = sheets.reduce((sum, s) => sum + s.formulas.length, 0);

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
