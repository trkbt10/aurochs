/**
 * @file DATEVALUE function implementation (ODF 1.3 §6.9.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { parseDateText } from "./parseDateText";

export const dateValueFunction: FormulaFunctionEagerDefinition = {
  name: "DATEVALUE",
  category: "datetime",
  description: {
    en: "Converts a date string or serial into a serial number representing the date.",
    ja: "日付文字列またはシリアル値を日付シリアルに変換します。",
  },
  examples: ['DATEVALUE("2024-05-10")', "DATEVALUE(A1)"],
  samples: [
    {
      input: 'DATEVALUE("2024-05-10")',
      output: 45421,
      description: {
        en: "Convert date string to serial number",
        ja: "日付文字列をシリアル値に変換",
      },
    },
    {
      input: 'DATEVALUE("2024-12-31")',
      output: 45657,
      description: {
        en: "Convert year-end date to serial",
        ja: "年末日付をシリアル値に変換",
      },
    },
    {
      input: "DATEVALUE(45307.5)",
      output: 45307,
      description: {
        en: "Extract integer date part from serial",
        ja: "シリアル値から整数の日付部分を抽出",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("DATEVALUE expects exactly one argument");
    }
    const value = helpers.coerceScalar(args[0], "DATEVALUE input");
    if (typeof value === "number") {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      return parseDateText(value, "DATEVALUE input");
    }
    throw new Error("DATEVALUE expects a date serial or text representation");
  },
};
