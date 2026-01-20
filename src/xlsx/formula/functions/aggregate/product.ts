/**
 * @file PRODUCT function implementation (ODF 1.3 §6.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const productFunction: FormulaFunctionEagerDefinition = {
  name: "PRODUCT",
  category: "aggregate",
  description: {
    en: "Multiplies numeric arguments while skipping empty cells and null values.",
    ja: "空のセルとnullを無視して数値引数を掛け合わせます。",
  },
  examples: ["PRODUCT(2, 3, 4)", "PRODUCT(A1:A3)"],
  samples: [
    {
      input: "PRODUCT(2, 3, 4)",
      output: 24,
      description: {
        en: "Product of three numbers",
        ja: "3つの数値の積",
      },
    },
    {
      input: "PRODUCT(5, 10)",
      output: 50,
      description: {
        en: "Product of two numbers",
        ja: "2つの数値の積",
      },
    },
    {
      input: "PRODUCT(-2, 3, -1)",
      output: 6,
      description: {
        en: "Product with negative numbers",
        ja: "負の数を含む積",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = helpers.flattenArguments(args);
    return values.reduce<number>((product, value) => {
      if (value === null) {
        return product;
      }
      if (typeof value !== "number") {
        throw new Error("PRODUCT expects numeric arguments");
      }
      return product * value;
    }, 1);
  },
};
