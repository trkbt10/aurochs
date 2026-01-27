/**
 * @file SWITCH function implementation (ODF 1.3 §6.11.7).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const switchFunction: FormulaFunctionLazyDefinition = {
  name: "SWITCH",
  category: "logical",
  description: {
    en: "Matches an expression against value/result pairs and returns the first match or default.",
    ja: "式を値と結果のペアと比較し、最初に一致した結果または既定値を返します。",
  },
  examples: ['SWITCH(A1, 1, "One", 2, "Two", "Other")'],
  samples: [
    {
      input: 'SWITCH(2, 1, "One", 2, "Two", 3, "Three")',
      output: "Two",
      description: {
        en: "Match value and return result",
        ja: "値が一致して結果を返す",
      },
    },
    {
      input: 'SWITCH(5, 1, "One", 2, "Two", "Default")',
      output: "Default",
      description: {
        en: "No match, return default",
        ja: "一致なし、デフォルトを返す",
      },
    },
  ],
  evaluateLazy: (argNodes, context) => {
    if (argNodes.length < 3) {
      throw new Error("SWITCH expects at least three arguments");
    }

    const expressionResult = context.evaluate(argNodes[0]);
    const expressionValue = context.helpers.coerceScalar(expressionResult, "SWITCH expression");

    const remainingCount = argNodes.length - 1;
    const hasTrailing = remainingCount % 2 === 1;
    const pairCount = Math.floor(remainingCount / 2);
    if (pairCount === 0) {
      throw new Error("SWITCH requires at least one value/result pair");
    }

    if (hasTrailing && pairCount < 2) {
      throw new Error("SWITCH requires at least one value/result pair");
    }

    const includeDefault = hasTrailing && pairCount >= 2;

    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const valueNode = argNodes[1 + pairIndex * 2];
      const resultNode = argNodes[1 + pairIndex * 2 + 1];
      const caseResult = context.evaluate(valueNode);
      const caseValue = context.helpers.coerceScalar(caseResult, `SWITCH value ${pairIndex + 1}`);
      if (context.helpers.comparePrimitiveEquality(expressionValue, caseValue)) {
        return context.evaluate(resultNode);
      }
    }

    if (includeDefault) {
      const defaultNode = argNodes[argNodes.length - 1];
      return context.evaluate(defaultNode);
    }

    throw new Error("SWITCH could not find a matching case");
  },
};

// NOTE: Referenced src/modules/formula/functions/lookup/vlookup.ts to reuse equality semantics.
