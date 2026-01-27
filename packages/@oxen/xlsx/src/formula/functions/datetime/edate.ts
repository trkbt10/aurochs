/**
 * @file EDATE function implementation (ODF 1.3 §6.9.7).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial, daysInMonth, serialToUTCComponents } from "./serialDate";
import { coerceDateSerial } from "./coerceDateSerial";

export const eDateFunction: FormulaFunctionEagerDefinition = {
  name: "EDATE",
  category: "datetime",
  description: {
    en: "Returns the serial number of the date that is the indicated number of months before or after a start date.",
    ja: "開始日から指定した月数だけ前後した日付のシリアル値を返します。",
  },
  examples: ['EDATE("2024-01-31", 1)', "EDATE(A1, -6)"],
  samples: [
    {
      input: 'EDATE("2024-01-31", 1)',
      output: 45351,
      description: {
        en: "One month after January 31, 2024 (February 29, 2024)",
        ja: "2024年1月31日の1ヶ月後（2024年2月29日）",
      },
    },
    {
      input: 'EDATE("2024-06-15", 3)',
      output: 45557,
      description: {
        en: "Three months after June 15, 2024 (September 15, 2024)",
        ja: "2024年6月15日の3ヶ月後（2024年9月15日）",
      },
    },
    {
      input: 'EDATE("2024-03-31", -1)',
      output: 45351,
      description: {
        en: "One month before March 31, 2024 (February 29, 2024)",
        ja: "2024年3月31日の1ヶ月前（2024年2月29日）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("EDATE expects exactly two arguments");
    }
    const baseSerial = coerceDateSerial(args[0], helpers, "EDATE start_date");
    const monthsRaw = helpers.requireNumber(args[1], "EDATE months");
    const monthsOffset = helpers.requireInteger(monthsRaw, "EDATE months must be integer");

    const { year: baseYear, month: baseMonth, day: baseDay } = serialToUTCComponents(baseSerial);
    const totalMonths = baseYear * 12 + (baseMonth - 1) + monthsOffset;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonthIndex = totalMonths - targetYear * 12;
    const targetMonth = targetMonthIndex + 1;
    const clampedDay = Math.min(baseDay, daysInMonth(targetYear, targetMonth));
    return datePartsToSerial(targetYear, targetMonth, clampedDay);
  },
};
