/**
 * @file PMT function implementation (ODF 1.3 §6.12.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const pmtFunction: FormulaFunctionEagerDefinition = {
  name: "PMT",
  category: "financial",
  description: {
    en: "Returns the periodic payment amount for a loan or investment.",
    ja: "ローンや投資の各期支払額を計算します。",
  },
  examples: ["PMT(0.05/12, 60, 10000)", "PMT(rate, nper, pv, fv, type)"],
  samples: [
    {
      input: "PMT(0.05/12, 60, 10000)",
      output: -188.71233644010877,
      description: {
        en: "Monthly payment for $10,000 loan at 5% annual rate over 5 years",
        ja: "年利5%で5年間の10,000ドルのローンの月次支払額",
      },
    },
    {
      input: "PMT(0.08/12, 120, 50000)",
      output: -606.6379717767879,
      description: {
        en: "Monthly payment for $50,000 loan at 8% annual rate over 10 years",
        ja: "年利8%で10年間の50,000ドルのローンの月次支払額",
      },
    },
    {
      input: "PMT(0.1/12, 36, 20000, 0, 1)",
      output: -640.0103245058702,
      description: {
        en: "Monthly payment with payment at beginning of period",
        ja: "期初払いの月次支払額",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("PMT expects rate, nper, pv, and optional fv and type");
    }
    const [rateArg, nperArg, pvArg, fvArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "PMT rate");
    const periodsRaw = helpers.requireNumber(nperArg, "PMT nper");
    const pv = helpers.requireNumber(pvArg, "PMT pv");
    const fv = fvArg ? helpers.requireNumber(fvArg, "PMT fv") : 0;
    const typeValue = typeArg ? helpers.requireNumber(typeArg, "PMT type") : 0;
    const periods = helpers.requireInteger(periodsRaw, "PMT nper must be integer");
    const type = helpers.requireInteger(typeValue, "PMT type must be integer");
    return helpers.calculatePayment(rate, periods, pv, fv, type);
  },
};
