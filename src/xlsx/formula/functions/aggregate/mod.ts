/**
 * @file MOD function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

export const modFunction: FormulaFunctionEagerDefinition = {
  name: "MOD",
  category: "aggregate",
  description: {
    en: "Returns the remainder after division, aligned with the sign of the divisor.",
    ja: "除算の余りを返し、除数の符号に揃えます。",
  },
  examples: ["MOD(10, 3)", "MOD(A1, B1)"],
  samples: [
    {
      input: "MOD(10, 3)",
      output: 1,
      description: {
        en: "Remainder of positive numbers",
        ja: "正の数の剰余",
      },
    },
    {
      input: "MOD(-10, 3)",
      output: 2,
      description: {
        en: "Remainder aligned with positive divisor",
        ja: "正の除数に揃えた剰余",
      },
    },
    {
      input: "MOD(10, -3)",
      output: -2,
      description: {
        en: "Remainder aligned with negative divisor",
        ja: "負の除数に揃えた剰余",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("MOD expects exactly two arguments");
    }
    const [dividendArg, divisorArg] = args;
    const dividend = helpers.requireNumber(dividendArg, "MOD dividend");
    const divisor = helpers.requireNumber(divisorArg, "MOD divisor");

    if (!Number.isFinite(dividend) || !Number.isFinite(divisor)) {
      throw new Error("MOD expects finite numeric arguments");
    }
    if (divisor === 0) {
      throw new Error("MOD divisor must be non-zero");
    }

    const remainder = dividend % divisor;
    if (remainder === 0) {
      return 0;
    }
    if ((remainder > 0 && divisor > 0) || (remainder < 0 && divisor < 0)) {
      return normalizeZero(remainder);
    }
    const adjusted = remainder + divisor;
    return normalizeZero(adjusted);
  },
};
