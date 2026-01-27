/**
 * @file OFFSET function implementation (ODF 1.3 §6.14.16).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import type { FormulaAstNode } from "../../ast";
import { colIdx, rowIdx } from "../../../domain/types";
import { resolveReferenceBounds } from "./referenceBounds";
import { isArrayResult, type EvalResult } from "../helpers";

const normalizeMatrix = (value: EvalResult, description: string): FormulaEvaluationResult[][] => {
  if (!isArrayResult(value)) {
    return [[(value ?? null) as FormulaEvaluationResult]];
  }

  if (value.length === 0) {
    throw new Error(`${description} cannot operate on an empty range`);
  }

  const is2d = value.some((row) => isArrayResult(row));
  const rows: FormulaEvaluationResult[][] = [];

  if (!is2d) {
    rows.push(value.map((v) => {
      if (isArrayResult(v)) {
        throw new Error(`${description} does not support nested ranges`);
      }
      return (v ?? null) as FormulaEvaluationResult;
    }));
  } else {
    for (const row of value) {
      if (!isArrayResult(row)) {
        rows.push([(row ?? null) as FormulaEvaluationResult]);
        continue;
      }
      rows.push(
        row.map((v) => {
          if (isArrayResult(v)) {
            throw new Error(`${description} does not support nested ranges`);
          }
          return (v ?? null) as FormulaEvaluationResult;
        }),
      );
    }
  }

  const width = rows[0]?.length ?? 0;
  if (width === 0) {
    throw new Error(`${description} cannot operate on an empty range`);
  }
  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(`${description} requires rectangular ranges`);
    }
  }
  return rows;
};

export const offsetFunction: FormulaFunctionLazyDefinition = {
  name: "OFFSET",
  category: "lookup",
  description: {
    en: "Returns a range displaced from a starting reference by row and column offsets.",
    ja: "基準セルから行と列のオフセットでずらした範囲を返します。",
  },
  examples: ["OFFSET(A1, 1, 2, 2, 1)", "OFFSET(Table1, 0, 1)"],
  samples: [
    {
      input: "OFFSET({{10, 20, 30}; {40, 50, 60}}, 0, 1)",
      output: [[20, 30], [50, 60]],
      description: {
        en: "Offset by 1 column, same size",
        ja: "1列オフセット、同じサイズ",
      },
    },
    {
      input: "OFFSET({{10, 20}; {30, 40}; {50, 60}}, 1, 0, 2, 2)",
      output: [[30, 40], [50, 60]],
      description: {
        en: "Offset by 1 row, specify 2x2 size",
        ja: "1行オフセット、2x2サイズを指定",
      },
    },
    {
      input: "OFFSET({{1, 2, 3}; {4, 5, 6}}, 0, 1, 1, 2)",
      output: [[2, 3]],
      description: {
        en: "Offset to get subset of array",
        ja: "配列の部分集合を取得するオフセット",
      },
    },
  ],
  evaluateLazy: (args, context) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("OFFSET expects between three and five arguments");
    }

    const [referenceNode, rowsNode, columnsNode, heightNode, widthNode] = args;

    const rowOffsetValue = context.helpers.requireNumber(context.evaluate(rowsNode), "OFFSET rows");
    const columnOffsetValue = context.helpers.requireNumber(context.evaluate(columnsNode), "OFFSET columns");

    const rowOffset = context.helpers.requireInteger(rowOffsetValue, "OFFSET rows must be an integer");
    const columnOffset = context.helpers.requireInteger(columnOffsetValue, "OFFSET columns must be an integer");

    const resolveOptionalNumber = (node: FormulaAstNode | undefined, fallback: number, label: string): number => {
      if (!node) {
        return fallback;
      }
      return context.helpers.requireNumber(context.evaluate(node), label);
    };

    if (referenceNode.type !== "Reference" && referenceNode.type !== "Range") {
      const base = normalizeMatrix(context.evaluate(referenceNode), "OFFSET");
      const baseHeight = base.length;
      const baseWidth = base[0]?.length ?? 0;

      const heightValue = resolveOptionalNumber(heightNode, baseHeight, "OFFSET height");
      const widthValue = resolveOptionalNumber(widthNode, baseWidth, "OFFSET width");

      const height = context.helpers.requireInteger(heightValue, "OFFSET height must be an integer");
      const width = context.helpers.requireInteger(widthValue, "OFFSET width must be an integer");
      if (height <= 0 || width <= 0) {
        throw new Error("OFFSET height and width must be greater than zero");
      }

      const startRow = rowOffset;
      const startColumn = columnOffset;
      if (startRow < 0 || startColumn < 0) {
        throw new Error("OFFSET cannot reference cells with negative coordinates");
      }

      const result: FormulaEvaluationResult[][] = [];
      for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
        const sourceRow = base[startRow + rowIndex];
        if (!sourceRow) {
          throw new Error("OFFSET result is out of bounds");
        }
        const rowValues: FormulaEvaluationResult[] = [];
        for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
          const v = sourceRow[startColumn + columnIndex];
          if (v === undefined) {
            throw new Error("OFFSET result is out of bounds");
          }
          rowValues.push(v);
        }
        result.push(rowValues);
      }
      return result;
    }

    const bounds = resolveReferenceBounds(referenceNode, "OFFSET");
    const sheetName = bounds.sheetName ?? context.origin.sheetName;

    const heightValue = resolveOptionalNumber(heightNode, bounds.height, "OFFSET height");
    const widthValue = resolveOptionalNumber(widthNode, bounds.width, "OFFSET width");

    const height = context.helpers.requireInteger(heightValue, "OFFSET height must be an integer");
    const width = context.helpers.requireInteger(widthValue, "OFFSET width must be an integer");

    if (height <= 0 || width <= 0) {
      throw new Error("OFFSET height and width must be greater than zero");
    }

    const startRow = bounds.topRow + rowOffset;
    const startColumn = bounds.leftColumn + columnOffset;

    if (startRow < 1 || startColumn < 1) {
      throw new Error("OFFSET cannot reference cells with non-positive coordinates");
    }

    const result: FormulaEvaluationResult[][] = [];

    for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
        const reference: FormulaAstNode = {
          type: "Reference",
          reference: {
            col: colIdx(startColumn + columnIndex),
            row: rowIdx(startRow + rowIndex),
            colAbsolute: false,
            rowAbsolute: false,
          },
          sheetName,
        };
        const cellValue = context.helpers.coerceScalar(context.evaluate(reference), "OFFSET result");
        rowValues.push(cellValue);
      }
      result.push(rowValues);
    }

    return result;
  },
};

// NOTE: Constructs reference nodes manually to reuse the engine's evaluation flow for each cell.
