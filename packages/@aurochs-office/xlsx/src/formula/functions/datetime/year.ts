/**
 * @file YEAR function implementation (ODF 1.3 §6.9.11).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const yearFunction: FormulaFunctionEagerDefinition = {
  name: "YEAR",
  category: "datetime",
  description: {
    en: "Returns the year component from a serial date.",
    ja: "シリアル日付から年を返します。",
  },
  examples: ['YEAR("2024-05-10")', "YEAR(A1)"],
  samples: [
    {
      input: 'YEAR("2024-05-10")',
      output: 2024,
      description: {
        en: "Extract year from date (2024)",
        ja: "日付から年を抽出（2024年）",
      },
    },
    {
      input: "YEAR(45322)",
      output: 2024,
      description: {
        en: "Year from serial (2024)",
        ja: "シリアル値から年を抽出（2024年）",
      },
    },
    {
      input: 'YEAR("2025-12-31")',
      output: 2025,
      description: {
        en: "Extract year from future date (2025)",
        ja: "未来の日付から年を抽出（2025年）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("YEAR expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "YEAR serial");
    return serialToUTCComponents(Math.floor(serial)).year;
  },
};
