/**
 * @file DATE function implementation (ODF 1.3 §6.9.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial } from "./serialDate";

export const dateFunction: FormulaFunctionEagerDefinition = {
  name: "DATE",
  category: "datetime",
  description: {
    en: "Returns the serial number for a specific date, normalising overflowed months and days.",
    ja: "月や日がオーバーフローしていても正規化した日付のシリアル値を返します。",
  },
  examples: ["DATE(2024, 1, 31)", "DATE(A1, B1, C1)"],
  samples: [
    {
      input: "DATE(2024, 1, 15)",
      output: 45307,
      description: {
        en: "Serial number for January 15, 2024",
        ja: "2024年1月15日のシリアル値",
      },
    },
    {
      input: "DATE(2024, 13, 1)",
      output: 45658,
      description: {
        en: "Overflowed month normalizes to January 1, 2025",
        ja: "オーバーフローした月が2025年1月1日に正規化",
      },
    },
    {
      input: "DATE(2024, 2, 30)",
      output: 45351,
      description: {
        en: "Overflowed day normalizes to March 1, 2024",
        ja: "オーバーフローした日が2024年3月1日に正規化",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("DATE expects exactly three arguments");
    }

    const yearNumber = helpers.requireNumber(args[0], "DATE year");
    const monthNumber = helpers.requireNumber(args[1], "DATE month");
    const dayNumber = helpers.requireNumber(args[2], "DATE day");

    const year = helpers.requireInteger(yearNumber, "DATE year must be integer");
    const month = helpers.requireInteger(monthNumber, "DATE month must be integer");
    const day = helpers.requireInteger(dayNumber, "DATE day must be integer");

    return datePartsToSerial(year, month, day);
  },
};
