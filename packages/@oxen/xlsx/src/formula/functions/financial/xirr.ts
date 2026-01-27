/**
 * @file XIRR function implementation (ODF 1.3 §6.12.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { FINANCE_EPSILON, FINANCE_MAX_ITERATIONS } from "../helpers";
import { coerceDateSerial } from "../datetime/coerceDateSerial";
import { serialToDate } from "../datetime/serialDate";

const hasOpposingSigns = (values: number[]): boolean => {
  const state = { hasPositive: false, hasNegative: false };
  for (const value of values) {
    if (value > 0) {
      state.hasPositive = true;
    } else if (value < 0) {
      state.hasNegative = true;
    }
    if (state.hasPositive && state.hasNegative) {
      return true;
    }
  }
  return false;
};

export const xirrFunction: FormulaFunctionEagerDefinition = {
  name: "XIRR",
  category: "financial",
  description: {
    en: "Returns the internal rate of return for irregular cash flows.",
    ja: "不規則なキャッシュフロー列の内部収益率を計算します。",
  },
  examples: ["XIRR(values, dates)", "XIRR(values, dates, guess)"],
  samples: [
    {
      input:
        "XIRR({-10000, 2750, 4250, 3250, 2750}, {\"2008-01-01\", \"2008-03-01\", \"2008-10-30\", \"2009-02-15\", \"2009-04-01\"})",
      output: 0.3733625335188315,
      description: {
        en: "IRR for irregular cash flow dates",
        ja: "不規則な日付のキャッシュフローのIRR",
      },
    },
    {
      input: "XIRR({-1000, 500, 600}, {45000, 45100, 45200}, 0.1)",
      output: 0.2538601048765094,
      description: {
        en: "IRR with initial guess",
        ja: "初期推定値を指定したIRR",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("XIRR expects values, dates, and optional guess");
    }
    const [valuesArg, datesArg, guessArg] = args;
    const values = helpers.flattenResult(valuesArg).map((value, index) => {
      if (typeof value !== "number") {
        throw new Error(`XIRR cash flow ${index + 1} must be numeric`);
      }
      return value;
    });
    if (values.length < 2) {
      throw new Error("XIRR requires at least two cash flows");
    }
    if (!hasOpposingSigns(values)) {
      throw new Error("XIRR requires cash flows with opposing signs");
    }

    const dateSerials = helpers.flattenResult(datesArg).map((value, index) => {
      return coerceDateSerial(value, helpers, `XIRR date ${index + 1}`);
    });
    if (dateSerials.length !== values.length) {
      throw new Error("XIRR values and dates must have the same length");
    }

    const baseDate = serialToDate(dateSerials[0]);
    const baseMs = baseDate.getTime();
    const dayDifferences = dateSerials.map((serial) => {
      return (serialToDate(serial).getTime() - baseMs) / 86_400_000;
    });

    const guess = guessArg ? helpers.requireNumber(guessArg, "XIRR guess") : 0.1;
    const clampRate = (value: number): number => (value <= -0.9999999999 ? -0.9999999999 : value);
    const rateState = { rate: guess <= -0.999999 ? -0.999999 : guess };
    const delta = 1e-6;

    for (let iteration = 0; iteration < FINANCE_MAX_ITERATIONS; iteration += 1) {
      const value = helpers.computeXNPV(rateState.rate, values, dayDifferences);
      if (Math.abs(value) <= FINANCE_EPSILON) {
        return rateState.rate;
      }

      const forward = helpers.computeXNPV(rateState.rate + delta, values, dayDifferences);
      const backward = helpers.computeXNPV(rateState.rate - delta, values, dayDifferences);
      const derivative = (forward - backward) / (2 * delta);

      if (!Number.isFinite(derivative) || Math.abs(derivative) <= FINANCE_EPSILON) {
        break;
      }

      const nextRate = clampRate(rateState.rate - value / derivative);
      if (Math.abs(nextRate - rateState.rate) <= FINANCE_EPSILON) {
        return nextRate;
      }
      rateState.rate = nextRate;
    }

    throw new Error("XIRR did not converge");
  },
};
