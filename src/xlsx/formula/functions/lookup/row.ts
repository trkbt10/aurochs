/**
 * @file ROW function implementation (Excel compatibility).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";
import { resolveReferenceBounds } from "./referenceBounds";

export const rowFunction: FormulaFunctionLazyDefinition = {
  name: "ROW",
  category: "lookup",
  description: {
    en: "Returns the row number of a reference, or the current row when omitted.",
    ja: "参照の行番号、または引数省略時は現在の行番号を返します。",
  },
  examples: ["ROW()", "ROW(A1)", "ROW(B3:C4)"],
  samples: [
    {
      input: "ROW()",
      output: 1,
      description: {
        en: "Returns the row of the formula cell (in this evaluator, origin row=1 for samples)",
        ja: "式セルの行番号を返します（samples では origin が 1 行目）",
      },
    },
    {
      input: "ROW(A10)",
      output: 10,
      description: {
        en: "Returns the referenced row number",
        ja: "参照先の行番号を返します",
      },
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length === 0) {
      return context.origin.address.row as number;
    }
    if (nodes.length !== 1) {
      throw new Error("ROW expects zero or one argument");
    }
    const bounds = resolveReferenceBounds(nodes[0], "ROW");
    return bounds.topRow;
  },
};

