/**
 * @file MATCH function implementation (ODF 1.3 §6.14.15).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";

const ensureVector = (values: FormulaEvaluationResult[], description: string): FormulaEvaluationResult[] => {
  if (values.length === 0) {
    throw new Error(`${description} vector cannot be empty`);
  }
  return values;
};

export const matchFunction: FormulaFunctionEagerDefinition = {
  name: "MATCH",
  category: "lookup",
  description: {
    en: "Returns the position of a lookup value within a vector, supporting exact or approximate matches.",
    ja: "検索値がベクター内のどこに位置するかを、完全一致または近似一致で返します。",
  },
  examples: ['MATCH("Key", A1:A10, 0)', "MATCH(5, A1:A10, 1)"],
  samples: [
    {
      input: "MATCH(\"B\", {\"A\", \"B\", \"C\"}, 0)",
      output: 2,
      description: {
        en: "Exact match returns position (1-based index)",
        ja: "完全一致は位置を返す（1始まりのインデックス）",
      },
    },
    {
      input: "MATCH(25, {10, 20, 30, 40}, 1)",
      output: 2,
      description: {
        en: "Match type 1 finds largest value less than or equal to lookup",
        ja: "マッチタイプ1は検索値以下の最大値を見つける",
      },
    },
    {
      input: "MATCH(25, {40, 30, 20, 10}, -1)",
      output: 3,
      description: {
        en: "Match type -1 finds smallest value greater than or equal to lookup",
        ja: "マッチタイプ-1は検索値以上の最小値を見つける",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2 && args.length !== 3) {
      throw new Error("MATCH expects two or three arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "MATCH lookup value");
    const lookupVector = ensureVector(
      helpers.flattenResult(args[1]).map((value) => (value ?? null) as FormulaEvaluationResult),
      "MATCH lookup",
    );

    const matchType = args.length === 3 ? helpers.requireNumber(args[2], "MATCH match type") : 1;
    if (!Number.isFinite(matchType)) {
      throw new Error("MATCH match type must be finite");
    }

    if (matchType === 0) {
      const index = lookupVector.findIndex((candidate) => helpers.comparePrimitiveEquality(candidate, lookupValue));
      if (index === -1) {
        throw new Error("MATCH could not find an exact match");
      }
      return index + 1;
    }

    if (typeof lookupValue !== "number") {
      throw new Error("MATCH approximate match requires numeric lookup value");
    }

    if (matchType === 1) {
      const state = { candidateIndex: null as number | null };
      for (let index = 0; index < lookupVector.length; index += 1) {
        const candidate = lookupVector[index];
        if (typeof candidate !== "number") {
          throw new Error("MATCH with match type 1 requires numeric lookup vector");
        }
        if (candidate > lookupValue) {
          break;
        }
        state.candidateIndex = index;
      }
      if (state.candidateIndex === null) {
        throw new Error("MATCH could not find an approximate match for match type 1");
      }
      return state.candidateIndex + 1;
    }

    if (matchType === -1) {
      const state = { candidateIndex: null as number | null };
      for (let index = 0; index < lookupVector.length; index += 1) {
        const candidate = lookupVector[index];
        if (typeof candidate !== "number") {
          throw new Error("MATCH with match type -1 requires numeric lookup vector");
        }
        if (candidate >= lookupValue) {
          state.candidateIndex = index;
        }
      }
      if (state.candidateIndex === null) {
        throw new Error("MATCH could not find an approximate match for match type -1");
      }
      return state.candidateIndex + 1;
    }

    throw new Error("MATCH match type must be -1, 0, or 1");
  },
};

// NOTE: Approximate matching behaviors mirror VLOOKUP implementation patterns.
