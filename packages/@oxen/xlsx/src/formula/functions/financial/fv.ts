/**
 * @file FV function implementation (ODF 1.3 §6.12.2).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const fvFunction: FormulaFunctionEagerDefinition = {
  name: "FV",
  category: "financial",
  description: {
    en: "Returns the future value of an investment given rate, periods, and payments.",
    ja: "利率・期間・支払額を基に将来価値を計算します。",
  },
  examples: ["FV(0.05/12, 60, -200)", "FV(rate, nper, pmt, pv, type)"],
  samples: [
    {
      input: "FV(0.05/12, 60, -200)",
      output: 13601.216568168675,
      description: {
        en: "Future value of $200 monthly payments at 5% annual rate for 5 years",
        ja: "年利5%で5年間、月額200ドル支払った場合の将来価値",
      },
    },
    {
      input: "FV(0.06/12, 120, -100, -1000)",
      output: 18207.331414677887,
      description: {
        en: "Future value with initial investment and monthly payments",
        ja: "初期投資と月次支払いの将来価値",
      },
    },
    {
      input: "FV(0.08/12, 36, -300, 0, 1)",
      output: 12241.738438415496,
      description: {
        en: "Future value with payments at beginning of period",
        ja: "期初払いの将来価値",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("FV expects rate, nper, payment, and optional pv and type");
    }
    const [rateArg, nperArg, paymentArg, pvArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "FV rate");
    const periodsRaw = helpers.requireNumber(nperArg, "FV nper");
    const payment = helpers.requireNumber(paymentArg, "FV payment");
    const pv = pvArg ? helpers.requireNumber(pvArg, "FV pv") : 0;
    const typeValue = typeArg ? helpers.requireNumber(typeArg, "FV type") : 0;
    const periods = helpers.requireInteger(periodsRaw, "FV nper must be integer");
    const type = helpers.requireInteger(typeValue, "FV type must be integer");

    if (periods <= 0) {
      throw new Error("FV nper must be greater than zero");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("FV type must be 0 or 1");
    }

    if (rate === 0) {
      return -(pv + payment * periods);
    }

    helpers.validateInterestRate(rate, "FV rate");
    const factor = helpers.pow1p(rate, periods);
    return -(pv * factor + (payment * (1 + rate * type) * (factor - 1)) / rate);
  },
};
