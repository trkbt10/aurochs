/**
 * @file PPMT function implementation (ODF 1.3 §6.12.5).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaFunctionHelpers } from "../helpers/types";

function calculateInterest({
  helpers,
  rate,
  periods,
  payment,
  pv,
  fv,
  type,
  period,
}: {
  helpers: FormulaFunctionHelpers;
  rate: number;
  periods: number;
  payment: number;
  pv: number;
  fv: number;
  type: number;
  period: number;
}): number {
  if (rate === 0) {
    return 0;
  }
  return helpers.calculateInterestPayment({
    rate,
    periods,
    payment,
    presentValue: pv,
    futureValue: fv,
    type,
    targetPeriod: period,
  });
}

export const ppmtFunction: FormulaFunctionEagerDefinition = {
  name: "PPMT",
  category: "financial",
  description: {
    en: "Returns the principal component of a payment for a given period.",
    ja: "指定期に支払う元本部分を返します。",
  },
  examples: ["PPMT(0.05/12, 1, 60, 10000)", "PPMT(rate, per, nper, pv, fv, type)"],
  samples: [
    {
      input: "PPMT(0.05/12, 1, 60, 10000)",
      output: -147.0456697734421,
      description: {
        en: "Principal portion of first payment on $10,000 loan",
        ja: "10,000ドルのローンの初回支払いの元本部分",
      },
    },
    {
      input: "PPMT(0.08/12, 12, 120, 50000)",
      output: -294.0285979892048,
      description: {
        en: "Principal portion of 12th payment",
        ja: "12回目の支払いの元本部分",
      },
    },
    {
      input: "PPMT(0.06/12, 36, 36, 20000)",
      output: -605.4116905782319,
      description: {
        en: "Principal portion of final payment",
        ja: "最終支払いの元本部分",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 4 || args.length > 6) {
      throw new Error("PPMT expects rate, period, nper, pv, and optional fv and type");
    }
    const [rateArg, periodArg, nperArg, pvArg, fvArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "PPMT rate");
    const periodRaw = helpers.requireNumber(periodArg, "PPMT period");
    const periodsRaw = helpers.requireNumber(nperArg, "PPMT nper");
    const pv = helpers.requireNumber(pvArg, "PPMT pv");
    const fv = fvArg ? helpers.requireNumber(fvArg, "PPMT fv") : 0;
    const typeNumber = typeArg ? helpers.requireNumber(typeArg, "PPMT type") : 0;

    const period = helpers.requireInteger(periodRaw, "PPMT period must be integer");
    const periods = helpers.requireInteger(periodsRaw, "PPMT nper must be integer");
    const type = helpers.requireInteger(typeNumber, "PPMT type must be integer");

    if (periods <= 0) {
      throw new Error("PPMT nper must be greater than zero");
    }
    if (period < 1 || period > periods) {
      throw new Error("PPMT period must be between 1 and nper");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("PPMT type must be 0 or 1");
    }

    const payment = helpers.calculatePayment({ rate, periods, presentValue: pv, futureValue: fv, type });
    const interest = calculateInterest({ helpers, rate, periods, payment, pv, fv, type, period });
    return payment - interest;
  },
};
