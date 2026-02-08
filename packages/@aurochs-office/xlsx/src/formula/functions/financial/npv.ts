/**
 * @file NPV function implementation (ODF 1.3 §6.12.7).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const npvFunction: FormulaFunctionEagerDefinition = {
  name: "NPV",
  category: "financial",
  description: {
    en: "Returns the net present value of cash flows given a discount rate.",
    ja: "指定した割引率でキャッシュフローの正味現在価値を計算します。",
  },
  examples: ["NPV(0.1, -10000, 3000, 4200, 6800)", "NPV(rate, values)"],
  samples: [
    {
      input: "NPV(0.1, 3000, 4200, 6800)",
      output: 11307.29,
      description: {
        en: "NPV of three positive cash flows at 10% discount rate",
        ja: "割引率10%での3つの正のキャッシュフローのNPV",
      },
    },
    {
      input: "NPV(0.08, -10000, 3000, 4000, 5000)",
      output: 163.24,
      description: {
        en: "NPV including initial investment",
        ja: "初期投資を含むNPV",
      },
    },
    {
      input: "NPV(0.15, 1000, 2000, 3000, 4000)",
      output: 6641.41,
      description: {
        en: "NPV at higher discount rate",
        ja: "高い割引率でのNPV",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 2) {
      throw new Error("NPV expects at least a rate and one cash flow");
    }
    const [rateArg, ...cashflowArgs] = args;
    const rate = helpers.requireNumber(rateArg, "NPV rate");
    const flattened = cashflowArgs.flatMap((arg, index) => {
      return helpers.flattenResult(arg).map((value) => {
        if (typeof value !== "number") {
          throw new Error(`NPV cash flow ${index + 1} must be numeric`);
        }
        return value;
      });
    });
    if (flattened.length === 0) {
      throw new Error("NPV requires at least one numeric cash flow");
    }
    // NOTE: ODF 1.3 §6.12.7 discounts each cash flow from period 1 onwards; cash flows at period 0 must be added separately when needed.
    return helpers.computeNPV(rate, flattened);
  },
};
