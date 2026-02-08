/**
 * @file IPMT function implementation (ODF 1.3 §6.12.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const ipmtFunction: FormulaFunctionEagerDefinition = {
  name: "IPMT",
  category: "financial",
  description: {
    en: "Returns the interest payment for a given period.",
    ja: "指定期の利息支払額を返します。",
  },
  examples: ["IPMT(0.05/12, 1, 60, 10000)", "IPMT(rate, per, nper, pv, fv, type)"],
  samples: [
    {
      input: "IPMT(0.05/12, 1, 60, 10000)",
      output: -41.666666666666664,
      description: {
        en: "Interest portion of first payment on $10,000 loan",
        ja: "10,000ドルのローンの初回支払いの利息部分",
      },
    },
    {
      input: "IPMT(0.08/12, 12, 120, 50000)",
      output: -312.60937378758314,
      description: {
        en: "Interest portion of 12th payment",
        ja: "12回目の支払いの利息部分",
      },
    },
    {
      input: "IPMT(0.06/12, 6, 36, 20000)",
      output: -87.16128444806796,
      description: {
        en: "Interest portion of 6th payment",
        ja: "6回目の支払いの利息部分",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 4 || args.length > 6) {
      throw new Error("IPMT expects rate, period, nper, pv, and optional fv and type");
    }
    const [rateArg, periodArg, nperArg, pvArg, fvArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "IPMT rate");
    const periodRaw = helpers.requireNumber(periodArg, "IPMT period");
    const periodsRaw = helpers.requireNumber(nperArg, "IPMT nper");
    const pv = helpers.requireNumber(pvArg, "IPMT pv");
    const fv = fvArg ? helpers.requireNumber(fvArg, "IPMT fv") : 0;
    const typeNumber = typeArg ? helpers.requireNumber(typeArg, "IPMT type") : 0;

    const period = helpers.requireInteger(periodRaw, "IPMT period must be integer");
    const periods = helpers.requireInteger(periodsRaw, "IPMT nper must be integer");
    const type = helpers.requireInteger(typeNumber, "IPMT type must be integer");

    if (periods <= 0) {
      throw new Error("IPMT nper must be greater than zero");
    }
    if (period < 1 || period > periods) {
      throw new Error("IPMT period must be between 1 and nper");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("IPMT type must be 0 or 1");
    }

    if (rate === 0) {
      return 0;
    }

    helpers.validateInterestRate(rate, "IPMT rate");
    const payment = helpers.calculatePayment({ rate, periods, presentValue: pv, futureValue: fv, type });
    return helpers.calculateInterestPayment({ rate, periods, payment, presentValue: pv, futureValue: fv, type, targetPeriod: period });
  },
};
