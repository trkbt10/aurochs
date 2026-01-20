/**
 * @file EOMONTH function implementation (ODF 1.3 §6.9.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial, serialToDate } from "./serialDate";
import { coerceDateSerial } from "./coerceDateSerial";

export const eoMonthFunction: FormulaFunctionEagerDefinition = {
  name: "EOMONTH",
  category: "datetime",
  description: {
    en: "Returns the serial number of the last day of the month a given number of months away.",
    ja: "指定した月数だけ前後した月の月末日シリアル値を返します。",
  },
  examples: ['EOMONTH("2024-01-15", 1)', "EOMONTH(A1, 0)"],
  samples: [
    {
      input: 'EOMONTH("2024-01-15", 0)',
      output: 45322,
      description: {
        en: "Last day of current month (January 31, 2024)",
        ja: "当月の月末（2024年1月31日）",
      },
    },
    {
      input: 'EOMONTH("2024-01-15", 1)',
      output: 45351,
      description: {
        en: "Last day one month later (February 29, 2024)",
        ja: "1ヶ月後の月末（2024年2月29日）",
      },
    },
    {
      input: 'EOMONTH("2024-03-15", -1)',
      output: 45351,
      description: {
        en: "Last day one month earlier (February 29, 2024)",
        ja: "1ヶ月前の月末（2024年2月29日）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("EOMONTH expects exactly two arguments");
    }
    const baseSerial = coerceDateSerial(args[0], helpers, "EOMONTH start_date");
    const monthsRaw = helpers.requireNumber(args[1], "EOMONTH months");
    const monthsOffset = helpers.requireInteger(monthsRaw, "EOMONTH months must be integer");

    const baseDate = serialToDate(baseSerial);
    const endOfMonth = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + monthsOffset + 1, 0));
    return datePartsToSerial(endOfMonth.getUTCFullYear(), endOfMonth.getUTCMonth() + 1, endOfMonth.getUTCDate());
  },
};
