/**
 * @file TIMEVALUE function implementation (ODF 1.3 §6.9.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { parseTimeText } from "./parseDateText";

export const timeValueFunction: FormulaFunctionEagerDefinition = {
  name: "TIMEVALUE",
  category: "datetime",
  description: {
    en: "Converts a time string or serial into the fractional-day time component.",
    ja: "時間文字列またはシリアル値を日内時間の小数部に変換します。",
  },
  examples: ['TIMEVALUE("12:30:00")', "TIMEVALUE(A1)"],
  samples: [
    {
      input: 'TIMEVALUE("12:30:00")',
      output: 0.5208333333333334,
      description: {
        en: "Convert time string to fractional day",
        ja: "時間文字列を日の小数値に変換",
      },
    },
    {
      input: 'TIMEVALUE("18:45:30")',
      output: 0.78125,
      description: {
        en: "Convert evening time to fractional day",
        ja: "夕方の時刻を日の小数値に変換",
      },
    },
    {
      input: "TIMEVALUE(45307.75)",
      output: 0.75,
      description: {
        en: "Extract fractional time from serial",
        ja: "シリアル値から時間の小数部を抽出",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("TIMEVALUE expects exactly one argument");
    }
    const value = helpers.coerceScalar(args[0], "TIMEVALUE input");
    if (typeof value === "number") {
      const fraction = value - Math.floor(value);
      return fraction >= 0 ? fraction : fraction + 1;
    }
    if (typeof value === "string") {
      return parseTimeText(value, "TIMEVALUE input");
    }
    throw new Error("TIMEVALUE expects a time serial or text representation");
  },
};
