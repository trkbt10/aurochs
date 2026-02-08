/**
 * @file Formula Evaluator
 *
 * Evaluates a parsed formula AST against a workbook snapshot.
 * This module is intentionally side-effect free: it reads cell values/formulas from the workbook,
 * resolves references/ranges, and executes registered functions with caching and cycle detection.
 */

import type { CellAddress } from "../domain/cell/address";
import { parseRange } from "../domain/cell/address";
import type { CellValue, ErrorValue } from "../domain/cell/types";
import type { Formula } from "../domain/cell/formula";
import { EXCEL_MAX_COLS, EXCEL_MAX_ROWS } from "../domain/constants";
import type { XlsxWorkbook } from "../domain/workbook";
import { colIdx, rowIdx } from "../domain/types";
import type { FormulaAstNode } from "./ast";
import { parseFormula } from "./parser";
import type { FormulaEvaluationResult, FormulaScalar } from "./types";
import { isFormulaError } from "./types";
import { formulaFunctionHelpers, getFormulaFunction } from "./functionRegistry";
import { getXlfnFormulaFunction } from "./functions/xlfn/registry";
import { isArrayResult, type EvalResult } from "./functions/helpers";
import { createFormulaError, getErrorCodeFromError } from "./functions/helpers/errors";

type FormulaCellData = {
  readonly value: CellValue;
  readonly formula?: Formula;
};

type SheetMatrix = {
  readonly sheetName: string;
  readonly rows: ReadonlyMap<number, ReadonlyMap<number, FormulaCellData>>;
  readonly maxRow: number;
  readonly maxCol: number;
};

type WorkbookMatrix = {
  readonly sheets: readonly SheetMatrix[];
  readonly sheetIndexByName: ReadonlyMap<string, number>;
};

function toFormulaErrorScalar(value: ErrorValue): FormulaScalar {
  return { type: "error", value };
}

function isFormulaErrorScalar(value: unknown): value is Extract<FormulaScalar, { readonly type: "error" }> {
  return typeof value === "object" && value !== null && "type" in value && (value as { readonly type?: unknown }).type === "error";
}

function cellValueToFormulaScalar(value: CellValue): FormulaScalar {
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
      return toFormulaErrorScalar(value.value);
    case "date":
      return value.value.toISOString();
  }
}

function asPrimitiveOrThrow(value: FormulaScalar): FormulaEvaluationResult {
  if (isFormulaError(value)) {
    throw createFormulaError(value.value);
  }
  return value;
}

function normalizeFormulaText(formula: string): string {
  const trimmed = formula.trim();
  if (trimmed.startsWith("=")) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
}

function buildWorkbookMatrix(workbook: XlsxWorkbook): WorkbookMatrix {
  const sheetIndexByName = new Map<string, number>();
  const sheets = workbook.sheets.map((sheet, idx): SheetMatrix => {
    sheetIndexByName.set(sheet.name.trim().toUpperCase(), idx);

    const dimensionEndRow = sheet.dimension?.end.row as number | undefined;
    const dimensionEndCol = sheet.dimension?.end.col as number | undefined;
    const bounds = {
      maxRow: Math.max(1, dimensionEndRow ?? 1),
      maxCol: Math.max(1, dimensionEndCol ?? 1),
    };

    const rows = new Map<number, Map<number, FormulaCellData>>();
    for (const row of sheet.rows) {
      const rowNumber = row.rowNumber as number;
      bounds.maxRow = Math.max(bounds.maxRow, rowNumber);
      const rowMap = rows.get(rowNumber) ?? new Map<number, FormulaCellData>();
      for (const cell of row.cells) {
        bounds.maxCol = Math.max(bounds.maxCol, cell.address.col as number);
        rowMap.set(cell.address.col as number, { value: cell.value, formula: cell.formula });
      }
      rows.set(rowNumber, rowMap);
    }

    return { sheetName: sheet.name, rows, maxRow: bounds.maxRow, maxCol: bounds.maxCol };
  });

  return { sheets, sheetIndexByName };
}

function resolveSheetIndexByName(matrix: WorkbookMatrix, sheetName: string): number | undefined {
  return matrix.sheetIndexByName.get(sheetName.trim().toUpperCase());
}

function parseSheetQualifiedCellReference(
  reference: string,
  defaultSheetName: string,
): { readonly sheetName: string; readonly address: CellAddress } {
  const parsed = parseRange(reference);
  const isSingleCell =
    parsed.start.col === parsed.end.col &&
    parsed.start.row === parsed.end.row &&
    parsed.start.colAbsolute === parsed.end.colAbsolute &&
    parsed.start.rowAbsolute === parsed.end.rowAbsolute;
  if (!isSingleCell) {
    throw new Error("Expected single cell reference");
  }
  return {
    sheetName: parsed.sheetName ?? defaultSheetName,
    address: parsed.start,
  };
}

type EvalScope = {
  readonly defaultSheetIndex: number;
  readonly defaultSheetName: string;
  readonly resolveSheetIndexByName: (sheetName: string) => number | undefined;
  readonly resolveCell: (sheetIndex: number, address: CellAddress) => FormulaEvaluationResult;
  readonly resolveRange: (sheetIndex: number, range: { readonly start: CellAddress; readonly end: CellAddress; readonly sheetName?: string }) => EvalResult;
  readonly resolveName: (name: string) => EvalResult;
  readonly resolveStructuredTableReference: (
    node: Extract<FormulaAstNode, { readonly type: "StructuredTableReference" }>,
  ) => EvalResult;
  readonly origin: { readonly sheetName: string; readonly address: CellAddress };
  readonly dateSystem: XlsxWorkbook["dateSystem"];
};

function resolveScopeSheetIndex(scope: EvalScope, explicitSheetName: string | undefined): number | undefined {
  if (!explicitSheetName) {
    return scope.defaultSheetIndex;
  }
  return scope.resolveSheetIndexByName(explicitSheetName);
}

function parse3dSheetRange(rawSheetName: string): { readonly start: string; readonly end: string } | null {
  const idx = rawSheetName.indexOf(":");
  if (idx === -1) {
    return null;
  }
  const start = rawSheetName.slice(0, idx).trim();
  const end = rawSheetName.slice(idx + 1).trim();
  if (start.length === 0 || end.length === 0) {
    return null;
  }
  return { start, end };
}

function buildDefinedNameFormulaIndex(definedNames: XlsxWorkbook["definedNames"]): ReadonlyMap<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const def of definedNames ?? []) {
    const nameKey = def.name.trim().toUpperCase();
    const scopeKey = def.localSheetId === undefined ? "*" : String(def.localSheetId);
    const key = `${scopeKey}|${nameKey}`;
    const list = byKey.get(key) ?? [];
    list.push(def.formula);
    byKey.set(key, list);
  }
  return byKey;
}

function buildTablesByName(tables: XlsxWorkbook["tables"]): ReadonlyMap<string, NonNullable<XlsxWorkbook["tables"]>[number]> {
  const map = new Map<string, NonNullable<XlsxWorkbook["tables"]>[number]>();
  for (const table of tables ?? []) {
    map.set(table.name.trim().toUpperCase(), table);
  }
  return map;
}

function resolveTableItemRowRange(params: {
  readonly item: string;
  readonly fullStartRow: number;
  readonly fullEndRow: number;
  readonly headerRowCount: number;
  readonly totalsRowCount: number;
  readonly dataStartRow: number;
  readonly dataEndRow: number;
  readonly originRow?: number;
}): { readonly startRow: number; readonly endRow: number } | null {
  switch (params.item) {
    case "#ALL":
      return { startRow: params.fullStartRow, endRow: params.fullEndRow };
    case "#DATA":
      return { startRow: params.dataStartRow, endRow: params.dataEndRow };
    case "#HEADERS":
      return { startRow: params.fullStartRow, endRow: params.fullStartRow + params.headerRowCount - 1 };
    case "#TOTALS":
      return { startRow: params.fullEndRow - params.totalsRowCount + 1, endRow: params.fullEndRow };
    case "#THIS ROW": {
      const originRow = params.originRow;
      if (!originRow) {
        return null;
      }
      if (originRow < params.dataStartRow || originRow > params.dataEndRow) {
        return null;
      }
      return { startRow: originRow, endRow: originRow };
    }
    default:
      return null;
  }
}

function resolveStructuredTableReferenceRowRange(params: {
  readonly item?: string;
  readonly fullStartRow: number;
  readonly fullEndRow: number;
  readonly headerRowCount: number;
  readonly totalsRowCount: number;
  readonly dataStartRow: number;
  readonly dataEndRow: number;
  readonly originRow: number;
}): { readonly startRow: number; readonly endRow: number } | null {
  if (!params.item) {
    return { startRow: params.dataStartRow, endRow: params.dataEndRow };
  }

  return resolveTableItemRowRange({
    item: params.item,
    fullStartRow: params.fullStartRow,
    fullEndRow: params.fullEndRow,
    headerRowCount: params.headerRowCount,
    totalsRowCount: params.totalsRowCount,
    dataStartRow: params.dataStartRow,
    dataEndRow: params.dataEndRow,
    originRow: params.originRow,
  });
}

function pickFirstInternalDefinedNameFormula(candidates: readonly string[] | undefined): string | undefined {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }
  const internal = candidates.find((value) => value.trim().startsWith("[") === false);
  return internal ?? candidates[0];
}

function tryParseRangeReference(text: string): ReturnType<typeof parseRange> | null {
  try {
    return parseRange(text);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    return null;
  }
}

function compareOrder(left: FormulaEvaluationResult, right: FormulaEvaluationResult): number | undefined {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }
  return undefined;
}

function compareScalars(
  left: FormulaEvaluationResult,
  right: FormulaEvaluationResult,
  op: string,
): boolean {
  if (op === "=") {
    return formulaFunctionHelpers.comparePrimitiveEquality(left, right);
  }
  if (op === "<>") {
    return !formulaFunctionHelpers.comparePrimitiveEquality(left, right);
  }

  if (left === null || right === null) {
    throw createFormulaError("#VALUE!");
  }
  if (typeof left !== typeof right) {
    throw createFormulaError("#VALUE!");
  }
  if (typeof left === "boolean") {
    throw createFormulaError("#VALUE!");
  }

  const cmp = compareOrder(left, right);
  if (cmp === undefined) {
    throw createFormulaError("#VALUE!");
  }

  if (op === ">") {
    return cmp > 0;
  }
  if (op === "<") {
    return cmp < 0;
  }
  if (op === ">=") {
    return cmp >= 0;
  }
  if (op === "<=") {
    return cmp <= 0;
  }
  throw createFormulaError("#NAME?");
}

function coerceNumberForMath(value: EvalResult, description: string): number {
  const scalar = formulaFunctionHelpers.coerceScalar(value, description);
  if (scalar === null || scalar === "") {
    return 0;
  }
  if (typeof scalar === "boolean") {
    return scalar ? 1 : 0;
  }
  if (typeof scalar === "number" && !Number.isNaN(scalar)) {
    return scalar;
  }
  throw createFormulaError("#VALUE!");
}

function applyBinaryNumberOperator(left: number, right: number, operator: string): number {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) {
        throw createFormulaError("#DIV/0!");
      }
      return left / right;
    case "^":
      return left ** right;
    default:
      throw createFormulaError("#NAME?");
  }
}

function normalizeEvalResultToNumberMatrix(result: EvalResult, description: string): number[][] {
  if (!isArrayResult(result)) {
    return [[coerceNumberForMath(result, description)]];
  }
  if (result.length === 0) {
    throw createFormulaError("#VALUE!");
  }

  const hasNested = result.some((value) => isArrayResult(value));
  if (!hasNested) {
    return [
      result.map((value) => {
        return coerceNumberForMath(value, description);
      }),
    ];
  }

  const matrix = result.map((row) => {
    if (!isArrayResult(row)) {
      throw createFormulaError("#VALUE!");
    }
    return row.map((value) => {
      return coerceNumberForMath(value, description);
    });
  });

  const columnCount = matrix[0]?.length ?? 0;
  if (columnCount === 0) {
    throw createFormulaError("#VALUE!");
  }
  if (matrix.some((row) => row.length !== columnCount)) {
    throw createFormulaError("#VALUE!");
  }
  return matrix;
}

function isScalarMatrix(matrix: number[][]): boolean {
  return matrix.length === 1 && (matrix[0]?.length ?? 0) === 1;
}

function evaluateBinaryArithmetic(left: EvalResult, right: EvalResult, operator: string): EvalResult {
  if (!isArrayResult(left) && !isArrayResult(right)) {
    return applyBinaryNumberOperator(coerceNumberForMath(left, `binary ${operator}`), coerceNumberForMath(right, `binary ${operator}`), operator);
  }

  const leftMatrix = normalizeEvalResultToNumberMatrix(left, `binary ${operator} left`);
  const rightMatrix = normalizeEvalResultToNumberMatrix(right, `binary ${operator} right`);

  const leftScalar = isScalarMatrix(leftMatrix);
  const rightScalar = isScalarMatrix(rightMatrix);

  if (leftScalar && rightScalar) {
    return applyBinaryNumberOperator(leftMatrix[0][0], rightMatrix[0][0], operator);
  }

  const leftRows = leftMatrix.length;
  const leftCols = leftMatrix[0]?.length ?? 0;
  const rightRows = rightMatrix.length;
  const rightCols = rightMatrix[0]?.length ?? 0;

  if (!(leftScalar || rightScalar) && (leftRows !== rightRows || leftCols !== rightCols)) {
    throw createFormulaError("#VALUE!");
  }

  const rows = leftScalar ? rightRows : leftRows;
  const cols = leftScalar ? rightCols : leftCols;

  return Array.from({ length: rows }, (_, rowIndex) => {
    return Array.from({ length: cols }, (_, colIndex) => {
      const l = leftScalar ? leftMatrix[0][0] : (leftMatrix[rowIndex]?.[colIndex] ?? 0);
      const r = rightScalar ? rightMatrix[0][0] : (rightMatrix[rowIndex]?.[colIndex] ?? 0);
      return applyBinaryNumberOperator(l, r, operator);
    });
  });
}

function negateEvalResult(value: EvalResult, description: string): EvalResult {
  if (!isArrayResult(value)) {
    return -coerceNumberForMath(value, description);
  }
  const matrix = normalizeEvalResultToNumberMatrix(value, description);
  return matrix.map((row) => row.map((cell) => -cell));
}

function evaluateNode(node: FormulaAstNode, scope: EvalScope): EvalResult {
  switch (node.type) {
    case "Literal": {
      if (isFormulaError(node.value)) {
        throw createFormulaError(node.value.value);
      }
      return node.value;
    }
    case "Name": {
      return scope.resolveName(node.name);
    }
    case "StructuredTableReference": {
      return scope.resolveStructuredTableReference(node);
    }
    case "Reference": {
      const sheetIndex = resolveScopeSheetIndex(scope, node.sheetName);
      if (sheetIndex === undefined) {
        throw createFormulaError("#REF!");
      }
      return scope.resolveCell(sheetIndex, node.reference);
    }
    case "Range": {
      const rangeSheetName = node.range.sheetName;
      const threeD = rangeSheetName ? parse3dSheetRange(rangeSheetName) : null;
      if (!threeD) {
        const sheetIndex = resolveScopeSheetIndex(scope, rangeSheetName);
        if (sheetIndex === undefined) {
          throw createFormulaError("#REF!");
        }
        return scope.resolveRange(sheetIndex, { start: node.range.start, end: node.range.end });
      }

      const startIndex = resolveScopeSheetIndex(scope, threeD.start);
      const endIndex = resolveScopeSheetIndex(scope, threeD.end);
      if (startIndex === undefined || endIndex === undefined) {
        throw createFormulaError("#REF!");
      }
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);
      const perSheet: EvalResult[] = [];
      for (let si = minIndex; si <= maxIndex; si += 1) {
        perSheet.push(scope.resolveRange(si, { start: node.range.start, end: node.range.end }));
      }
      return perSheet;
    }
    case "Array": {
      const rows: FormulaEvaluationResult[][] = [];
      for (const row of node.elements) {
        const values: FormulaEvaluationResult[] = [];
        for (const el of row) {
          values.push(formulaFunctionHelpers.coerceScalar(evaluateNode(el, scope), "array literal"));
        }
        rows.push(values);
      }
      return rows;
    }
    case "Unary": {
      const value = evaluateNode(node.argument, scope);
      const description = `unary ${node.operator}`;
      if (node.operator === "-") {
        return negateEvalResult(value, description);
      }
      return coerceNumberForMath(value, description);
    }
    case "Binary": {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      if (node.operator === "&") {
        const leftScalar = formulaFunctionHelpers.coerceScalar(left, "binary & left");
        const rightScalar = formulaFunctionHelpers.coerceScalar(right, "binary & right");
        return `${formulaFunctionHelpers.valueToText(leftScalar)}${formulaFunctionHelpers.valueToText(rightScalar)}`;
      }
      return evaluateBinaryArithmetic(left, right, node.operator);
    }
    case "Compare": {
      const left = formulaFunctionHelpers.coerceScalar(evaluateNode(node.left, scope), `comparator ${node.operator}`);
      const right = formulaFunctionHelpers.coerceScalar(evaluateNode(node.right, scope), `comparator ${node.operator}`);
      return compareScalars(left, right, node.operator);
    }
    case "Function": {
      const definition = getXlfnFormulaFunction(node.name) ?? getFormulaFunction(node.name);
      if (!definition) {
        throw new Error(`Unknown function "${node.name}"`);
      }

      if (definition.evaluateLazy) {
        return definition.evaluateLazy([...node.args], {
          evaluate: (child) => evaluateNode(child, scope),
          helpers: formulaFunctionHelpers,
          parseReference: (reference) => parseSheetQualifiedCellReference(reference, scope.origin.sheetName),
          origin: scope.origin,
          dateSystem: scope.dateSystem,
        });
      }

      if (!definition.evaluate) {
        throw new Error(`Formula function "${node.name}" must provide an eager evaluator`);
      }

      const args = node.args.map((arg) => evaluateNode(arg, scope));
      return definition.evaluate(args, formulaFunctionHelpers);
    }
  }
}

export type FormulaEvaluator = {
  readonly evaluateCell: (sheetIndex: number, address: CellAddress) => FormulaScalar;
  readonly evaluateFormula: (sheetIndex: number, formula: string) => FormulaScalar;
  readonly evaluateFormulaResult: (sheetIndex: number, origin: CellAddress, formula: string) => EvalResult | FormulaScalar;
};

/**
 * Create a workbook-scoped formula evaluator.
 *
 * The returned evaluator caches parsed ASTs and computed cell results, and detects cycles
 * (returning `#REF!`) to avoid infinite recursion when formulas reference each other.
 *
 * @param workbook - Workbook snapshot to evaluate against
 * @returns Evaluator instance bound to the workbook
 */
export function createFormulaEvaluator(workbook: XlsxWorkbook): FormulaEvaluator {
  const matrix = buildWorkbookMatrix(workbook);
  const astCache = new Map<string, FormulaAstNode | null>();
  const valueCache = new Map<string, FormulaScalar>();
  const inProgress = new Set<string>();
  const nameInProgress = new Set<string>();
  const definedNamesByKey = buildDefinedNameFormulaIndex(workbook.definedNames);
  const tablesByName = buildTablesByName(workbook.tables);

  const normalizeArrayFormulaResultToMatrix = (result: EvalResult, description: string): FormulaEvaluationResult[][] => {
    if (!isArrayResult(result)) {
      return [[formulaFunctionHelpers.coerceScalar(result, description)]];
    }
    if (result.length === 0) {
      return [];
    }

    const hasNested = result.some((value) => isArrayResult(value));
    if (!hasNested) {
      return [
        result.map((value) => {
          return formulaFunctionHelpers.coerceScalar(value, description);
        }),
      ];
    }

    return result.map((row) => {
      if (!isArrayResult(row)) {
        throw new Error(`Expected 2D array for ${description}`);
      }
      return row.map((value) => {
        return formulaFunctionHelpers.coerceScalar(value, description);
      });
    });
  };

  const getOrParseAst = (cacheKey: string, formula: string): FormulaAstNode | null => {
    const cached = astCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    try {
      const parsed = parseFormula(formula);
      astCache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      astCache.set(cacheKey, null);
      return null;
    }
  };

  const evaluateFormulaResultInternal = (
    sheetIndex: number,
    origin: CellAddress,
    formula: string,
  ): EvalResult | FormulaScalar => {
    const normalized = normalizeFormulaText(formula);
    const cacheKey = `${sheetIndex}|${normalized}`;
    const ast = getOrParseAst(cacheKey, normalized);
    if (!ast) {
      return toFormulaErrorScalar("#NAME?");
    }

    const defaultSheetName = matrix.sheets[sheetIndex]?.sheetName;
    if (!defaultSheetName) {
      return toFormulaErrorScalar("#REF!");
    }

    const scope: EvalScope = {
      defaultSheetIndex: sheetIndex,
      defaultSheetName,
      resolveSheetIndexByName: (sheetName) => resolveSheetIndexByName(matrix, sheetName),
      resolveCell: (si, addr) => resolveCellPrimitive(si, addr),
      resolveRange: (si, range) => resolveRangePrimitive(si, range),
      resolveName: (name) => resolveDefinedNameValue(scope, name),
      resolveStructuredTableReference: (node) => resolveStructuredTableReferenceValue(scope, node),
      origin: { sheetName: defaultSheetName, address: origin },
      dateSystem: workbook.dateSystem,
    };

    try {
      return evaluateNode(ast, scope);
    } catch (error) {
      const code = getErrorCodeFromError(error);
      return toFormulaErrorScalar(code);
    }
  };

  const resolveDefinedNameValue = (scope: EvalScope, name: string): EvalResult => {
    const keyName = name.trim().toUpperCase();
    const localKey = `${scope.defaultSheetIndex}|${keyName}`;
    const globalKey = `*|${keyName}`;
    const formula =
      pickFirstInternalDefinedNameFormula(definedNamesByKey.get(localKey)) ??
      pickFirstInternalDefinedNameFormula(definedNamesByKey.get(globalKey));

    if (!formula) {
      throw createFormulaError("#NAME?");
    }

    const progressKey = `${scope.defaultSheetIndex}|${keyName}`;
    if (nameInProgress.has(progressKey)) {
      throw createFormulaError("#REF!");
    }
    nameInProgress.add(progressKey);
    try {
      const normalized = normalizeFormulaText(formula);
      if (normalized.trim().startsWith("[")) {
        throw createFormulaError("#REF!");
      }

      const range = tryParseRangeReference(normalized);
      if (range) {
        return evaluateNode({ type: "Range", range }, scope);
      }

      const evaluated = evaluateFormulaResultInternal(scope.defaultSheetIndex, scope.origin.address, normalized);
      if (isFormulaErrorScalar(evaluated)) {
        throw createFormulaError(evaluated.value);
      }
      return evaluated;
    } finally {
      nameInProgress.delete(progressKey);
    }
  };

  const resolveStructuredTableReferenceValue = (
    scope: EvalScope,
    node: Extract<FormulaAstNode, { readonly type: "StructuredTableReference" }>,
  ): EvalResult => {
    const tableKey = node.tableName.trim().toUpperCase();
    const table = tablesByName.get(tableKey);
    if (!table) {
      throw createFormulaError("#NAME?");
    }

    const headerRowCount = Math.max(0, table.headerRowCount);
    const totalsRowCount = Math.max(0, table.totalsRowCount);
    const fullStartRow = table.ref.start.row as number;
    const fullEndRow = table.ref.end.row as number;
    const dataStartRow = fullStartRow + headerRowCount;
    const dataEndRow = fullEndRow - totalsRowCount;

    const item = node.item?.trim().toUpperCase();
    const startName = node.startColumnName?.trim().toUpperCase();
    const endName = node.endColumnName?.trim().toUpperCase();

    const rowRange = resolveStructuredTableReferenceRowRange({
      item,
      fullStartRow,
      fullEndRow,
      headerRowCount,
      totalsRowCount,
      dataStartRow,
      dataEndRow,
      originRow: scope.origin.address.row as number,
    });

    if (!rowRange || rowRange.endRow < rowRange.startRow) {
      throw createFormulaError("#REF!");
    }

    if (!startName || !endName) {
      const startCol = table.ref.start.col as number;
      const endCol = (table.ref.start.col as number) + Math.max(0, table.columns.length - 1);
      return scope.resolveRange(table.sheetIndex, {
        start: { col: colIdx(startCol), row: rowIdx(rowRange.startRow), colAbsolute: false, rowAbsolute: false },
        end: { col: colIdx(endCol), row: rowIdx(rowRange.endRow), colAbsolute: false, rowAbsolute: false },
      });
    }

    const startIndex = table.columns.findIndex((col) => col.name.trim().toUpperCase() === startName);
    const endIndex = table.columns.findIndex((col) => col.name.trim().toUpperCase() === endName);
    if (startIndex === -1 || endIndex === -1) {
      throw createFormulaError("#REF!");
    }
    const minColIndex = Math.min(startIndex, endIndex);
    const maxColIndex = Math.max(startIndex, endIndex);

    const startCol = (table.ref.start.col as number) + minColIndex;
    const endCol = (table.ref.start.col as number) + maxColIndex;

    return scope.resolveRange(table.sheetIndex, {
      start: { col: colIdx(startCol), row: rowIdx(rowRange.startRow), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdx(endCol), row: rowIdx(rowRange.endRow), colAbsolute: false, rowAbsolute: false },
    });
  };

  const evaluateFormulaInternal = (sheetIndex: number, origin: CellAddress, formula: string): FormulaScalar => {
    const evaluated = evaluateFormulaResultInternal(sheetIndex, origin, formula);
    if (isFormulaErrorScalar(evaluated)) {
      return evaluated;
    }
    try {
      return formulaFunctionHelpers.coerceScalar(evaluated, "formula");
    } catch (error) {
      const code = getErrorCodeFromError(error);
      return toFormulaErrorScalar(code);
    }
  };

  const evaluateArrayFormulaScalar = (sheetIndex: number, address: CellAddress, formula: Formula): FormulaScalar => {
    const ref = formula.ref;
    if (!ref) {
      return evaluateFormulaInternal(sheetIndex, address, formula.expression);
    }

    const rowOffset = (address.row as number) - (ref.start.row as number);
    const colOffset = (address.col as number) - (ref.start.col as number);
    if (rowOffset < 0 || colOffset < 0) {
      return toFormulaErrorScalar("#REF!");
    }

    const maxRowOffset = (ref.end.row as number) - (ref.start.row as number);
    const maxColOffset = (ref.end.col as number) - (ref.start.col as number);
    if (rowOffset > maxRowOffset || colOffset > maxColOffset) {
      return toFormulaErrorScalar("#REF!");
    }

    const evaluated = evaluateFormulaResultInternal(sheetIndex, ref.start, formula.expression);
    if (isFormulaErrorScalar(evaluated)) {
      return evaluated;
    }

    try {
      const matrixResult = normalizeArrayFormulaResultToMatrix(evaluated, `array formula "${formula.expression}"`);
      const row = matrixResult[rowOffset];
      if (!row) {
        return toFormulaErrorScalar("#VALUE!");
      }
      const value = row[colOffset];
      if (value === undefined) {
        return toFormulaErrorScalar("#VALUE!");
      }
      return value ?? null;
    } catch (error) {
      const code = getErrorCodeFromError(error);
      return toFormulaErrorScalar(code);
    }
  };

  const computeCellScalarValue = (
    sheetIndex: number,
    address: CellAddress,
    cellData: FormulaCellData | undefined,
  ): FormulaScalar => {
    if (!cellData) {
      return null;
    }
    if (cellData.formula) {
      if (cellData.formula.type === "array") {
        return evaluateArrayFormulaScalar(sheetIndex, address, cellData.formula);
      }
      return evaluateFormulaInternal(sheetIndex, address, cellData.formula.expression);
    }
    return cellValueToFormulaScalar(cellData.value);
  };

  const resolveCellScalar = (sheetIndex: number, address: CellAddress): FormulaScalar => {
    const key = `${sheetIndex}|${address.col as number}:${address.row as number}`;
    const cached = valueCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    if (inProgress.has(key)) {
      return toFormulaErrorScalar("#REF!");
    }

    inProgress.add(key);

    const sheet = matrix.sheets[sheetIndex];
    const cellData = sheet?.rows.get(address.row as number)?.get(address.col as number);

    const result = computeCellScalarValue(sheetIndex, address, cellData);

    valueCache.set(key, result);
    inProgress.delete(key);
    return result;
  };

  const resolveCellPrimitive = (sheetIndex: number, address: CellAddress): FormulaEvaluationResult => {
    return asPrimitiveOrThrow(resolveCellScalar(sheetIndex, address));
  };

  const resolveRangePrimitive = (
    sheetIndex: number,
    range: { readonly start: CellAddress; readonly end: CellAddress; readonly sheetName?: string },
  ): FormulaEvaluationResult[][] => {
    const minRow = Math.min(range.start.row as number, range.end.row as number);
    const requestedMaxRow = Math.max(range.start.row as number, range.end.row as number);
    const minCol = Math.min(range.start.col as number, range.end.col as number);
    const requestedMaxCol = Math.max(range.start.col as number, range.end.col as number);

    const sheet = matrix.sheets[sheetIndex];
    const sheetMaxRow = sheet?.maxRow ?? EXCEL_MAX_ROWS;
    const sheetMaxCol = sheet?.maxCol ?? EXCEL_MAX_COLS;

    const maxRow = requestedMaxRow === EXCEL_MAX_ROWS ? sheetMaxRow : requestedMaxRow;
    const maxCol = requestedMaxCol === EXCEL_MAX_COLS ? sheetMaxCol : requestedMaxCol;

    const rows: FormulaEvaluationResult[][] = [];
    for (let r = minRow; r <= maxRow; r += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let c = minCol; c <= maxCol; c += 1) {
        rowValues.push(
          resolveCellPrimitive(sheetIndex, { col: colIdx(c), row: rowIdx(r), colAbsolute: false, rowAbsolute: false }),
        );
      }
      rows.push(rowValues);
    }
    return rows;
  };

  return {
    evaluateCell: (sheetIndex, address) => resolveCellScalar(sheetIndex, address),
    evaluateFormula: (sheetIndex, formula) =>
      evaluateFormulaInternal(sheetIndex, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false }, formula),
    evaluateFormulaResult: (sheetIndex, origin, formula) => evaluateFormulaResultInternal(sheetIndex, origin, formula),
  };
}
