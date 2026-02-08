/**
 * @file Utilities for deriving reference bounds from AST nodes.
 */

import type { FormulaAstNode } from "../../ast";

export type ReferenceBounds = {
  sheetName?: string;
  topRow: number;
  leftColumn: number;
  height: number;
  width: number;
};

export const resolveReferenceBounds = (node: FormulaAstNode, description: string): ReferenceBounds => {
  if (node.type === "Reference") {
    return {
      sheetName: node.sheetName,
      topRow: node.reference.row as number,
      leftColumn: node.reference.col as number,
      height: 1,
      width: 1,
    };
  }

  if (node.type === "Range") {
    const range = node.range;
    const minRow = Math.min(range.start.row as number, range.end.row as number);
    const maxRow = Math.max(range.start.row as number, range.end.row as number);
    const minColumn = Math.min(range.start.col as number, range.end.col as number);
    const maxColumn = Math.max(range.start.col as number, range.end.col as number);
    return {
      sheetName: range.sheetName,
      topRow: minRow,
      leftColumn: minColumn,
      height: maxRow - minRow + 1,
      width: maxColumn - minColumn + 1,
    };
  }

  throw new Error(`${description} requires a cell reference or range as the first argument`);
};

// NOTE: Consumed by OFFSET for coordinate calculations.
