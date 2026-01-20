/**
 * @file INDEX function implementation (ODF 1.3 §6.14.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { toLookupTable, readTableCell } from "./table";
import { isArrayResult } from "../helpers";

export const indexFunction: FormulaFunctionEagerDefinition = {
  name: "INDEX",
  description: {
    en: "Returns the value at a given row and column position within a range or array.",
    ja: "範囲または配列内の指定した行列位置の値を返します。",
  },
  examples: ["INDEX(A1:C3, 2, 3)", "INDEX(Table1, 1, 2)"],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("INDEX expects two or three arguments");
    }

    const source = args[0];

    if (!isArrayResult(source)) {
      const rowIndex = helpers.requireNumber(args[1], "INDEX row index");
      if (rowIndex !== 1) {
        throw new Error("INDEX row index must be 1 when referencing a scalar value");
      }
      if (args.length === 3) {
        const columnIndex = helpers.requireNumber(args[2], "INDEX column index");
        if (columnIndex !== 1) {
          throw new Error("INDEX column index must be 1 when referencing a scalar value");
        }
      }
      return helpers.coerceScalar(source, "INDEX value");
    }

    const table = toLookupTable(source, "INDEX");
    const rowIndexRaw = helpers.requireNumber(args[1], "INDEX row index");
    if (!Number.isInteger(rowIndexRaw)) {
      throw new Error("INDEX row index must be an integer");
    }
    const rowIndex = rowIndexRaw;
    if (rowIndex < 1 || rowIndex > table.length) {
      throw new Error("INDEX row index is out of bounds");
    }

    const columnIndexRaw = args.length === 3 ? helpers.requireNumber(args[2], "INDEX column index") : 1;
    if (!Number.isInteger(columnIndexRaw)) {
      throw new Error("INDEX column index must be an integer");
    }
    const columnIndex = columnIndexRaw;
    if (columnIndex < 1 || columnIndex > table[0].length) {
      throw new Error("INDEX column index is out of bounds");
    }

    return readTableCell(table, rowIndex - 1, columnIndex - 1, "INDEX");
  },
};

// NOTE: Shares lookup table normalization with VLOOKUP via src/modules/formula/functions/lookup/table.ts.
