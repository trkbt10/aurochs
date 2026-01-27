/**
 * @file IF function implementation (ODF 1.3 §6.11.5).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const ifFunction: FormulaFunctionLazyDefinition = {
  name: "IF",
  category: "logical",
  description: {
    en: "Evaluates a condition and returns one value if TRUE, another if FALSE.",
    ja: "条件を評価してTRUEなら1つの値、FALSEなら別の値を返します。",
  },
  examples: ['IF(A1>0, "Positive", "Negative")', "IF(ISBLANK(A1), 0, A1)"],
  samples: [
    {
      input: 'IF(10 > 5, "Yes", "No")',
      output: "Yes",
      description: {
        en: "Condition is TRUE, return first value",
        ja: "条件がTRUEなので最初の値を返す",
      },
    },
    {
      input: 'IF(3 > 5, "Yes", "No")',
      output: "No",
      description: {
        en: "Condition is FALSE, return second value",
        ja: "条件がFALSEなので2番目の値を返す",
      },
    },
    {
      input: "IF(TRUE, 100, 200)",
      output: 100,
      description: {
        en: "Return value for TRUE condition",
        ja: "TRUE条件の値を返す",
      },
    },
  ],
  evaluateLazy: (argNodes, context) => {
    if (argNodes.length < 2 || argNodes.length > 3) {
      throw new Error("IF expects two or three arguments");
    }

    const conditionResult = context.evaluate(argNodes[0]);
    const condition = context.helpers.requireBoolean(conditionResult, "IF condition");
    if (condition) {
      return context.evaluate(argNodes[1]);
    }
    if (argNodes.length === 3) {
      return context.evaluate(argNodes[2]);
    }
    return null;
  },
};

// NOTE: Reviewed src/modules/formula/engine.ts to align lazy evaluation with existing execution flow.
