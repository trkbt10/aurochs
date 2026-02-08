/**
 * @file ROUNDUP function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { computePowerOfTen, normalizeZero, requireInteger } from "../helpers";

const roundUpToDigits = (value: number, digits: number): number => {
  if (value === 0) {
    return 0;
  }
  if (digits === 0) {
    return value > 0 ? Math.ceil(value) : Math.floor(value);
  }
  if (digits > 0) {
    const factor = computePowerOfTen(digits, "ROUNDUP digits magnitude is too large");
    const scaled = value * factor;
    const rounded = value > 0 ? Math.ceil(scaled) : Math.floor(scaled);
    return rounded / factor;
  }
  const divisor = computePowerOfTen(-digits, "ROUNDUP digits magnitude is too large");
  const scaled = value / divisor;
  const rounded = value > 0 ? Math.ceil(scaled) : Math.floor(scaled);
  return rounded * divisor;
};

export const roundUpFunction: FormulaFunctionEagerDefinition = {
  name: "ROUNDUP",
  category: "aggregate",
  description: {
    en: "Rounds a number away from zero to the specified number of digits.",
    ja: "数値をゼロから遠ざかる方向に指定桁へ切り上げます。",
  },
  examples: ["ROUNDUP(1.21, 1)", "ROUNDUP(A1, -2)"],
  samples: [
    {
      input: "ROUNDUP(1.21, 1)",
      output: 1.3,
      description: {
        en: "Round up to one decimal place",
        ja: "小数第1位へ切り上げ",
      },
    },
    {
      input: "ROUNDUP(3.14, 0)",
      output: 4,
      description: {
        en: "Round up to nearest integer",
        ja: "最も近い整数へ切り上げ",
      },
    },
    {
      input: "ROUNDUP(-2.5, 0)",
      output: -3,
      description: {
        en: "Round negative number away from zero",
        ja: "負の数をゼロから遠ざける方向へ",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("ROUNDUP expects exactly two arguments");
    }
    const [valueArg, digitsArg] = args;
    const value = helpers.requireNumber(valueArg, "ROUNDUP number");
    const digits = helpers.requireNumber(digitsArg, "ROUNDUP digits");
    const normalizedDigits = requireInteger(digits, "ROUNDUP digits must be an integer");
    const rounded = roundUpToDigits(value, normalizedDigits);
    return normalizeZero(rounded);
  },
};
