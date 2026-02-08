/**
 * @file DAY function implementation (ODF 1.3 §6.9.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const dayFunction: FormulaFunctionEagerDefinition = {
  name: "DAY",
  category: "datetime",
  description: {
    en: "Returns the day of the month from a serial date.",
    ja: "シリアル日付から月内の日を返します。",
  },
  examples: ['DAY("2024-05-10")', "DAY(A1)"],
  samples: [
    {
      input: 'DAY("2024-05-10")',
      output: 10,
      description: {
        en: "Extract day from date (10)",
        ja: "日付から日を抽出（10日）",
      },
    },
    {
      input: "DAY(45322)",
      output: 31,
      description: {
        en: "Day from serial (January 31, 2024)",
        ja: "シリアル値から日を抽出（2024年1月31日）",
      },
    },
    {
      input: 'DAY("2024-12-25")',
      output: 25,
      description: {
        en: "Extract day from Christmas date (25)",
        ja: "クリスマスの日付から日を抽出（25日）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("DAY expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "DAY serial");
    return serialToUTCComponents(Math.floor(serial)).day;
  },
};
