/**
 * @file TODAY function implementation (ODF 1.3 §6.9.5).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { dateTimeToSerial } from "./serialDate";

export const todayFunction: FormulaFunctionEagerDefinition = {
  name: "TODAY",
  category: "datetime",
  description: {
    en: "Returns the current date as a serial number without a time component.",
    ja: "現在の日付を時間成分なしのシリアル値で返します。",
  },
  examples: ["TODAY()"],
  samples: [
    {
      input: "TODAY()",
      output: 45307,
      description: {
        en: "Returns current date serial (example shows January 15, 2024)",
        ja: "現在の日付のシリアル値を返す（例は2024年1月15日）",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("TODAY expects no arguments");
    }
    const now = new Date();
    return Math.floor(dateTimeToSerial(now));
  },
};
