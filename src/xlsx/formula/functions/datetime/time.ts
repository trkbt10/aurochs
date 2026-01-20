/**
 * @file TIME function implementation (ODF 1.3 §6.9.2).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeTimeToFraction } from "./serialDate";

export const timeFunction: FormulaFunctionEagerDefinition = {
  name: "TIME",
  category: "datetime",
  description: {
    en: "Converts hour, minute, and second arguments into a fractional-day time serial.",
    ja: "時・分・秒を1日を基準とした時間シリアル値に変換します。",
  },
  examples: ["TIME(14, 30, 0)", "TIME(A1, B1, C1)"],
  samples: [
    {
      input: "TIME(12, 0, 0)",
      output: 0.5,
      description: {
        en: "Noon as fractional day (0.5)",
        ja: "正午を日の小数値(0.5)として表現",
      },
    },
    {
      input: "TIME(14, 30, 0)",
      output: 0.6041666666666666,
      description: {
        en: "2:30 PM as fractional day",
        ja: "午後2時30分を日の小数値として表現",
      },
    },
    {
      input: "TIME(6, 15, 30)",
      output: 0.26041666666666663,
      description: {
        en: "6:15:30 AM as fractional day",
        ja: "午前6時15分30秒を日の小数値として表現",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("TIME expects exactly three arguments");
    }

    const hours = helpers.requireNumber(args[0], "TIME hour");
    const minutes = helpers.requireNumber(args[1], "TIME minute");
    const seconds = helpers.requireNumber(args[2], "TIME second");

    if (minutes < 0 || seconds < 0) {
      throw new Error("TIME arguments must not be negative");
    }

    return normalizeTimeToFraction(hours, minutes, seconds);
  },
};
