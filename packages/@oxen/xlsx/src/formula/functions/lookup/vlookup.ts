/**
 * @file VLOOKUP function implementation (ODF 1.3 §6.14.14).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { toLookupTable, readTableCell } from "./table";

export const vlookupFunction: FormulaFunctionEagerDefinition = {
  name: "VLOOKUP",
  category: "lookup",
  description: {
    en: "Searches the first column of a table for a value and returns data from another column.",
    ja: "表の最初の列で値を検索し、別の列のデータを返します。",
  },
  examples: ["VLOOKUP(A2, Table1, 3, FALSE)", "VLOOKUP(5, A1:B10, 2)"],
  samples: [
    {
      input: "VLOOKUP(2, {{1, \"A\"}; {2, \"B\"}; {3, \"C\"}}, 2, FALSE)",
      output: "B",
      description: {
        en: "Exact match lookup in a 3x2 table",
        ja: "3x2テーブルでの完全一致検索",
      },
    },
    {
      input: "VLOOKUP(2.5, {{1, 10}; {2, 20}; {3, 30}}, 2, TRUE)",
      output: 20,
      description: {
        en: "Approximate match returns largest value less than or equal to lookup",
        ja: "近似一致は検索値以下の最大値を返す",
      },
    },
    {
      input: "VLOOKUP(\"Cat\", {{\"Apple\", 5}; {\"Cat\", 10}; {\"Dog\", 15}}, 2, FALSE)",
      output: 10,
      description: {
        en: "Text lookup with exact match",
        ja: "テキスト検索での完全一致",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 4) {
      throw new Error("VLOOKUP expects three or four arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "VLOOKUP lookup value");
    const table = toLookupTable(args[1], "VLOOKUP");

    const columnIndexRaw = helpers.requireNumber(args[2], "VLOOKUP column index");
    if (!Number.isInteger(columnIndexRaw)) {
      throw new Error("VLOOKUP column index must be an integer");
    }
    const columnIndex = columnIndexRaw;
    if (columnIndex < 1) {
      throw new Error("VLOOKUP column index must be greater than or equal to 1");
    }

    const resolveApproximateMatch = (): boolean => {
      if (args.length !== 4) {
        return true;
      }
      return helpers.coerceLogical(args[3], "VLOOKUP range lookup");
    };
    const approximateMatch = resolveApproximateMatch();

    if (!approximateMatch) {
      const matchIndex = table.findIndex((_, rowIndex) => {
        const firstColumn = readTableCell(table, rowIndex, 0, "VLOOKUP");
        return helpers.comparePrimitiveEquality(firstColumn, lookupValue);
      });
      if (matchIndex === -1) {
        throw new Error("VLOOKUP could not find an exact match");
      }
      return readTableCell(table, matchIndex, columnIndex - 1, "VLOOKUP");
    }

    if (typeof lookupValue !== "number") {
      throw new Error("VLOOKUP approximate match requires numeric lookup value");
    }

    const state = { candidateIndex: null as number | null };
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const firstColumn = readTableCell(table, rowIndex, 0, "VLOOKUP");
      if (typeof firstColumn !== "number") {
        throw new Error("VLOOKUP approximate match requires numeric table rows");
      }
      if (firstColumn > lookupValue) {
        break;
      }
      state.candidateIndex = rowIndex;
    }

    if (state.candidateIndex === null) {
      throw new Error("VLOOKUP could not find an approximate match");
    }

    return readTableCell(table, state.candidateIndex, columnIndex - 1, "VLOOKUP");
  },
};

// NOTE: Relies on shared lookup table utilities in src/modules/formula/functions/lookup/table.ts.
