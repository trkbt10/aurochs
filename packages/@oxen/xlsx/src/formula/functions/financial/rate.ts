/**
 * @file RATE function implementation (ODF 1.3 §6.12.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { FINANCE_EPSILON, FINANCE_MAX_ITERATIONS } from "../helpers";

const evaluateBalance = (
  rate: number,
  periods: number,
  payment: number,
  pv: number,
  fv: number,
  type: number,
): number => {
  if (rate === 0) {
    return pv + payment * periods + fv;
  }
  const factor = (1 + rate) ** periods;
  return pv * factor + (payment * (1 + rate * type) * (factor - 1)) / rate + fv;
};

export const rateFunction: FormulaFunctionEagerDefinition = {
  name: "RATE",
  category: "financial",
  description: {
    en: "Returns the interest rate per period for an annuity.",
    ja: "年金の各期利率を算出します。",
  },
  examples: ["RATE(60, -188.71, 10000)", "RATE(nper, pmt, pv, fv, type, guess)"],
  samples: [
    {
      input: "RATE(60, PMT(0.05/12, 60, 10000), 10000)",
      output: 0.004166666666666963,
      description: {
        en: "Monthly interest rate for a loan (approximately 5% annual)",
        ja: "ローンの月利（年利約5%）",
      },
    },
    {
      input: "RATE(120, PMT(0.08/12, 120, 50000), 50000)",
      output: 0.006666666666666771,
      description: {
        en: "Monthly rate for 10-year loan",
        ja: "10年ローンの月利",
      },
    },
    {
      input: "RATE(36, PMT(0.06/12, 36, 10000), 10000, 0, 0, 0.01)",
      output: 0.005000000000000832,
      description: {
        en: "Rate with initial guess",
        ja: "初期推定値を指定した利率計算",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 6) {
      throw new Error("RATE expects nper, payment, pv, and optional fv, type, guess");
    }
    const [nperArg, paymentArg, pvArg, fvArg, typeArg, guessArg] = args;
    const periodsRaw = helpers.requireNumber(nperArg, "RATE nper");
    const payment = helpers.requireNumber(paymentArg, "RATE payment");
    const pv = helpers.requireNumber(pvArg, "RATE pv");
    const fv = fvArg ? helpers.requireNumber(fvArg, "RATE fv") : 0;
    const typeNumber = typeArg ? helpers.requireNumber(typeArg, "RATE type") : 0;
    const guess = guessArg ? helpers.requireNumber(guessArg, "RATE guess") : 0.1;

    const periods = helpers.requireInteger(periodsRaw, "RATE nper must be integer");
    const type = helpers.requireInteger(typeNumber, "RATE type must be integer");

    if (periods <= 0) {
      throw new Error("RATE nper must be greater than zero");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("RATE type must be 0 or 1");
    }

    const clampRate = (value: number): number => (value <= -0.9999999999 ? -0.9999999999 : value);
    const rateState = { rate: guess <= -0.999999 ? -0.999999 : guess };
    const delta = 1e-6;

    for (let iteration = 0; iteration < FINANCE_MAX_ITERATIONS; iteration += 1) {
      const value = evaluateBalance(rateState.rate, periods, payment, pv, fv, type);
      if (Math.abs(value) <= FINANCE_EPSILON) {
        return rateState.rate;
      }

      const forward = evaluateBalance(rateState.rate + delta, periods, payment, pv, fv, type);
      const backward = evaluateBalance(rateState.rate - delta, periods, payment, pv, fv, type);
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

    throw new Error("RATE did not converge");
  },
};
