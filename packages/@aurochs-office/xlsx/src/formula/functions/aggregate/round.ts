/**
 * @file ROUND function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { computePowerOfTen, normalizeZero, requireInteger } from "../helpers";

const roundHalfAwayFromZero = (value: number): number => {
  if (value === 0) {
    return 0;
  }
  if (value > 0) {
    return Math.floor(value + 0.5);
  }
  return Math.ceil(value - 0.5);
};

const roundToDigits = (value: number, digits: number): number => {
  if (digits === 0) {
    return roundHalfAwayFromZero(value);
  }
  if (digits > 0) {
    const factor = computePowerOfTen(digits, "ROUND digits magnitude is too large");
    return roundHalfAwayFromZero(value * factor) / factor;
  }
  const divisor = computePowerOfTen(-digits, "ROUND digits magnitude is too large");
  return roundHalfAwayFromZero(value / divisor) * divisor;
};

export const roundFunction: FormulaFunctionEagerDefinition = {
  name: "ROUND",
  category: "aggregate",
  description: {
    en: "Rounds a number to a specified number of digits using half-away-from-zero rounding.",
    ja: "数値を指定した桁数に、ゼロから離れる丸め規則で丸めます。",
  },
  examples: ["ROUND(1.235, 2)", "ROUND(A1, -1)"],
  samples: [
    {
      input: "ROUND(1.235, 2)",
      output: 1.24,
      description: {
        en: "Round to two decimal places",
        ja: "小数第2位に四捨五入",
      },
    },
    {
      input: "ROUND(15.5, 0)",
      output: 16,
      description: {
        en: "Round to nearest integer",
        ja: "最も近い整数に四捨五入",
      },
    },
    {
      input: "ROUND(1234.567, -2)",
      output: 1200,
      description: {
        en: "Round to hundreds place",
        ja: "百の位に四捨五入",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("ROUND expects exactly two arguments");
    }
    const [valueArg, digitsArg] = args;
    const value = helpers.requireNumber(valueArg, "ROUND number");
    const digits = helpers.requireNumber(digitsArg, "ROUND digits");
    const normalizedDigits = requireInteger(digits, "ROUND digits must be an integer");
    const rounded = roundToDigits(value, normalizedDigits);
    return normalizeZero(rounded);
  },
};
