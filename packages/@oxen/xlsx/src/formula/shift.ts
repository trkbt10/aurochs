/**
 * @file Formula reference shifting
 *
 * Shifts relative cell/range references inside a formula string by (deltaCols, deltaRows),
 * preserving absolute ($) references and returning `#REF!` when a shifted reference overflows
 * the Excel sheet bounds.
 */

import type { CellAddress, CellRange } from "../domain/cell/address";
import { EXCEL_MAX_COLS, EXCEL_MAX_ROWS } from "../domain/constants";
import { colIdx, rowIdx } from "../domain/types";
import type { FormulaAstNode } from "./ast";
import { formatFormula } from "./format";
import { parseFormula } from "./parser";
import type { FormulaError } from "./types";

const REF_ERROR: FormulaError = { type: "error", value: "#REF!" };

function shiftAddress(address: CellAddress, deltaCols: number, deltaRows: number): CellAddress | undefined {
  const col = address.col as number;
  const row = address.row as number;
  const nextCol = address.colAbsolute ? col : col + deltaCols;
  const nextRow = address.rowAbsolute ? row : row + deltaRows;

  if (nextCol < 1 || nextCol > EXCEL_MAX_COLS) {
    return undefined;
  }
  if (nextRow < 1 || nextRow > EXCEL_MAX_ROWS) {
    return undefined;
  }

  return {
    col: colIdx(nextCol),
    row: rowIdx(nextRow),
    colAbsolute: address.colAbsolute,
    rowAbsolute: address.rowAbsolute,
  };
}

function shiftRange(range: CellRange, deltaCols: number, deltaRows: number): CellRange | undefined {
  const start = shiftAddress(range.start, deltaCols, deltaRows);
  const end = shiftAddress(range.end, deltaCols, deltaRows);
  if (!start || !end) {
    return undefined;
  }
  return {
    start,
    end,
    ...(range.sheetName ? { sheetName: range.sheetName } : {}),
  };
}

function shiftAst(node: FormulaAstNode, deltaCols: number, deltaRows: number): FormulaAstNode {
  switch (node.type) {
    case "Literal":
      return node;
    case "Reference": {
      const shifted = shiftAddress(node.reference, deltaCols, deltaRows);
      if (!shifted) {
        return { type: "Literal", value: REF_ERROR };
      }
      return {
        type: "Reference",
        reference: shifted,
        ...(node.sheetName ? { sheetName: node.sheetName } : {}),
      };
    }
    case "Range": {
      const shifted = shiftRange(node.range, deltaCols, deltaRows);
      if (!shifted) {
        return { type: "Literal", value: REF_ERROR };
      }
      return { type: "Range", range: shifted };
    }
    case "Name":
      return node;
    case "StructuredTableReference":
      return node;
    case "Unary":
      return { type: "Unary", operator: node.operator, argument: shiftAst(node.argument, deltaCols, deltaRows) };
    case "Binary":
      return {
        type: "Binary",
        operator: node.operator,
        left: shiftAst(node.left, deltaCols, deltaRows),
        right: shiftAst(node.right, deltaCols, deltaRows),
      };
    case "Compare":
      return {
        type: "Compare",
        operator: node.operator,
        left: shiftAst(node.left, deltaCols, deltaRows),
        right: shiftAst(node.right, deltaCols, deltaRows),
      };
    case "Function":
      return { type: "Function", name: node.name, args: node.args.map((arg) => shiftAst(arg, deltaCols, deltaRows)) };
    case "Array":
      return { type: "Array", elements: node.elements.map((row) => row.map((el) => shiftAst(el, deltaCols, deltaRows))) };
  }
}

function tryParseFormulaAst(formula: string): FormulaAstNode | undefined {
  try {
    return parseFormula(formula);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    return undefined;
  }
}

/**
 * Shift relative references inside a formula string by the given deltas.
 *
 * On parse failure, this returns the original formula unchanged.
 */
export function shiftFormulaReferences(formula: string, deltaCols: number, deltaRows: number): string {
  if (deltaCols === 0 && deltaRows === 0) {
    return formula;
  }

  const parsed = tryParseFormulaAst(formula);
  if (!parsed) {
    return formula;
  }

  const shifted = shiftAst(parsed, deltaCols, deltaRows);
  return formatFormula(shifted);
}
