/**
 * @file Conditional formatting resolver (SpreadsheetML → rendering)
 *
 * Resolves which differential format (DXF) should be applied to a given cell based on
 * worksheet `<conditionalFormatting>` rules and styles.xml `<dxfs>`.
 *
 * This is used by the xlsx-editor grid to apply conditional fill/font/number formats.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.18 (conditionalFormatting)
 * @see ECMA-376 Part 4, Section 18.3.1.10 (cfRule)
 */

import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { XlsxStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { XlsxDifferentialFormat } from "@oxen/xlsx/domain/style/dxf";
import type { XlsxConditionalFormattingRule } from "@oxen/xlsx/domain/conditional-formatting";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { FormulaEvaluator } from "@oxen/xlsx/formula/evaluator";
import type { FormulaScalar } from "@oxen/xlsx/formula/types";
import { isFormulaError } from "@oxen/xlsx/formula/types";
import { shiftFormulaReferences } from "@oxen/xlsx/formula/shift";

type ResolvedRule = {
  readonly priority: number;
  readonly dxfId: number;
  readonly rule: XlsxConditionalFormattingRule;
  readonly anchor: CellAddress;
};

function getRangeBounds(range: CellRange): { readonly minRow: number; readonly maxRow: number; readonly minCol: number; readonly maxCol: number } {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;
  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

function rangeContainsAddress(range: CellRange, address: CellAddress): boolean {
  const bounds = getRangeBounds(range);
  const row = address.row as number;
  const col = address.col as number;
  return bounds.minRow <= row && row <= bounds.maxRow && bounds.minCol <= col && col <= bounds.maxCol;
}

function createRangeAnchor(range: CellRange): CellAddress {
  const bounds = getRangeBounds(range);
  return {
    col: colIdx(bounds.minCol),
    row: rowIdx(bounds.minRow),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function shiftConditionalFormula(formula: string, anchor: CellAddress, address: CellAddress): string {
  const deltaCols = (address.col as number) - (anchor.col as number);
  const deltaRows = (address.row as number) - (anchor.row as number);
  return shiftFormulaReferences(formula, deltaCols, deltaRows);
}

function valueToScalar(value: CellValue): FormulaScalar {
  switch (value.type) {
    case "empty":
      return null;
    case "string":
      return value.value;
    case "number":
      return value.value;
    case "boolean":
      return value.value;
    case "error":
      return { type: "error", value: value.value };
    case "date":
      return value.value.toISOString();
  }
}

function getCellScalar(
  cell: Cell | undefined,
  sheetIndex: number,
  address: CellAddress,
  formulaEvaluator: FormulaEvaluator,
): FormulaScalar {
  if (!cell) {
    return null;
  }
  if (cell.formula) {
    return formulaEvaluator.evaluateCell(sheetIndex, address);
  }
  return valueToScalar(cell.value);
}

function asCompareOperator(op: string | undefined): "<" | "<=" | ">" | ">=" | "=" | "<>" | null {
  switch (op) {
    case "lessThan":
      return "<";
    case "lessThanOrEqual":
      return "<=";
    case "greaterThan":
      return ">";
    case "greaterThanOrEqual":
      return ">=";
    case "equal":
      return "=";
    case "notEqual":
      return "<>";
  }
  return null;
}

function compareScalars(left: FormulaScalar, right: FormulaScalar, op: "<" | "<=" | ">" | ">=" | "=" | "<>"): boolean {
  if (isFormulaError(left) || isFormulaError(right)) {
    return false;
  }
  if (op === "=") {
    return left === right;
  }
  if (op === "<>") {
    return left !== right;
  }
  if (left === null || right === null) {
    return false;
  }
  if (typeof left !== typeof right) {
    return false;
  }
  if (typeof left === "boolean") {
    return false;
  }
  if (typeof left === "number") {
    if (op === "<") {
      return left < (right as number);
    }
    if (op === "<=") {
      return left <= (right as number);
    }
    if (op === ">") {
      return left > (right as number);
    }
    return left >= (right as number);
  }
  if (typeof left === "string") {
    const cmp = left.localeCompare(right as string);
    if (op === "<") {
      return cmp < 0;
    }
    if (op === "<=") {
      return cmp <= 0;
    }
    if (op === ">") {
      return cmp > 0;
    }
    return cmp >= 0;
  }
  return false;
}

function evaluateRuleMatchesCell(
  rule: XlsxConditionalFormattingRule,
  cell: Cell | undefined,
  sheetIndex: number,
  anchor: CellAddress,
  address: CellAddress,
  formulaEvaluator: FormulaEvaluator,
): boolean {
  if (rule.type === "cellIs") {
    const compareOp = asCompareOperator(rule.operator);
    const criterion = rule.formulas[0];
    if (!compareOp || !criterion) {
      return false;
    }
    const left = getCellScalar(cell, sheetIndex, address, formulaEvaluator);
    const evaluated = formulaEvaluator.evaluateFormulaResult(sheetIndex, address, shiftConditionalFormula(criterion, anchor, address));
    if (Array.isArray(evaluated)) {
      return false;
    }
    if (isFormulaError(evaluated)) {
      return false;
    }
    const right = evaluated;
    return compareScalars(left, right, compareOp);
  }

  if (rule.type === "expression") {
    const expr = rule.formulas[0];
    if (!expr) {
      return false;
    }
    const evaluated = formulaEvaluator.evaluateFormulaResult(sheetIndex, address, shiftConditionalFormula(expr, anchor, address));
    if (Array.isArray(evaluated)) {
      return false;
    }
    if (isFormulaError(evaluated)) {
      return false;
    }
    if (evaluated === null) {
      return false;
    }
    if (typeof evaluated === "boolean") {
      return evaluated;
    }
    if (typeof evaluated === "number") {
      return Number.isFinite(evaluated) && evaluated !== 0;
    }
    return false;
  }

  const expr = rule.formulas[0];
  if (!expr) {
    return false;
  }
  const evaluated = formulaEvaluator.evaluateFormulaResult(sheetIndex, address, shiftConditionalFormula(expr, anchor, address));
  if (Array.isArray(evaluated)) {
    return false;
  }
  if (isFormulaError(evaluated)) {
    return false;
  }
  if (evaluated === null) {
    return false;
  }
  if (typeof evaluated === "boolean") {
    return evaluated;
  }
  if (typeof evaluated === "number") {
    return Number.isFinite(evaluated) && evaluated !== 0;
  }
  return false;
}

function collectApplicableRules(sheet: XlsxWorksheet, address: CellAddress): readonly ResolvedRule[] {
  const conditionals = sheet.conditionalFormattings;
  if (!conditionals || conditionals.length === 0) {
    return [];
  }

  const collected: ResolvedRule[] = [];
  for (const conditional of conditionals) {
    const ranges = conditional.ranges;
    const matching = ranges.filter((range) => rangeContainsAddress(range, address));
    if (matching.length === 0) {
      continue;
    }
    for (const range of matching) {
      const anchor = createRangeAnchor(range);
      for (const rule of conditional.rules) {
        const dxfId = rule.dxfId;
        if (dxfId === undefined) {
          continue;
        }
        collected.push({
          priority: rule.priority ?? Number.POSITIVE_INFINITY,
          dxfId,
          rule,
          anchor,
        });
      }
    }
  }
  return [...collected].sort((a, b) => a.priority - b.priority);
}

/**
 * Resolve the effective DXF to apply for a cell, or undefined when no rule matches.
 */
export function resolveCellConditionalDifferentialFormat(params: {
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly sheetIndex: number;
  readonly address: CellAddress;
  readonly cell: Cell | undefined;
  readonly formulaEvaluator: FormulaEvaluator;
}): XlsxDifferentialFormat | undefined {
  const dxfs = params.styles.dxfs;
  if (!dxfs || dxfs.length === 0) {
    return undefined;
  }

  const rules = collectApplicableRules(params.sheet, params.address);
  for (const candidate of rules) {
    const matches = evaluateRuleMatchesCell(
      candidate.rule,
      params.cell,
      params.sheetIndex,
      candidate.anchor,
      params.address,
      params.formulaEvaluator,
    );
    if (!matches) {
      continue;
    }
    return dxfs[candidate.dxfId];
  }
  return undefined;
}
