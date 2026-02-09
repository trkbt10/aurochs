/**
 * @file conditional command - display conditional formatting rules
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type {
  XlsxConditionalFormatting,
  XlsxConditionalFormattingRule,
  XlsxStandardRule,
} from "@aurochs-office/xlsx/domain/conditional-formatting";

// =============================================================================
// Types
// =============================================================================

export type ConditionalRuleJson = {
  readonly type: string;
  readonly priority?: number;
  readonly dxfId?: number;
  readonly operator?: string;
  readonly stopIfTrue?: boolean;
  readonly formulas: readonly string[];
};

export type ConditionalFormattingJson = {
  readonly sqref: string;
  readonly rules: readonly ConditionalRuleJson[];
};

export type SheetConditionalJson = {
  readonly sheetName: string;
  readonly formattings: readonly ConditionalFormattingJson[];
};

export type ConditionalData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetConditionalJson[];
};

// =============================================================================
// Serialization Helpers
// =============================================================================

function isStandardRule(rule: XlsxConditionalFormattingRule): rule is XlsxStandardRule {
  return "formulas" in rule;
}

function serializeRule(rule: XlsxConditionalFormattingRule): ConditionalRuleJson {
  if (isStandardRule(rule)) {
    return {
      type: rule.type,
      ...(rule.priority !== undefined && { priority: rule.priority }),
      ...(rule.dxfId !== undefined && { dxfId: rule.dxfId }),
      ...(rule.operator && { operator: rule.operator }),
      ...(rule.stopIfTrue !== undefined && { stopIfTrue: rule.stopIfTrue }),
      formulas: rule.formulas,
    };
  }
  return {
    type: rule.type,
    ...(rule.priority !== undefined && { priority: rule.priority }),
    ...(rule.stopIfTrue !== undefined && { stopIfTrue: rule.stopIfTrue }),
    formulas: [],
  };
}

function serializeConditionalFormatting(cf: XlsxConditionalFormatting): ConditionalFormattingJson {
  return {
    sqref: cf.sqref,
    rules: cf.rules.map(serializeRule),
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display conditional formatting rules from an XLSX file.
 */
export async function runConditional(
  filePath: string,
  options: { sheet?: string } = {},
): Promise<Result<ConditionalData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetConditionalJson[] = workbook.sheets
      .filter((sheet) => !options.sheet || sheet.name === options.sheet)
      .filter((sheet) => sheet.conditionalFormattings && sheet.conditionalFormattings.length > 0)
      .map((sheet) => ({
        sheetName: sheet.name,
        formattings: sheet.conditionalFormattings!.map(serializeConditionalFormatting),
      }));

    const totalCount = sheets.reduce((sum, s) => sum + s.formattings.length, 0);

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
