/**
 * @file ROUNDDOWN function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { computePowerOfTen, normalizeZero, requireInteger } from "../helpers";

const roundDownToDigits = (value: number, digits: number): number => {
  if (value === 0) {
    return 0;
  }
  if (digits === 0) {
    return value > 0 ? Math.floor(value) : Math.ceil(value);
  }
  if (digits > 0) {
    const factor = computePowerOfTen(digits, "ROUNDDOWN digits magnitude is too large");
    const scaled = value * factor;
    const rounded = value > 0 ? Math.floor(scaled) : Math.ceil(scaled);
    return rounded / factor;
  }
  const divisor = computePowerOfTen(-digits, "ROUNDDOWN digits magnitude is too large");
  const scaled = value / divisor;
  const rounded = value > 0 ? Math.floor(scaled) : Math.ceil(scaled);
  return rounded * divisor;
};

export const roundDownFunction: FormulaFunctionEagerDefinition = {
  name: "ROUNDDOWN",
  category: "aggregate",
  description: {
    en: "Rounds a number toward zero to the specified number of digits.",
    ja: "数値をゼロ方向へ切り下げて指定桁に揃えます。",
  },
  examples: ["ROUNDDOWN(1.29, 1)", "ROUNDDOWN(A1, -1)"],
  samples: [
    {
      input: "ROUNDDOWN(1.29, 1)",
      output: 1.2,
      description: {
        en: "Round down to one decimal place",
        ja: "小数第1位へ切り下げ",
      },
    },
    {
      input: "ROUNDDOWN(3.99, 0)",
      output: 3,
      description: {
        en: "Round down to nearest integer",
        ja: "最も近い整数へ切り下げ",
      },
    },
    {
      input: "ROUNDDOWN(-2.7, 0)",
      output: -2,
      description: {
        en: "Round negative number toward zero",
        ja: "負の数をゼロ方向へ",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("ROUNDDOWN expects exactly two arguments");
    }
    const [valueArg, digitsArg] = args;
    const value = helpers.requireNumber(valueArg, "ROUNDDOWN number");
    const digits = helpers.requireNumber(digitsArg, "ROUNDDOWN digits");
    const normalizedDigits = requireInteger(digits, "ROUNDDOWN digits must be an integer");
    const rounded = roundDownToDigits(value, normalizedDigits);
    return normalizeZero(rounded);
  },
};
