/**
 * @file PV function implementation (ODF 1.3 §6.12.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const pvFunction: FormulaFunctionEagerDefinition = {
  name: "PV",
  category: "financial",
  description: {
    en: "Returns the present value of an investment given rate, periods, and payment details.",
    ja: "利率・期間・支払条件から投資の現在価値を計算します。",
  },
  examples: ["PV(0.05/12, 60, -200)", "PV(rate, nper, pmt, fv, type)"],
  samples: [
    {
      input: "PV(0.05/12, 60, -200)",
      output: 10598.141264785496,
      description: {
        en: "Present value of $200 monthly payments at 5% for 5 years",
        ja: "年利5%で5年間、月額200ドルの現在価値",
      },
    },
    {
      input: "PV(0.08/12, 120, -500, 10000)",
      output: 31210.74044669055,
      description: {
        en: "Present value with future value target",
        ja: "将来価値目標を含む現在価値",
      },
    },
    {
      input: "PV(0.06/12, 36, -300, 0, 1)",
      output: 9910.611396138389,
      description: {
        en: "Present value with payments at beginning of period",
        ja: "期初払いの現在価値",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("PV expects rate, nper, payment, and optional future value and type");
    }

    const [rateArg, nperArg, paymentArg, futureValueArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "PV rate");
    const periodsNumber = helpers.requireNumber(nperArg, "PV nper");
    const payment = helpers.requireNumber(paymentArg, "PV payment");
    const futureValue = futureValueArg ? helpers.requireNumber(futureValueArg, "PV future_value") : 0;
    const typeNumber = typeArg ? helpers.requireNumber(typeArg, "PV type") : 0;
    const periods = helpers.requireInteger(periodsNumber, "PV nper must be integer");
    const type = helpers.requireInteger(typeNumber, "PV type must be integer");

    if (periods <= 0) {
      throw new Error("PV nper must be greater than zero");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("PV type must be 0 or 1");
    }

    if (rate === 0) {
      return -(payment * periods + futureValue);
    }

    helpers.validateInterestRate(rate, "PV rate");
    const rateFactor = helpers.pow1p(rate, periods);
    return -((payment * (1 + rate * type) * (rateFactor - 1)) / rate + futureValue * rateFactor) / rateFactor;
  },
};
