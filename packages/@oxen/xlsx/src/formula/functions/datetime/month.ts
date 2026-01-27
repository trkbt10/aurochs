/**
 * @file MONTH function implementation (ODF 1.3 §6.9.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const monthFunction: FormulaFunctionEagerDefinition = {
  name: "MONTH",
  category: "datetime",
  description: {
    en: "Returns the month number from a serial date (1–12).",
    ja: "シリアル日付から月番号(1〜12)を返します。",
  },
  examples: ['MONTH("2024-05-10")', "MONTH(A1)"],
  samples: [
    {
      input: 'MONTH("2024-05-10")',
      output: 5,
      description: {
        en: "Extract month from date (May = 5)",
        ja: "日付から月を抽出（5月 = 5）",
      },
    },
    {
      input: "MONTH(45322)",
      output: 1,
      description: {
        en: "Month from serial (January = 1)",
        ja: "シリアル値から月を抽出（1月 = 1）",
      },
    },
    {
      input: 'MONTH("2024-12-25")',
      output: 12,
      description: {
        en: "Extract month from Christmas date (December = 12)",
        ja: "クリスマスの日付から月を抽出（12月 = 12）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("MONTH expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "MONTH serial");
    return serialToUTCComponents(Math.floor(serial)).month;
  },
};
