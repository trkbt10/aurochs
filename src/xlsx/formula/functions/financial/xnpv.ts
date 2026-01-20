/**
 * @file XNPV function implementation (ODF 1.3 §6.12.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { coerceDateSerial } from "../datetime/coerceDateSerial";
import { serialToDate } from "../datetime/serialDate";

export const xnpvFunction: FormulaFunctionEagerDefinition = {
  name: "XNPV",
  category: "financial",
  description: {
    en: "Returns the net present value for irregular cash flows.",
    ja: "不規則なキャッシュフローの正味現在価値を算出します。",
  },
  examples: ["XNPV(0.1, values, dates)"],
  samples: [
    {
      input: "XNPV(0.1, {-10000, 3000, 4200, 6800}, {44562, 44652, 44743, 44926})",
      output: 2086.65,
      description: {
        en: "NPV for irregular cash flow dates",
        ja: "不規則な日付のキャッシュフローのNPV",
      },
    },
    {
      input: "XNPV(0.08, {-50000, 20000, 25000}, {45000, 45180, 45365})",
      output: -7574.47,
      description: {
        en: "NPV for investment with irregular returns",
        ja: "不規則なリターンを持つ投資のNPV",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("XNPV expects rate, values, and dates");
    }
    const [rateArg, valuesArg, datesArg] = args;
    const rate = helpers.requireNumber(rateArg, "XNPV rate");
    const values = helpers.flattenResult(valuesArg).map((value, index) => {
      if (typeof value !== "number") {
        throw new Error(`XNPV cash flow ${index + 1} must be numeric`);
      }
      return value;
    });
    const dateSerials = helpers.flattenResult(datesArg).map((value, index) => {
      return coerceDateSerial(value, helpers, `XNPV date ${index + 1}`);
    });
    if (values.length !== dateSerials.length) {
      throw new Error("XNPV values and dates must have the same length");
    }
    if (values.length === 0) {
      throw new Error("XNPV requires at least one cash flow");
    }

    const baseDate = serialToDate(dateSerials[0]);
    const baseMs = baseDate.getTime();
    const dayDifferences = dateSerials.map((serial) => {
      return (serialToDate(serial).getTime() - baseMs) / 86_400_000;
    });

    return helpers.computeXNPV(rate, values, dayDifferences);
  },
};
