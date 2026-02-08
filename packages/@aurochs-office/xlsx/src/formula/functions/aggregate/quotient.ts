/**
 * @file QUOTIENT function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

const truncateTowardZero = (value: number): number => {
  const truncated = value < 0 ? Math.ceil(value) : Math.floor(value);
  return truncated;
};

export const quotientFunction: FormulaFunctionEagerDefinition = {
  name: "QUOTIENT",
  category: "aggregate",
  description: {
    en: "Returns the integer portion of a division, truncating toward zero.",
    ja: "除算の結果をゼロ方向に切り捨てた整数部分を返します。",
  },
  examples: ["QUOTIENT(10, 3)", "QUOTIENT(A1, B1)"],
  samples: [
    {
      input: "QUOTIENT(10, 3)",
      output: 3,
      description: {
        en: "Integer quotient of positive numbers",
        ja: "正の数の整数商",
      },
    },
    {
      input: "QUOTIENT(15, 4)",
      output: 3,
      description: {
        en: "Division result truncated to integer",
        ja: "除算結果を整数に切り捨て",
      },
    },
    {
      input: "QUOTIENT(-10, 3)",
      output: -3,
      description: {
        en: "Negative division truncated toward zero",
        ja: "負の除算をゼロ方向へ切り捨て",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("QUOTIENT expects exactly two arguments");
    }
    const [dividendArg, divisorArg] = args;
    const dividend = helpers.requireNumber(dividendArg, "QUOTIENT dividend");
    const divisor = helpers.requireNumber(divisorArg, "QUOTIENT divisor");

    if (!Number.isFinite(dividend) || !Number.isFinite(divisor)) {
      throw new Error("QUOTIENT expects finite numeric arguments");
    }
    if (divisor === 0) {
      throw new Error("QUOTIENT divisor must be non-zero");
    }

    const quotient = truncateTowardZero(dividend / divisor);
    return normalizeZero(quotient);
  },
};
