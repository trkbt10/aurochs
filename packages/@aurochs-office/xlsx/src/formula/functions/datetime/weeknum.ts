/**
 * @file WEEKNUM function implementation (ODF 1.3 §6.9.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial, serialToDate } from "./serialDate";

const computeWeekNumber = (serial: number, returnType: number): number => {
  const date = serialToDate(Math.floor(serial));
  const year = date.getUTCFullYear();
  const startOfYearSerial = datePartsToSerial(year, 1, 1);
  const startOfYearDate = serialToDate(startOfYearSerial);

  if (returnType === 1) {
    const startWeekday = startOfYearDate.getUTCDay(); // 0 Sunday
    const startOfFirstWeek = startOfYearSerial - startWeekday;
    const week = Math.floor((Math.floor(serial) - startOfFirstWeek) / 7) + 1;
    return week <= 0 ? 1 : week;
  }

  if (returnType === 2) {
    const startWeekday = startOfYearDate.getUTCDay(); // 0 Sunday ... 6 Saturday
    const normalized = startWeekday === 0 ? 6 : startWeekday - 1; // shift to Monday start
    const startOfFirstWeek = startOfYearSerial - normalized;
    const week = Math.floor((Math.floor(serial) - startOfFirstWeek) / 7) + 1;
    return week <= 0 ? 1 : week;
  }

  throw new Error("WEEKNUM return_type must be 1 or 2");
};

export const weekNumFunction: FormulaFunctionEagerDefinition = {
  name: "WEEKNUM",
  category: "datetime",
  description: {
    en: "Returns the week number of a date using Sunday or Monday as the first day of the week.",
    ja: "週の開始曜日(日曜または月曜)を指定して日付の週番号を返します。",
  },
  examples: ['WEEKNUM("2024-01-06")', "WEEKNUM(A1, 2)"],
  samples: [
    {
      input: 'WEEKNUM("2024-01-06")',
      output: 1,
      description: {
        en: "Week number with Sunday as first day",
        ja: "日曜始まりでの週番号",
      },
    },
    {
      input: 'WEEKNUM("2024-01-15", 2)',
      output: 3,
      description: {
        en: "Week number with Monday as first day",
        ja: "月曜始まりでの週番号",
      },
    },
    {
      input: 'WEEKNUM("2024-12-31")',
      output: 53,
      description: {
        en: "Last week of the year (Sunday-based)",
        ja: "年の最終週（日曜始まり）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 1 || args.length > 2) {
      throw new Error("WEEKNUM expects one or two arguments");
    }
    const serial = helpers.requireNumber(args[0], "WEEKNUM serial");
    const resolveReturnType = (): number => {
      if (args.length !== 2) {
        return 1;
      }
      return helpers.requireInteger(
        helpers.requireNumber(args[1], "WEEKNUM return_type"),
        "WEEKNUM return_type must be integer",
      );
    };
    const returnType = resolveReturnType();
    return computeWeekNumber(serial, returnType);
  },
};
