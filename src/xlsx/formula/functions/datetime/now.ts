/**
 * @file NOW function implementation (ODF 1.3 §6.9.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { dateTimeToSerial } from "./serialDate";

export const nowFunction: FormulaFunctionEagerDefinition = {
  name: "NOW",
  category: "datetime",
  description: {
    en: "Returns the current date and time as a serial number.",
    ja: "現在の日付と時刻をシリアル値で返します。",
  },
  examples: ["NOW()"],
  samples: [
    {
      input: "NOW()",
      output: 45307.604166666664,
      description: {
        en: "Returns current date and time serial (example shows January 15, 2024 at 2:30 PM)",
        ja: "現在の日付と時刻のシリアル値を返す（例は2024年1月15日午後2時30分）",
      },
    },
  ],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("NOW expects no arguments");
    }
    return dateTimeToSerial(new Date());
  },
};
